import { Benchmark } from './test';

export type Params = {
  data_type: 'f32' | 'f16',
  size: number,
  region: number,
  dispatch_size: number,
  workgroup_size: number,
  read_width: 1 | 2 | 4 | 8 | 16 | number,
  access: 'blocked' | 'striped',

  toString(): string,
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
      noop_compare = `all(v == ${elem_type}(123.456))`;
      break;
    default:
      noop_compare = '';
      for (let i = 0; i < params.read_width / 4; i += 1) {
        if (i != 0) {
          noop_compare += ' || ';
        }
        noop_compare += `all(v[${i}] == vec4<${params.data_type}>(123.456))`
      }
      break;
  }

  let types = `
struct Matrix {
values: array<${elem_type}>,
}`

  let loop = '';

  if (params.access === 'striped') {
    loop = `let start = workgroup_id.x * region_size;
    for (var x = start + local_id.x; x < start + region_size; x = x + wg_size)`
  } else {
    loop = `let per_thread = region_size / wg_size;
    let start = workgroup_id.x * region_size + local_id.x + per_thread;
    for (var x = start; x < start + per_thread; x++)`
  }

  let code = `${enables}
${types}

@group(0) @binding(1) var<storage, read_write> result : f32;

override region_size : u32;
override wg_size : u32;`

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

  const requiredFeatures: GPUFeatureName[] = ['timestamp-query'];
  if (params.data_type === 'f16') {
    requiredFeatures.push('shader-f16');
  }

  const requiredLimits: Record<string, number> = {};

  let storageBufferSize = bytesPerLoad(params) * params.size / params.read_width;
  requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
  requiredLimits.maxBufferSize = storageBufferSize;

  return {
    wgsl: code,
    requiredLimits,
    requiredFeatures,
    test(device: GPUDevice) {
      const buffer = device.createBuffer({
        usage: GPUBufferUsage.STORAGE,
        size: storageBufferSize!,
      });

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
            region_size: params.region / params.read_width,
            wg_size: params.workgroup_size,
          }
        },
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
          resource: { buffer }
        }, {
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

function caseGenerator(): Params[] {
  const kBufferSize = 2 * 1024 * 1024 * 1024;
  let out: Params[] = [];
  for (const data_type of ['f32', 'f16'] as const) {
    const size = data_type === 'f16' ? (kBufferSize / 2) : (kBufferSize / 4);
    for (let region: number = size; region >= 256; region /= 2) {
      for (let workgroup_size = 32; workgroup_size <= 256; workgroup_size *= 2) {
        for (let read_width = 1; read_width <= 32 && workgroup_size * read_width <= region; read_width *= 2) {
          for (const access of ['blocked', 'striped'] as const) {
            if (access === 'blocked' && region === 1) {
              continue;
            }
            const dispatch_size = size / region;
            if (dispatch_size * workgroup_size < 32768) {
              continue;
            }
            if (dispatch_size > 65535) {
              continue;
            }
            out.push({
              data_type,
              size,
              region,
              dispatch_size,
              workgroup_size,
              read_width: read_width as Params['read_width'],
              access,

              toString() {
                return `${this.data_type}_size-${this.size}_region-${this.region}_dispatch-${this.dispatch_size}_wg-${this.workgroup_size}_read-${this.read_width}_${this.access}`
              }
            })
          }
        }
      }
    }
  }
  return out;
}

export const cases = caseGenerator();
