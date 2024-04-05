import { Benchmark } from './test';

// For reference, Google's Gemma model params
//                    2B       7B
// model dimension    2048     3072
// layers             18       28
// hidden dimension   32768    49152
// num heads          8        16
// num kv heads       1        16
// head size          256      256
// vocab size         256128   256128

export type Params = {
  storage_dtype: 'f32' | 'f16' | 'u8',
  compute_dtype: 'f32' | 'f16' | 'u8',
  workgroups: boolean,
  subgroups: boolean,
  swizzled: boolean,
  rows: number,
  cols: number,

  toString(): string,
}

function makeParam<P extends {
  storage_dtype: Params['storage_dtype'],
  compute_dtype: Params['compute_dtype'],
}>(p: P): Params {
  const params: Params = {
    workgroups: false,
    subgroups: false,
    swizzled: false,
    rows: 32768,
    cols: 2048,
    ...p,
  }
  return params;
}

export function generateTest(params: Params): Benchmark {
  const { compute_dtype, storage_dtype, workgroups, subgroups, swizzled, rows, cols } = params;
  let bytesPerElement = 0;
  let packed_storage_dtype: string;
  let packed_compute_dtype: string;
  let sum_dtype: string;
  let loads_per_thread: number;
  if (storage_dtype === 'f32') {
    bytesPerElement = 4;
    packed_storage_dtype = 'vec4<f32>';
    sum_dtype = 'vec4<f32>';
    loads_per_thread = 1;
  } else if (storage_dtype === 'f16') {
    bytesPerElement = 2;
    packed_storage_dtype = 'vec4<f16>';
    sum_dtype = 'vec4<f16>';
    loads_per_thread = 2;
  } else if (storage_dtype === 'u8') {
    bytesPerElement = 1;
    packed_storage_dtype = 'u32';
    sum_dtype = 'vec4<u32>';
    loads_per_thread = 4;
  } else {
    throw new Error(`Unsupported data type ${storage_dtype}`);
  }

  if (compute_dtype === 'f32') {
    packed_compute_dtype = 'vec4<f32>';
    sum_dtype = 'vec4<f32>';
  } else if (compute_dtype === 'f16') {
    packed_compute_dtype = 'vec4<f16>';
    sum_dtype = 'vec4<f16>';
  } else if (compute_dtype === 'u8') {
    packed_compute_dtype = 'u32';
    sum_dtype = 'vec4<u32>';
  } else {
    throw new Error(`Unsupported data type ${compute_dtype}`);
  }

  const wg_size = 64;

  let code = '';
  if (storage_dtype === 'f16' || compute_dtype === 'f16') {
    code += 'enable f16;\n';
  }
  code += `
struct Uniforms {
  rows : u32,
  packedCols : u32,
}
struct Matrix {
  values: array<${packed_storage_dtype}>
}
struct Vector {
  values: array<${packed_storage_dtype}>
}
@group(0) @binding(0) var<storage, read> matrix : Matrix;
@group(0) @binding(1) var<storage, read> vector : Vector;
@group(0) @binding(2) var<storage, read_write> result : Vector;
@group(0) @binding(3) var<uniform> uniforms : Uniforms;`

  let valueLoad: (n: number | string) => string; // load a packed_compute_dtype
  let loopBody: (offs?: string) => string;
  let writeResult;

  if (storage_dtype === 'u8' && compute_dtype === 'u8') {
    valueLoad = (i) => `vector.values[${i}]`;
    if (swizzled) {
      // 4 * ((32768/4 - 1) * 2048/4 + 2048/4 - 1) + 3   = 16777215
      // 32768 * 2048 / 4                                = 16777216 elements
      loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot4U8Packed(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 0u], v),
        dot4U8Packed(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 1u], v),
        dot4U8Packed(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 2u], v),
        dot4U8Packed(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 3u], v),
      );`
    } else {
      // (4 * (32768/4 - 1) + 3) * 2048/4 + (2048/4 - 1) = 16777215
      // 32768 * 2048 / 4                                = 16777216 elements
      loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot4U8Packed(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col${offs}], v),
        dot4U8Packed(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col${offs}], v),
        dot4U8Packed(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col${offs}], v),
        dot4U8Packed(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col${offs}], v),
      );`
    }
    writeResult = `result.values[global_id.x] = pack4xU8(sum);\n`;

  } else if (storage_dtype === 'u8') {
    valueLoad = (i) => `${packed_compute_dtype}(unpack4xU8(vector.values[${i}]))`;
    if (swizzled) {
      loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 0u])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 1u])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 2u])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 3u])), v),
      );`
    } else {
      loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col${offs}])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col${offs}])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col${offs}])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col${offs}])), v),
      );`
    }
    writeResult = `result.values[global_id.x] = pack4x8unorm(vec4<f32>(sum));\n`;

  } else {
    valueLoad = (i) => `vector.values[${i}]`
    if (swizzled) {
      loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 0u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 1u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 2u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 3u], v),
      );`
    } else {
      loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col${offs}], v),
        dot(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col${offs}], v),
        dot(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col${offs}], v),
        dot(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col${offs}], v),
      );`
    }
    writeResult = `result.values[global_id.x] = sum;\n`;
  }

  if (subgroups) {
    const generateSubgroupCase = (size: number) => {
      let broadcast_body = '';
      for (let i = 0; i < size; ++i) {
        broadcast_body += `
            v = subgroupBroadcast(shared_v, ${i}u);
            ${loopBody(` + ${i}u`)}`
      }

      if (workgroups) {
        return `
        if (sg_size == ${size}u) {
          for (var i = 0u; i < ${loads_per_thread * wg_size}u; i = i + ${size}u) {
            let col = base_col + i;
            let shared_v = shared_vec[i + sg_id];
            ${broadcast_body}
          }
        }`;
      } else {
        return `if (sg_size == ${size}u) {
          for (var col = 0u; col < uniforms.packedCols; col = col + ${size}u) {
            let shared_v = ${valueLoad('col + sg_id')};
            ${broadcast_body}
          }
        }`;
      }
    }
    if (workgroups) {
      code = 'enable chromium_experimental_subgroups;\n' + code + `
      var<workgroup> shared_vec : array<${packed_compute_dtype}, ${loads_per_thread * wg_size}>;
      @compute @workgroup_size(${wg_size}) fn main(
                @builtin(global_invocation_id) global_id  : vec3u,
                @builtin(local_invocation_index) lid : u32,
                @builtin(subgroup_size) sg_size : u32,
                @builtin(subgroup_invocation_id) sg_id : u32) {
          var sum : ${sum_dtype};
          var v : ${packed_compute_dtype};
          for (var base_col = 0u; base_col < uniforms.packedCols; base_col = base_col + ${loads_per_thread * wg_size}u) {
            for (var i = 0u; i < ${loads_per_thread}u; i = i + 1u) {
              shared_vec[${loads_per_thread}u * lid + i] = ${valueLoad(`base_col + ${loads_per_thread}u * lid + i`)};
            }
            workgroupBarrier();
            ${generateSubgroupCase(4)} else ${generateSubgroupCase(8)} else ${generateSubgroupCase(16)} else ${generateSubgroupCase(32)}
            workgroupBarrier();
          }
          ${writeResult}
      }`;
    } else {
      code = 'enable chromium_experimental_subgroups;\n' + code + `
      @compute @workgroup_size(${wg_size}) fn main(@builtin(global_invocation_id) global_id  : vec3u,
                                      @builtin(subgroup_size) sg_size : u32,
                                      @builtin(subgroup_invocation_id) sg_id : u32) {
          var sum : ${sum_dtype};
          var v : ${packed_compute_dtype};
          ${generateSubgroupCase(4)} else ${generateSubgroupCase(8)} else ${generateSubgroupCase(16)} else ${generateSubgroupCase(32)}
          ${writeResult}
      }`;
    }

  } else if (workgroups) {
    code = code + `
      var<workgroup> shared_vec : array<${packed_compute_dtype}, ${loads_per_thread * wg_size}>;
      @compute @workgroup_size(${wg_size}) fn main(@builtin(global_invocation_id) global_id  : vec3u,
                                           @builtin(local_invocation_index) lid : u32) {
        var sum : ${sum_dtype};
        for (var base_col = 0u; base_col < uniforms.packedCols; base_col = base_col + ${loads_per_thread * wg_size}u) {
          for (var i = 0u; i < ${loads_per_thread}u; i = i + 1u) {
            shared_vec[${loads_per_thread}u * lid + i] = ${valueLoad(`base_col + ${loads_per_thread}u * lid + i`)};
          }
          workgroupBarrier();
          for (var i = 0u; i < ${loads_per_thread * wg_size}u; i = i + 1u) {
            let col = base_col + i;
            let v : ${packed_compute_dtype} = shared_vec[i];
            ${loopBody()}
          }
          workgroupBarrier();
        }
        ${writeResult}
      }
    `
  } else {
    code = code + `
    @compute @workgroup_size(${wg_size}) fn main(@builtin(global_invocation_id) global_id  : vec3u) {
      var sum : ${sum_dtype};
      for (var col = 0u; col < uniforms.packedCols; col = col + 1u) {
        let v = ${valueLoad('col')};
        ${loopBody()}
      }
      ${writeResult}
    }`
  }

  const requiredFeatures: GPUFeatureName[] = ['timestamp-query'];
  if (storage_dtype === 'f16' || compute_dtype === 'f16') {
    requiredFeatures.push('shader-f16');
  }
  if (subgroups) {
    requiredFeatures.push('chromium-experimental-subgroups' as GPUFeatureName);
  }

  return {
    wgsl: code,
    requiredLimits: {
      maxStorageBufferBindingSize: bytesPerElement * rows * cols,
    },
    requiredFeatures,
    test(device: GPUDevice) {
      const matrix = device.createBuffer({
        usage: GPUBufferUsage.STORAGE,
        size: bytesPerElement * rows * cols,
      });

      const vector = device.createBuffer({
        usage: GPUBufferUsage.STORAGE,
        size: bytesPerElement * cols,
      });

      const result = device.createBuffer({
        usage: GPUBufferUsage.STORAGE,
        size: bytesPerElement * rows,
      });

      const shaderParams = device.createBuffer({
        usage: GPUBufferUsage.UNIFORM,
        size: 4 * 2,
        mappedAtCreation: true,
      });
      (new Uint32Array(shaderParams.getMappedRange())).set([rows, /* packed cols */ cols / 4]);
      shaderParams.unmap();

      const querySet = device.createQuerySet({
        type: 'timestamp',
        count: 2,
      });

      const timestampsResolve = device.createBuffer({
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        size: 8 * 2,
      });

      const timestampsReadback = device.createBuffer({
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        size: 8 * 2,
      });

      const module = device.createShaderModule({ code });
      const pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module },
      });
      module.getCompilationInfo().then(info => {
        if (info?.messages?.length) {
          console.log(info.messages)
        }
      });

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
          binding: 0,
          resource: { buffer: matrix },
        }, {
          binding: 1,
          resource: { buffer: vector },
        }, {
          binding: 2,
          resource: { buffer: result },
        }, {
          binding: 3,
          resource: { buffer: shaderParams },
        }]
      });

      return function trial(n: number) {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass({
          timestampWrites: {
            querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
          }
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        for (let i = 0; i < n; ++i) {
          pass.dispatchWorkgroups(rows / (wg_size * 4));
        }
        pass.end();
        encoder.resolveQuerySet(querySet, 0, 2, timestampsResolve, 0);
        encoder.copyBufferToBuffer(timestampsResolve, 0, timestampsReadback, 0, 16);
        device.queue.submit([encoder.finish()]);

        return {
          getTime: async function () {
            await timestampsReadback.mapAsync(GPUMapMode.READ);
            const timestamps = new BigUint64Array(timestampsReadback.getMappedRange());
            const duration = Number(timestamps[1] - timestamps[0]) / n;
            timestampsReadback.unmap();
            return duration;
          }
        }
      }
    }
  }
}

export async function caseGenerator(adapterOpts?: GPURequestAdapterOptions): Promise<Params[]> {
  let out: Params[] = [];
  for (const storage_dtype of ['f32', 'f16', 'u8'] as const) {
    for (const swizzled of [false, true] as const) {
      for (const workgroups of [false, true] as const) {
        for (const subgroups of [false, true] as const) {
          for (const compute_dtype of ['f32', 'f16', 'u8'] as const) {
            if (storage_dtype !== 'u8' &&
                compute_dtype !== storage_dtype) {
              continue;
            }

            out.push({
              storage_dtype,
              swizzled,
              workgroups,
              subgroups,
              compute_dtype,
              rows: 32768,
              cols: 2048,

              toString() {
                return `${this.storage_dtype}${this.swizzled ? '_swiz' : ''}${this.workgroups ? '_wg' : ''}${this.subgroups ? '_sg' : ''}_${this.compute_dtype}`
              }
            })
          }
        }
      }
    }
  }
  return out;
}
