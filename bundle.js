const BASE_WIDTH = 4096;
const BASE_HEIGHT = 4096;
function getSize$1(data_type) {
    return data_type === 'f16' ? [2 * BASE_WIDTH, BASE_HEIGHT] : [BASE_WIDTH, BASE_HEIGHT];
}
function bytesPerLoad$1(params) {
    let bytes_per_el;
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
function elemType$1(params) {
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
function generateTest$2(params) {
    let enables = '';
    if (params.data_type === 'f16') {
        enables += 'enable f16;\n';
    }
    const elem_type = elemType$1(params);
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
                noop_compare += `any(v[${i}] == vec4<${params.data_type}>(123.456))`;
            }
            break;
    }
    let types = '';
    let texture_dtype;
    if (params.storage_type === 'buffer') {
        types += `
struct Matrix {
  values: array<${elem_type}>,
}`;
    }
    else {
        texture_dtype = params.data_type === 'f16' ? 'f32' : params.data_type;
        types += `
alias Matrix = texture_2d<${texture_dtype}>;`;
    }
    let y_loop = '';
    let x_loop = '';
    if (params.row_access === 'striped') {
        y_loop = `
  let y_start = workgroup_id.y * region_size_y;
  for (var y = y_start + local_id.y; y < y_start + region_size_y; y = y + wg_size_y)`;
    }
    else {
        y_loop = `
  let y_per_thread = region_size_y / wg_size_y;
  let y_start = workgroup_id.y * region_size_y + local_id.y * y_per_thread;
  for (var y = y_start; y < y_start + y_per_thread; y++)`;
    }
    if (params.col_access === 'striped') {
        x_loop = `
    let x_start = workgroup_id.x * region_size_x;
    for (var x = x_start + local_id.x; x < x_start + region_size_x; x = x + wg_size_x)`;
    }
    else {
        x_loop = `
    let x_per_thread = region_size_x / wg_size_x;
    let x_start = workgroup_id.x * region_size_x + local_id.x * x_per_thread;
    for (var x = x_start; x < x_start + x_per_thread; x++)`;
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
override wg_size_y : u32;`;
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
    }
    else {
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
                tex_load = `let v = ${elem_type}(`;
                for (let i = 0; i < params.read_width / 4; i++) {
                    if (i !== 0) {
                        tex_load += ', ';
                    }
                    tex_load += `vec4<${params.data_type}>(textureLoad(matrix, vec2<u32>(${params.read_width / 4}u * x + ${i}u, y), 0))`;
                }
                tex_load += ');';
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
    const requiredFeatures = ['timestamp-query'];
    if (params.data_type === 'f16') {
        requiredFeatures.push('shader-f16');
    }
    const requiredLimits = {};
    let storageBufferSize;
    let textureSize;
    const size = getSize$1(params.data_type);
    if (params.storage_type === 'buffer') {
        storageBufferSize = bytesPerLoad$1(params) * size[0] * size[1] / params.read_width;
        requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
        requiredLimits.maxBufferSize = storageBufferSize;
    }
    else {
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
        test(device) {
            let buffer;
            let texture;
            if (params.storage_type === 'buffer') {
                buffer = device.createBuffer({
                    usage: GPUBufferUsage.STORAGE,
                    size: storageBufferSize,
                });
            }
            else {
                const size = textureSize;
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
                    console.log(info.messages);
                }
            });
            let matrixEntry;
            if (buffer) {
                matrixEntry = {
                    binding: 0,
                    resource: { buffer }
                };
            }
            else {
                matrixEntry = {
                    binding: 0,
                    resource: texture.createView()
                };
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
            return function trial(n) {
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
                    getTime: async function () {
                        await timestampsReadback.mapAsync(GPUMapMode.READ);
                        const timestamps = new BigUint64Array(timestampsReadback.getMappedRange());
                        const duration = Number(timestamps[1] - timestamps[0]) / n;
                        timestampsReadback.unmap();
                        return duration;
                    }
                };
            };
        }
    };
}
async function caseGenerator$2(adapterOpts) {
    const adapter = adapterOpts && await navigator.gpu.requestAdapter(adapterOpts);
    const adapterInfo = await adapter?.requestAdapterInfo();
    let out = [];
    for (const storage_type of ['buffer', 'texture']) {
        for (const data_type of ['f32', 'f16']) {
            const size = getSize$1(data_type);
            for (let region_height = 1; region_height <= size[1]; region_height *= 2) {
                // if (storage_type === 'buffer' && region_height !== 1) {
                //   continue;
                // }
                for (let region_width = size[0]; region_width >= 256; region_width /= 2) {
                    const region = [region_width, region_height];
                    const dispatch_size = [
                        Math.ceil(size[0] / region[0]),
                        Math.ceil(size[1] / region[1]),
                    ];
                    for (let workgroup_y = 1; workgroup_y <= 1024 && workgroup_y <= region_height; workgroup_y *= 2) {
                        for (let workgroup_x = 1; workgroup_x <= 1024; workgroup_x *= 2) {
                            if (workgroup_x * workgroup_y > 1024 || workgroup_x * workgroup_y < 32) {
                                continue;
                            }
                            const workgroup_size = [workgroup_x, workgroup_y];
                            for (let read_width = 1; read_width <= 32 && workgroup_x * read_width <= region_width; read_width *= 2) {
                                for (const row_access of ['blocked', 'striped']) {
                                    if (row_access === 'blocked' && region_height === 1) {
                                        continue;
                                    }
                                    for (const col_access of ['blocked', 'striped']) {
                                        if (col_access === 'blocked' && region_width === 1) {
                                            continue;
                                        }
                                        if (adapterInfo?.vendor === 'apple') {
                                            if (storage_type === 'buffer') {
                                                // Small striped buffer reads perform best on Apple GPUs
                                                if (col_access === 'blocked' || read_width > 4) {
                                                    continue;
                                                }
                                            }
                                            else if (storage_type === 'texture') {
                                                // Textures prefer larger blocked reads.
                                                if (col_access === 'striped' || read_width < 16) {
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
                                            read_width: read_width,
                                            row_access,
                                            col_access,
                                            toString() {
                                                const size = getSize$1(this.data_type);
                                                const region = [size[0] / this.dispatch_size[0], size[1] / this.dispatch_size[1]];
                                                return `${this.storage_type}_${this.data_type}_size-${size}_region-${region}_dispatch-${this.dispatch_size}_wg-${this.workgroup_size}_read-${this.read_width}_row-${this.row_access}_col-${this.col_access}`;
                                            }
                                        });
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

var globalMemRead2D = /*#__PURE__*/Object.freeze({
  __proto__: null,
  caseGenerator: caseGenerator$2,
  generateTest: generateTest$2
});

const kBufferSize = 1024 * 1024 * 1024 / 16;
function getSize(data_type) {
    return data_type === 'f16' ? (kBufferSize / 2) : (kBufferSize / 4);
}
function bytesPerLoad(params) {
    let bytes_per_el;
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
function elemType(params) {
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
function generateTest$1(params) {
    let enables = '';
    if (params.data_type === 'f16') {
        enables += 'enable f16;\n';
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
                noop_compare += `any(v[${i}] == vec4<${params.data_type}>(123.456))`;
            }
            break;
    }
    let types = '';
    let texture_dtype;
    if (params.storage_type === 'buffer') {
        types += `
struct Matrix {
  values: array<${elem_type}>,
}`;
    }
    else {
        texture_dtype = params.data_type === 'f16' ? 'f32' : params.data_type;
        types += `
alias Matrix = texture_2d<${texture_dtype}>;`;
    }
    let loop = '';
    if (params.access === 'striped') {
        loop = `
  let start = workgroup_id.x * region_size;
  for (var x = start + local_id.x; x < start + region_size; x = x + wg_size)`;
    }
    else {
        loop = `
  let per_thread = region_size / wg_size;
  let start = workgroup_id.x * region_size + local_id.x * per_thread;
  for (var x = start; x < start + per_thread; x++)`;
    }
    let code = `${enables}
${types}

@group(0) @binding(1) var<storage, read_write> result : f32;

override region_size : u32;
override wg_size : u32;`;
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
    }
    else {
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
                tex_load = `let v = ${elem_type}(`;
                for (let i = 0; i < params.read_width / 4; i++) {
                    if (i !== 0) {
                        tex_load += ', ';
                    }
                    tex_load += `vec4<${params.data_type}>(textureLoad(matrix, as_coord(${params.read_width / 4}u * x + ${i}u, tex_width), 0))`;
                }
                tex_load += ');';
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
    const requiredFeatures = ['timestamp-query'];
    if (params.data_type === 'f16') {
        requiredFeatures.push('shader-f16');
    }
    const requiredLimits = {};
    const size = getSize(params.data_type);
    let storageBufferSize;
    let textureSize;
    if (params.storage_type === 'buffer') {
        storageBufferSize = bytesPerLoad(params) * size / params.read_width;
        requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
        requiredLimits.maxBufferSize = storageBufferSize;
    }
    else {
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
        test(device) {
            let buffer;
            let texture;
            if (params.storage_type === 'buffer') {
                buffer = device.createBuffer({
                    usage: GPUBufferUsage.STORAGE,
                    size: storageBufferSize,
                });
            }
            else {
                const size = textureSize;
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
                    console.log(info.messages);
                }
            });
            let matrixEntry;
            if (buffer) {
                matrixEntry = {
                    binding: 0,
                    resource: { buffer }
                };
            }
            else {
                matrixEntry = {
                    binding: 0,
                    resource: texture.createView()
                };
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
            return function trial(n) {
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
                };
            };
        }
    };
}
async function caseGenerator$1(adapterOpts) {
    const adapter = adapterOpts && await navigator.gpu.requestAdapter(adapterOpts);
    const adapterInfo = await adapter?.requestAdapterInfo();
    let out = [];
    for (const storage_type of ['buffer', 'texture']) {
        for (const data_type of ['f32', 'f16']) {
            const size = getSize(data_type);
            for (let region = size; region >= 256; region /= 2) {
                for (let workgroup_size = 32; workgroup_size <= 1024; workgroup_size *= 2) {
                    for (let read_width = 1; read_width <= 32 && workgroup_size * read_width <= region; read_width *= 2) {
                        for (const access of ['blocked', 'striped']) {
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
                                }
                                else if (storage_type === 'texture') {
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
                                read_width: read_width,
                                access,
                                toString() {
                                    const size = getSize(this.data_type);
                                    const region = size / this.dispatch_size;
                                    return `${this.storage_type}_${this.data_type}_size-${size}_region-${region}_dispatch-${this.dispatch_size}_wg-${this.workgroup_size}_read-${this.read_width}_${this.access}`;
                                }
                            });
                        }
                    }
                }
            }
        }
    }
    return out;
}

var globalMemRead1D = /*#__PURE__*/Object.freeze({
  __proto__: null,
  caseGenerator: caseGenerator$1,
  generateTest: generateTest$1
});

function generateTest(params) {
    const { compute_dtype, storage_dtype, workgroups, subgroups, swizzled, rows, cols } = params;
    let bytesPerElement = 0;
    let packed_storage_dtype;
    let packed_compute_dtype;
    let sum_dtype;
    let loads_per_thread;
    if (storage_dtype === 'f32') {
        bytesPerElement = 4;
        packed_storage_dtype = 'vec4<f32>';
        sum_dtype = 'vec4<f32>';
        loads_per_thread = 1;
    }
    else if (storage_dtype === 'f16') {
        bytesPerElement = 2;
        packed_storage_dtype = 'vec4<f16>';
        sum_dtype = 'vec4<f16>';
        loads_per_thread = 2;
    }
    else if (storage_dtype === 'u8') {
        bytesPerElement = 1;
        packed_storage_dtype = 'u32';
        sum_dtype = 'vec4<u32>';
        loads_per_thread = 4;
    }
    else {
        throw new Error(`Unsupported data type ${storage_dtype}`);
    }
    if (compute_dtype === 'f32') {
        packed_compute_dtype = 'vec4<f32>';
        sum_dtype = 'vec4<f32>';
    }
    else if (compute_dtype === 'f16') {
        packed_compute_dtype = 'vec4<f16>';
        sum_dtype = 'vec4<f16>';
    }
    else if (compute_dtype === 'u8') {
        packed_compute_dtype = 'u32';
        sum_dtype = 'vec4<u32>';
    }
    else {
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
@group(0) @binding(3) var<uniform> uniforms : Uniforms;`;
    let valueLoad; // load a packed_compute_dtype
    let loopBody;
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
      );`;
        }
        else {
            // (4 * (32768/4 - 1) + 3) * 2048/4 + (2048/4 - 1) = 16777215
            // 32768 * 2048 / 4                                = 16777216 elements
            loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot4U8Packed(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col${offs}], v),
        dot4U8Packed(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col${offs}], v),
        dot4U8Packed(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col${offs}], v),
        dot4U8Packed(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col${offs}], v),
      );`;
        }
        writeResult = `result.values[global_id.x] = pack4xU8(sum);\n`;
    }
    else if (storage_dtype === 'u8') {
        valueLoad = (i) => `${packed_compute_dtype}(unpack4xU8(vector.values[${i}]))`;
        if (swizzled) {
            loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 0u])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 1u])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 2u])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 3u])), v),
      );`;
        }
        else {
            loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col${offs}])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col${offs}])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col${offs}])), v),
        dot(vec4<${compute_dtype}>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col${offs}])), v),
      );`;
        }
        writeResult = `result.values[global_id.x] = pack4x8unorm(vec4<f32>(sum));\n`;
    }
    else {
        valueLoad = (i) => `vector.values[${i}]`;
        if (swizzled) {
            loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 0u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 1u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 2u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col${offs}) + 3u], v),
      );`;
        }
        else {
            loopBody = (offs = '') => `
      sum += ${sum_dtype}(
        dot(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col${offs}], v),
        dot(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col${offs}], v),
        dot(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col${offs}], v),
        dot(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col${offs}], v),
      );`;
        }
        writeResult = `result.values[global_id.x] = sum;\n`;
    }
    if (subgroups) {
        const generateSubgroupCase = (size) => {
            let broadcast_body = '';
            for (let i = 0; i < size; ++i) {
                broadcast_body += `
            v = subgroupBroadcast(shared_v, ${i}u);
            ${loopBody(` + ${i}u`)}`;
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
            }
            else {
                return `if (sg_size == ${size}u) {
          for (var col = 0u; col < uniforms.packedCols; col = col + ${size}u) {
            let shared_v = ${valueLoad('col + sg_id')};
            ${broadcast_body}
          }
        }`;
            }
        };
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
        }
        else {
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
    }
    else if (workgroups) {
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
    `;
    }
    else {
        code = code + `
    @compute @workgroup_size(${wg_size}) fn main(@builtin(global_invocation_id) global_id  : vec3u) {
      var sum : ${sum_dtype};
      for (var col = 0u; col < uniforms.packedCols; col = col + 1u) {
        let v = ${valueLoad('col')};
        ${loopBody()}
      }
      ${writeResult}
    }`;
    }
    const requiredFeatures = ['timestamp-query'];
    if (storage_dtype === 'f16' || compute_dtype === 'f16') {
        requiredFeatures.push('shader-f16');
    }
    if (subgroups) {
        requiredFeatures.push('chromium-experimental-subgroups');
    }
    return {
        wgsl: code,
        requiredLimits: {
            maxStorageBufferBindingSize: bytesPerElement * rows * cols,
        },
        requiredFeatures,
        test(device) {
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
                    console.log(info.messages);
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
            return function trial(n) {
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
                };
            };
        }
    };
}
async function caseGenerator(adapterOpts) {
    let out = [];
    for (const storage_dtype of ['f32', 'f16', 'u8']) {
        for (const swizzled of [false, true]) {
            for (const workgroups of [false, true]) {
                for (const subgroups of [false, true]) {
                    for (const compute_dtype of ['f32', 'f16', 'u8']) {
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
                                return `${this.storage_dtype}${this.swizzled ? '_swiz' : ''}${this.workgroups ? '_wg' : ''}${this.subgroups ? '_sg' : ''}_${this.compute_dtype}`;
                            }
                        });
                    }
                }
            }
        }
    }
    return out;
}

var matVecMul = /*#__PURE__*/Object.freeze({
  __proto__: null,
  caseGenerator: caseGenerator,
  generateTest: generateTest
});

var benchmarks = {
    globalMemRead1D,
    globalMemRead2D,
    matVecMul,
};

const test_results = new Map();
const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
const comparer = (idx, ascending) => (a, b) => ((v1, v2) => {
    const n1 = v1;
    const n2 = v2;
    return v1 !== '' && v2 !== '' && !isNaN(n1) && !isNaN(n2)
        ? n1 - n2 : v1.toString().localeCompare(v2);
})(getCellValue(ascending ? a : b, idx), getCellValue(ascending ? b : a, idx));
let doSort = () => { };
function addSort(th) {
    let asc = true;
    th.classList.add('sortable');
    th.addEventListener('click', (() => {
        const table = th.closest('table');
        table.querySelectorAll('.sortable').forEach(s => {
            s.classList.remove('sort-up');
            s.classList.remove('sort-down');
        });
        doSort = () => {
            Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
                .sort(comparer(Array.from(th.parentNode.children).indexOf(th), !asc))
                .forEach(tr => table.appendChild(tr));
        };
        doSort();
        if (asc === true) {
            th.classList.remove('sort-down');
            th.classList.add('sort-up');
        }
        else if (asc === false) {
            th.classList.remove('sort-up');
            th.classList.add('sort-down');
        }
        asc = !asc;
    }));
}
const queryParams = new URLSearchParams(window.location.search);
const powerPreference = queryParams.get('powerPreference');
for (const [name,] of Object.entries(benchmarks)) {
    const link = document.createElement('a');
    link.innerText = name;
    link.href = `./?benchmark=${name}`;
    link.classList.add('benchmark-link');
    document.body.appendChild(link);
}
const all = queryParams.get('all');
const adapterOpts = {};
if (powerPreference) {
    adapterOpts.powerPreference = powerPreference;
}
for (const [name, b] of Object.entries(benchmarks)) {
    if (name !== queryParams.get('benchmark')) {
        continue;
    }
    const suiteContainer = document.createElement('div');
    document.body.appendChild(suiteContainer);
    const suiteHeading = document.createElement('h3');
    suiteHeading.innerText = name;
    suiteContainer.appendChild(suiteHeading);
    const progress = document.createElement('progress');
    progress.max = 100;
    progress.value = 0;
    suiteContainer.appendChild(progress);
    const suiteResults = document.createElement('table');
    suiteContainer.appendChild(suiteResults);
    const tableRowHead = document.createElement('tr');
    suiteResults.appendChild(tableRowHead);
    for (const heading of ['case', 'min', 'max', 'avg', 'med', 'std_dev', 'n']) {
        const th = document.createElement('th');
        th.innerText = heading;
        tableRowHead.appendChild(th);
        addSort(th);
        if (heading === 'med') {
            th.click();
        }
    }
    const cases = await b.caseGenerator(all ? undefined : adapterOpts);
    progress.max = cases.length;
    if (cases.length === 0) {
        continue;
    }
    let i = 0;
    async function runCase(params) {
        console.log(`${++i} ${name} ${params.toString()}`);
        let device;
        try {
            const t = b.generateTest(params);
            const adapter = await navigator.gpu.requestAdapter(adapterOpts);
            if (!adapter) {
                return;
            }
            device = await adapter.requestDevice({
                requiredLimits: {
                    ...t.requiredLimits,
                    maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup,
                    maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
                    maxComputeWorkgroupSizeY: adapter.limits.maxComputeWorkgroupSizeY,
                    maxComputeWorkgroupSizeZ: adapter.limits.maxComputeWorkgroupSizeZ,
                },
                requiredFeatures: t.requiredFeatures,
            });
            if (!device) {
                return;
            }
            device.pushErrorScope('validation');
            const run = t.test(device);
            // warmup
            await run(10);
            // calibration
            let avgTime = 0;
            for (let i = 0; i < 3; ++i) {
                avgTime += (await run(10).getTime()) / 3;
            }
            if (avgTime === 0) {
                throw new Error('Invalid calibration');
            }
            // compute number of runs to hit 0.05 seconds.
            const n = Math.max(Math.ceil((1e9 * 0.01) / avgTime), 5);
            // perform 5 trials.
            const trial_results = new Array(5);
            for (let i = 0; i < trial_results.length; ++i) {
                trial_results[i] = 10e-3 * await run(n).getTime(); // convert to microseconds
            }
            const min = trial_results.reduce((a, b) => Math.min(a, b));
            const max = trial_results.reduce((a, b) => Math.max(a, b));
            const avg = trial_results.reduce((a, b) => a + b) / trial_results.length;
            const med = trial_results.sort()[Math.floor(trial_results.length / 2)];
            const std_dev = Math.sqrt(trial_results.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / trial_results.length);
            const r = { case_name: params.toString(), min, max, avg, med, std_dev, n };
            results.push(r);
            const tableRow = document.createElement('tr');
            for (let v of Object.values(r)) {
                const tableCell = document.createElement('td');
                if (typeof v === 'number') {
                    v = Math.round(v * 1000) / 1000;
                }
                tableCell.innerText = v;
                tableRow.appendChild(tableCell);
            }
            suiteResults.appendChild(tableRow);
            doSort();
            return med;
        }
        catch (err) {
            console.warn(err);
            return;
        }
        finally {
            if (device) {
                const error = await device.popErrorScope();
                if (error) {
                    console.error(error.message);
                }
                device.destroy();
            }
            progress.value = i;
        }
    }
    // Build the set of cases, and a map of the parameter space.
    // We'll iterate the parameter space to try to search for other cases
    // which look similar to the current best case.
    const param_space = {};
    const pending_case_map = new Map();
    for (const c of cases) {
        pending_case_map.set(c.toString(), c);
        for (const [k, v] of Object.entries(c)) {
            if (typeof v === 'function') {
                continue;
            }
            if (!param_space[k]) {
                param_space[k] = new Map();
            }
            param_space[k].set(JSON.stringify(v), v);
        }
    }
    let results = [];
    test_results.set(name, results);
    const caseQuery = queryParams.get('case');
    if (caseQuery != null) {
        await runCase(pending_case_map.get(caseQuery));
        continue;
    }
    console.log(`Running ${cases.length} cases of ${name}...`);
    while (pending_case_map.size > 0) {
        // Get a random case to use as a starting point.
        let c = Array.from(pending_case_map.values())[Math.floor(Math.random() * pending_case_map.size)];
        // .next().value;
        let bestTime;
        let didRunCase = false;
        do {
            didRunCase = false;
            // Iterate the dimensions of the parameter space.
            for (const dim of Object.keys(param_space)) {
                // Iterate through the values of `dim`.
                for (const v of param_space[dim].values()) {
                    // Get the key for `c` using value `v` for `dim`.
                    const k = {
                        ...c,
                        [dim]: v
                    }.toString();
                    const candidate = pending_case_map.get(k);
                    if (!candidate) {
                        // If this is not a real case, skip it.
                        continue;
                    }
                    // Remove it from the pending cases since we will run it now.
                    pending_case_map.delete(k);
                    // Run the case.
                    let candidateTime = await runCase(candidate);
                    if (candidateTime === undefined) {
                        continue;
                    }
                    didRunCase = true;
                    // If this is the best case so far, save it.
                    if (bestTime === undefined || candidateTime < bestTime) {
                        bestTime = candidateTime;
                        c = candidate;
                    }
                }
            }
        } while (didRunCase);
    }
}
