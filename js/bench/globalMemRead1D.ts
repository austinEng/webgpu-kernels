import { Benchmark } from './test';

const kBufferSize = 1024 * 1024 * 1024 / 16;

export type Params = {
  storage_type: 'buffer' | 'texture',
  data_type: 'f32' | 'f16',
  dispatch_size: number,
  workgroup_size: number,
  read_width: 1 | 2 | 4 | 8 | 16 | number,
  access: 'blocked' | 'striped',

  toString(): string,
}

function getSize(data_type: Params['data_type']) {
 return data_type === 'f16' ? (kBufferSize / 2) : (kBufferSize / 4);
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

function elemType(params: Pick<Params, 'data_type' | 'read_width'>): string {
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

  let loop = '';

  if (params.access === 'striped') {
    loop = `
  let start = workgroup_id.x * region_size;
  for (var x = start + local_id.x; x < start + region_size; x = x + wg_size)`
  } else {
    loop = `
  let per_thread = region_size / wg_size;
  let start = workgroup_id.x * region_size + local_id.x * per_thread;
  for (var x = start; x < start + per_thread; x++)`
  }

  let code = `${enables}
${types}

@group(0) @binding(1) var<storage, read_write> result : f32;

override region_size : u32;
override wg_size : u32;`

  if (params.storage_type === 'buffer') {
    code += `
@group(0) @binding(0) var<storage, read> matrix : Matrix;

@compute @workgroup_size(wg_size) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  ${loop} {
    let v = matrix.values[x];
    if (${noop_compare}) {
      // This condition should never pass in practice based
      // on the test values we use. It's here to prevent
      // the compiler from optimizing out the loop body.
      result += 1.0;
    }
  }
}
`;
  } else {
    let tex_load = '';
    switch (params.read_width) {
      case 1:
        tex_load = `let v = ${params.data_type}(textureLoad(matrix, as_coord(x, tex_width), 0).x);`;
        break;
      case 2:
        tex_load = `let v = vec2<${params.data_type}>(textureLoad(matrix, as_coord(x, tex_width), 0).xy);`;
        break;
      case 4:
        tex_load = `let v = vec4<${params.data_type}>(textureLoad(matrix, as_coord(x, tex_width), 0));`;
        break;
      default:
        tex_load = `let v = ${elem_type}(`
        for (let i = 0; i < params.read_width / 4; i++) {
          if (i !== 0) {
            tex_load += ', '
          }
          tex_load += `vec4<${params.data_type}>(textureLoad(matrix, as_coord(${params.read_width / 4}u * x + ${i}u, tex_width), 0))`;
        }
        tex_load += ');'
        break;
    }
    code += `
@group(0) @binding(0) var matrix : Matrix;

fn as_coord(x: u32, width: u32) -> vec2<u32> {
  // emulate 32x32 tiles
  const kTileSize = 32u;
  let t = x / (kTileSize * kTileSize);
  let t_offs = x - t * kTileSize * kTileSize;
  let width_in_tiles = width / kTileSize;

  let tile_y = t / width_in_tiles;
  let tile_x = t - tile_y * width_in_tiles;

  let cy = t_offs / kTileSize;
  let cx = t_offs - cy * kTileSize;
  // let y = x / width;
  // x - y * width
  return vec2<u32>(tile_x + cx, tile_y + cy);
}

@compute @workgroup_size(wg_size) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  let tex_width = textureDimensions(matrix)[0];
  ${loop} {
    ${tex_load}
    if (${noop_compare}) {
      // This condition should never pass in practice based
      // on the test values we use. It's here to prevent
      // the compiler from optimizing out the loop body.
      result += 1.0;
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

  const size = getSize(params.data_type);

  let storageBufferSize: number | undefined;
  let textureSize: [number, number] | undefined;

  if (params.storage_type === 'buffer') {
    storageBufferSize = bytesPerLoad(params) * size / params.read_width;
    requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
    requiredLimits.maxBufferSize = storageBufferSize;
  } else {
    let width = size / params.read_width;
    let height = 1;
    while (width > height) {
      width /= 2;
      height *= 2;
    }
    if (width < height) {
      width *= 2;
      height /= 2;
    }
    textureSize = [width, height];
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
            region_size: size / params.dispatch_size / params.read_width,
            wg_size: params.workgroup_size,
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
          pass.dispatchWorkgroups(params.dispatch_size);
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
  const adapter = adapterOpts && await navigator.gpu.requestAdapter(adapterOpts);
  const adapterInfo = await adapter?.requestAdapterInfo();

  let out: Params[] = [];
  for (const storage_type of ['buffer', 'texture'] as const) {
    for (const data_type of ['f32', 'f16'] as const) {
      const size = getSize(data_type);
      for (let region: number = size; region >= 256; region /= 2) {
        for (let workgroup_size = 32; workgroup_size <= 1024; workgroup_size *= 2) {
          for (let read_width = 1; read_width <= 32 && workgroup_size * read_width <= region; read_width *= 2) {
            for (const access of ['blocked', 'striped'] as const) {
              if (access === 'blocked' && region === 1) {
                continue;
              }

              const dispatch_size = size / region;

              if (adapterInfo?.vendor === 'apple') {
                if (storage_type === 'buffer') {
                  // Small striped buffer reads perform best on Apple GPUs
                  if (access === 'blocked' || read_width > 4) {
                    continue;
                  }
                } else if (storage_type === 'texture') {
                  // Textures prefer size 32 blocked reads.
                  if (access === 'striped' || read_width != 32) {
                    continue;
                  }

                  if (data_type === 'f16') {
                    continue;
                  }
                }

                if (storage_type === 'buffer') {
                  continue;
                }

                if (data_type === 'f16' && read_width === 1) {
                  // Sub-word read is not fast.
                  continue;
                }

                if (workgroup_size < 64) {
                  // Use at least 2 simd groups.
                  continue;
                }

                if (dispatch_size * workgroup_size < 32768) {
                  // Too few threads to saturate GPU cores.
                  continue;
                }
              }

              if (dispatch_size > 65535) {
                // Exceeds WebGPU limits.
                continue;
              }
              out.push({
                storage_type,
                data_type,
                dispatch_size,
                workgroup_size,
                read_width: read_width as Params['read_width'],
                access,

                toString() {
                  const size = getSize(this.data_type);
                  const region = size / this.dispatch_size;
                  return `${this.storage_type}_${this.data_type}_size-${size}_region-${region}_dispatch-${this.dispatch_size}_wg-${this.workgroup_size}_read-${this.read_width}_${this.access}`
                }
              })
            }
          }
        }
      }
    }
  }
  return out;
}
