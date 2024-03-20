import { Benchmark } from './test';

export type Params = {
  storage_type: 'buffer' | 'texture',
  data_type: 'f32' | 'f16',
  pack_type: 'scalar' | 'vec2' | 'vec4' | 'mat2x4' | 'mat4x4',
  row_access: 'blocked' | 'striped',
  col_access: 'blocked' | 'striped',
  workgroup_size: readonly [number, number],
  size: readonly [number, number],
  dispatch_size: readonly [number, number],
}

function elementsPerLoad(params: Pick<Params, 'pack_type'>) {
  let num_els: number;
  switch (params.pack_type) {
    case 'scalar':
      num_els = 1;
      break;
    case 'vec2':
      num_els = 2;
      break;
    case 'vec4':
      num_els = 4;
      break;
    case 'mat2x4':
      num_els = 8;
      break;
    case 'mat4x4':
      num_els = 16;
      break;
  }
  return num_els;
}

function widthInLoads(params: Pick<Params, 'size' | 'pack_type'>) {
  const elements_per_load = elementsPerLoad(params);
  const width_in_loads = params.size[0] / elements_per_load;
  if (width_in_loads != Math.round(width_in_loads)) {
    throw new Error(`${params.size[0]} is not divisible by ${elements_per_load}`);
  }
  return width_in_loads;
}

function bytesPerLoad(params: Pick<Params, 'pack_type' | 'data_type'>) {
  let bytes_per_el: number;
  switch (params.data_type) {
    case 'f16':
      bytes_per_el = 2;
      break;
    case 'f32':
      bytes_per_el = 4;
      break;
  }
  return elementsPerLoad(params) * bytes_per_el;
}

export function generateTest(params: Params): Benchmark {
  let enables = '';
  if (params.data_type === 'f16') {
    enables += 'enable f16;\n'
  }

  const elem_type = params.pack_type === 'scalar'
    ? params.data_type
    : `${params.pack_type}<${params.data_type}>`;

  let noop_compare = '';
  if (params.storage_type === 'texture') {
    noop_compare = 'all(v == vec4f(123.456))';
  } else {
    switch (params.pack_type) {
      case 'scalar':
      case 'vec2':
      case 'vec4':
        noop_compare = `all(v == ${elem_type}(123.456))`;
        break;
      case 'mat2x4':
        noop_compare = `all(v[0] == vec4<${params.data_type}>(123.456)) && all(v[1] == vec4<${params.data_type}>(123.456))`;
        break;
      case 'mat4x4':
        noop_compare = `all(v[0] == vec4<${params.data_type}>(123.456)) && all(v[1] == vec4<${params.data_type}>(123.456)) && all(v[2] == vec4<${params.data_type}>(123.456)) && all(v[3] == vec4<${params.data_type}>(123.456))`;
        break;
    }
  }
  let types = '';
  let texture_dtype;
  if (params.storage_type === 'buffer') {
    types += `
struct Matrix {
  values: array<${elem_type}>,
}`
  } else {
    texture_dtype = params.data_type === 'f16' ? 'f32' : params.data_type;
types += `
alias Matrix = texture_2d<${texture_dtype}>;`
  }

  let y_loop = '';
  let x_loop = '';

  if (params.col_access === 'striped') {
    x_loop = 'for (var x = global_id.x; x < uniforms.width; x = x + wg_size_x)'
  } else {
    x_loop = `let x_per_thread = uniforms.width / wg_size_x;
    let x_start = global_id.x * x_per_thread;
    for (var x = x_start; x < x_start + x_per_thread; x++)`
  }

  if (params.row_access === 'striped') {
    y_loop = `let y_per_group = uniforms.height / dispatch_size_y;
  for (var y = workgroup_id.y * y_per_group; y < (workgroup_id.y + 1u) * y_per_group; y = y + wg_size_y)`
  } else {
    y_loop = `let y_per_group = uniforms.height / dispatch_size_y;
  let y_start = workgroup_id.y * y_per_group + local_id.y;
  for (var y = y_start; y < y_start + y_per_group; y++)`
  }


  let code = `${enables}
struct Uniforms {
  width : u32,
  height : u32,
}
${types}

@group(0) @binding(1) var<storage, read_write> result : f32;
@group(0) @binding(3) var<uniform> uniforms : Uniforms;

override wg_size_x : u32;
override wg_size_y : u32;
override dispatch_size_y : u32;`

  if (params.storage_type === 'buffer') {
    code += `
@group(0) @binding(0) var<storage, read> matrix : Matrix;

@compute @workgroup_size(wg_size_x, wg_size_y) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  ${y_loop} {
    ${x_loop} {
      let v = matrix.values[y * uniforms.width + x];
      if (${noop_compare}) {
        // This condition should never pass in practice based
        // on the test values we use. It's here to prevent
        // the compiler from optimizing out the loop body.
        result += 1.0;
      }
    }
  }
}
`;
  } else {
    code += `
@group(0) @binding(0) var matrix : Matrix;

@compute @workgroup_size(wg_size_x, wg_size_y) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  var acc : vec4<${texture_dtype}>;
  ${y_loop} {
    ${x_loop} {
      let v = textureLoad(matrix, vec2<u32>(x, y), 0);
      if (${noop_compare}) {
        // This condition should never pass in practice based
        // on the test values we use. It's here to prevent
        // the compiler from optimizing out the loop body.
        result += 1.0;
      }
    }
  }
}
`;
  }

  const requiredFeatures: GPUFeatureName[] = ['timestamp-query'];
  if (params.data_type === 'f16') {
    requiredFeatures.push('shader-f16');
  }

  const requiredLimits: Record<string, number> = {};

  let storageBufferSize: number | undefined;

  let textureSize: [number, number] | undefined;

  if (params.storage_type === 'buffer') {
    storageBufferSize = bytesPerLoad(params) * widthInLoads(params) * params.size[1];
    requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
    requiredLimits.maxBufferSize = storageBufferSize;
  } else {
    textureSize = [
      widthInLoads(params),
      params.size[1],
    ];
    requiredLimits.maxTextureDimension2D = Math.max(textureSize[0], textureSize[1]);
  }

  return {
    wgsl: code,
    requiredLimits,
    requiredFeatures,
    test(device: GPUDevice) {
      let buffer: GPUBuffer | undefined;
      let texture: GPUTexture | undefined;
      if (params.storage_type === 'buffer') {
        buffer = device.createBuffer({
          usage: GPUBufferUsage.STORAGE,
          size: storageBufferSize!,
        });
      } else {
        const size = textureSize!;
        switch (params.data_type) {
          case 'f16':
            switch (params.pack_type) {
              case 'scalar':
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'r16float'
                });
                break;
              case 'vec2':
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rg16float'
                });
                break;
              case 'vec4':
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rgba16float'
                });
                break;
            }
            break;
          case 'f32':
            switch (params.pack_type) {
              case 'scalar':
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'r32float'
                });
                break;
              case 'vec2':
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rg32float'
                });
                break;
              case 'vec4':
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rgba32float'
                });
                break;
            }
            break;
        }
      }

      const uniforms = device.createBuffer({
        usage: GPUBufferUsage.UNIFORM,
        size: 4 * 2,
        mappedAtCreation: true,
      });
      (new Uint32Array(uniforms.getMappedRange())).set([
        widthInLoads(params),
        params.size[1],
      ]);
      uniforms.unmap();

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
        compute: {
          module,
          constants: {
            wg_size_x: params.workgroup_size[0],
            wg_size_y: params.workgroup_size[1],
            dispatch_size_y: params.dispatch_size[1],
          }
        },
      });
      module.getCompilationInfo().then(info => {
        if (info?.messages?.length) {
          console.log(info.messages)
        }
      });

      let matrixEntry: GPUBindGroupEntry;
      if (buffer) {
        matrixEntry = {
          binding: 0,
          resource: { buffer }
        };
      } else {
        matrixEntry = {
          binding: 0,
          resource: texture!.createView()
        }
      }

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [matrixEntry, {
          binding: 1,
          resource: {
            buffer: device.createBuffer({
              usage: GPUBufferUsage.STORAGE,
              size: 4,
            })
          }
        }, {
          binding: 3,
          resource: { buffer: uniforms },
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
          pass.dispatchWorkgroups(params.dispatch_size[0], params.dispatch_size[1]);
        }
        pass.end();
        encoder.resolveQuerySet(querySet, 0, 2, timestampsResolve, 0);
        encoder.copyBufferToBuffer(timestampsResolve, 0, timestampsReadback, 0, 16);
        device.queue.submit([encoder.finish()]);

        return {
          getTime: async function() {
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

function caseGenerator(): Record<string, Params> {
  const sizeA = 32768;
  const sizeB = 2048;
  let out: Record<string, Params> = {};
  for (const storage_type of ['buffer', 'texture'] as const) {
    for (const pack_type of ['scalar', 'vec2', 'vec4', 'mat2x4', 'mat4x4'] as const) {
      if (pack_type === 'mat2x4' || pack_type === 'mat4x4') {
        if (storage_type === 'texture') {
          continue;
        }
      }
      for (const data_type of ['f32', 'f16'] as const) {
        for (const row_access of ['blocked', 'striped'] as const) {
          for (const col_access of ['blocked', 'striped'] as const) {
            for (const size of [
              [data_type === 'f16' ? sizeA * 2 : sizeA, sizeB],
              [data_type === 'f16' ? sizeB * 2 : sizeB, sizeA],
            ] as const) {
              for (const workgroup_size of [
                [256, 1],
                [128, 2],
                [64, 4],
                [32, 8],
                [16, 16],

                [128, 1],
                [64, 2],
                [32, 4],
                [16, 8],

                [64, 1],
                [32, 2],
                [16, 4],
                [8, 8],
              ] as const) {
                const dispatch_size = [1, size[1] / workgroup_size[1]] as const;

                if (workgroup_size[1] === 1 && row_access === 'blocked') {
                  // No difference between this and striped.
                  continue;
                }

                out[`${storage_type}_${pack_type}_${data_type}_row-${row_access}_col-${col_access}_${size}_${workgroup_size}_${dispatch_size}`] = {
                  storage_type,
                  data_type,
                  pack_type,
                  row_access,
                  col_access,
                  size,
                  workgroup_size,
                  dispatch_size,
                }
              }
            }
          }
        }
      }
    }
  }
  return out;
}

export const cases: Record<string, Params> = caseGenerator();
