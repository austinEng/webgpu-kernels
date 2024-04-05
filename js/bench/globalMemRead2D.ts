import { Benchmark } from './test';

const BASE_WIDTH = 4096;
const BASE_HEIGHT = 4096;

export type Params = {
  storage_type: 'buffer' | 'texture',
  data_type: 'f32' | 'f16',
  dispatch_size: readonly [number, number],
  workgroup_size: readonly [number, number],
  read_width: 1 | 2 | 4 | 8 | 16 | number,
  row_access: 'blocked' | 'striped',
  col_access: 'blocked' | 'striped',

  toString(): string,
}

function getSize(data_type: Params['data_type']) {
  return data_type === 'f16' ? [2 * BASE_WIDTH, BASE_HEIGHT] as const : [BASE_WIDTH, BASE_HEIGHT] as const;
}

function bytesPerLoad(params: Pick<Params, 'read_width' | 'data_type'>) {
  let bytes_per_el: number;
  switch (params.data_type) {
    case 'f16':
      bytes_per_el = 2;
      break;
    case 'f32':
      bytes_per_el = 4;
      break;
  }
  return params.read_width * bytes_per_el;
}

function elemType(params: Pick<Params, 'data_type' | 'read_width'>) : string {
  switch (params.read_width) {
    case 1:
      return params.data_type;
    case 2:
      return `vec2<${params.data_type}>`;
    case 4:
      return `vec4<${params.data_type}>`;
    case 8:
      return `mat2x4<${params.data_type}>`;
    case 16:
      return `mat4x4<${params.data_type}>`;
    default:
      return `array<vec4<${params.data_type}>, ${params.read_width / 4}u>`;
  }
}

export function generateTest(params: Params): Benchmark {
  let enables = '';
  if (params.data_type === 'f16') {
    enables += 'enable f16;\n'
  }

  const elem_type = elemType(params);

  let noop_compare = '';
  switch (params.read_width) {
    case 1:
    case 2:
    case 4:
      noop_compare = `any(v == ${elem_type}(123.456))`;
      break;
    default:
      noop_compare = '';
      for (let i = 0; i < params.read_width / 4; i += 1) {
        if (i != 0) {
          noop_compare += ' || ';
        }
        noop_compare += `any(v[${i}] == vec4<${params.data_type}>(123.456))`
      }
      break;
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


  if (params.row_access === 'striped') {
    y_loop = `
  let y_start = workgroup_id.y * region_size_y;
  for (var y = y_start + local_id.y; y < y_start + region_size_y; y = y + wg_size_y)`
  } else {
    y_loop = `
  let y_per_thread = region_size_y / wg_size_y;
  let y_start = workgroup_id.y * region_size_y + local_id.y * y_per_thread;
  for (var y = y_start; y < y_start + y_per_thread; y++)`
  }

  if (params.col_access === 'striped') {
    x_loop = `
    let x_start = workgroup_id.x * region_size_x;
    for (var x = x_start + local_id.x; x < x_start + region_size_x; x = x + wg_size_x)`
  } else {
    x_loop = `
    let x_per_thread = region_size_x / wg_size_x;
    let x_start = workgroup_id.x * region_size_x + local_id.x * x_per_thread;
    for (var x = x_start; x < x_start + x_per_thread; x++)`
  }

  let code = `${enables}
struct Uniforms {
  width : u32,
  height : u32,
}
${types}

@group(0) @binding(1) var<storage, read_write> result : f32;
@group(0) @binding(3) var<uniform> uniforms : Uniforms;

override region_size_x : u32;
override region_size_y : u32;
override wg_size_x : u32;
override wg_size_y : u32;`

  if (params.storage_type === 'buffer') {
    code += `
@group(0) @binding(0) var<storage, read> matrix : Matrix;

@compute @workgroup_size(wg_size_x, wg_size_y) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  ${y_loop} { ${x_loop} {
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
    let tex_load = '';
    switch (params.read_width) {
      case 1:
        tex_load = `let v = ${params.data_type}(textureLoad(matrix, vec2<u32>(x, y), 0).x);`;
        break;
      case 2:
        tex_load = `let v = vec2<${params.data_type}>(textureLoad(matrix, vec2<u32>(x, y), 0).xy);`;
        break;
      case 4:
        tex_load = `let v = vec4<${params.data_type}>(textureLoad(matrix, vec2<u32>(x, y), 0));`;
        break;
      default:
        tex_load = `let v = ${elem_type}(`
        for (let i = 0; i < params.read_width / 4; i++) {
          if (i !== 0) {
            tex_load += ', '
          }
          tex_load += `vec4<${params.data_type}>(textureLoad(matrix, vec2<u32>(${params.read_width / 4}u * x + ${i}u, y), 0))`;
        }
        tex_load += ');'
        break;
    }
    code += `
@group(0) @binding(0) var matrix : Matrix;

@compute @workgroup_size(wg_size_x, wg_size_y) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  _ = &uniforms;
  var acc : vec4<${texture_dtype}>;
  ${y_loop} {
    ${x_loop} {
      ${tex_load}
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

  const size = getSize(params.data_type);

  if (params.storage_type === 'buffer') {
    storageBufferSize = bytesPerLoad(params) * size[0] * size[1] / params.read_width;
    requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
    requiredLimits.maxBufferSize = storageBufferSize;
  } else {
    textureSize = [
      size[0] / params.read_width,
      size[1],
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
            switch (params.read_width) {
              case 1:
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'r16float'
                });
                break;
              case 2:
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rg16float'
                });
                break;
              default:
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rgba16float'
                });
                break;
            }
            break;
          case 'f32':
            switch (params.read_width) {
              case 1:
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'r32float'
                });
                break;
              case 2:
                texture = device.createTexture({
                  usage: GPUTextureUsage.TEXTURE_BINDING,
                  size,
                  format: 'rg32float'
                });
                break;
              default:
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
        size[0] / params.read_width,
        size[1],
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
            region_size_x: size[0] / params.dispatch_size[0] / params.read_width,
            region_size_y: size[1] / params.dispatch_size[1],
            wg_size_x: params.workgroup_size[0],
            wg_size_y: params.workgroup_size[1],
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

export async function caseGenerator(adapterOpts?: GPURequestAdapterOptions): Promise<Params[]> {
  const adapter = adapterOpts && await navigator.gpu.requestAdapter(adapterOpts);
  const adapterInfo = await adapter?.requestAdapterInfo();

  let out: Params[] = [];
  for (const storage_type of ['buffer', 'texture'] as const) {
    for (const data_type of ['f32', 'f16'] as const) {
      const size = getSize(data_type);
      for (let region_height = 1; region_height <= size[1]; region_height *= 2) {
        // if (storage_type === 'buffer' && region_height !== 1) {
        //   continue;
        // }
        for (let region_width: number = size[0]; region_width >= 256; region_width /= 2) {
          const region = [region_width, region_height] as const;
          const dispatch_size = [
            Math.ceil(size[0] / region[0]),
            Math.ceil(size[1] / region[1]),
          ] as const;

          for (let workgroup_y = 1; workgroup_y <= 1024 && workgroup_y <= region_height; workgroup_y *= 2) {
            for (let workgroup_x = 1; workgroup_x <= 1024; workgroup_x *= 2) {
              if (workgroup_x * workgroup_y > 1024 || workgroup_x * workgroup_y < 32) {
                continue;
              }

              const workgroup_size = [workgroup_x, workgroup_y] as const;

              for (let read_width = 1; read_width <= 32 && workgroup_x * read_width <= region_width; read_width *= 2) {
                for (const row_access of ['blocked', 'striped'] as const) {
                  if (row_access === 'blocked' && region_height === 1) {
                    continue;
                  }
                  for (const col_access of ['blocked', 'striped'] as const) {
                    if (col_access === 'blocked' && region_width === 1) {
                      continue;
                    }

                    if (adapterInfo?.vendor === 'apple') {

                      if (storage_type === 'buffer') {
                        // Small striped buffer reads perform best on Apple GPUs
                        if (col_access === 'blocked' || read_width > 4) {
                          continue;
                        }
                      } else if (storage_type === 'texture') {
                        // Textures prefer larger blocked reads.
                        if (col_access === 'striped' || read_width < 16)  {
                          continue;
                        }

                        if (region_height > 32) {
                          continue;
                        }

                        if (workgroup_y < 4) {
                          continue;
                        }

                        if (data_type === 'f16') {
                          continue;
                        }
                      }


                      if (storage_type === 'buffer') {
                        continue;
                      }

                      if (region_width !== size[0]) {
                        continue;
                      }

                      if (data_type === 'f16' && read_width === 1) {
                        // Sub-word read is not fast.
                        continue;
                      }

                      if (workgroup_size[0] * workgroup_size[1] < 64) {
                        // Use at least 2 simd groups.
                        continue;
                      }

                      if (dispatch_size[0] * dispatch_size[1] * workgroup_size[0] * workgroup_size[1] < 32768) {
                        // Too few threads to saturate GPU cores.
                        continue;
                      }
                    }

                    out.push({
                      storage_type,
                      data_type,
                      dispatch_size,
                      workgroup_size,
                      read_width: read_width as Params['read_width'],
                      row_access,
                      col_access,

                      toString() {
                        const size = getSize(this.data_type);
                        const region = [size[0] / this.dispatch_size[0], size[1] / this.dispatch_size[1]]
                        return `${this.storage_type}_${this.data_type}_size-${size}_region-${region}_dispatch-${this.dispatch_size}_wg-${this.workgroup_size}_read-${this.read_width}_row-${this.row_access}_col-${this.col_access}`
                      }
                    })
                  }
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
