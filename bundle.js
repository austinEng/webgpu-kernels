function elementsPerLoad(params) {
    let num_els;
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
function widthInLoads(params) {
    const elements_per_load = elementsPerLoad(params);
    const width_in_loads = params.size[0] / elements_per_load;
    if (width_in_loads != Math.round(width_in_loads)) {
        throw new Error(`${params.size[0]} is not divisible by ${elements_per_load}`);
    }
    return width_in_loads;
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
    return elementsPerLoad(params) * bytes_per_el;
}
function generateTest$1(params) {
    let enables = '';
    if (params.data_type === 'f16') {
        enables += 'enable f16;\n';
    }
    const elem_type = params.pack_type === 'scalar'
        ? params.data_type
        : `${params.pack_type}<${params.data_type}>`;
    let noop_compare = '';
    if (params.storage_type === 'texture') {
        noop_compare = 'all(v == vec4f(123.456))';
    }
    else {
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
}`;
    }
    else {
        texture_dtype = params.data_type === 'f16' ? 'f32' : params.data_type;
        types += `
alias Matrix = texture_2d<${texture_dtype}>;`;
    }
    let y_loop = '';
    let x_loop = '';
    if (params.col_access === 'striped') {
        x_loop = 'for (var x = global_id.x; x < uniforms.width; x = x + wg_size_x)';
    }
    else {
        x_loop = `let x_per_thread = uniforms.width / wg_size_x;
    let x_start = global_id.x * x_per_thread;
    for (var x = x_start; x < x_start + x_per_thread; x++)`;
    }
    if (params.row_access === 'striped') {
        y_loop = `let y_per_group = uniforms.height / dispatch_size_y;
  for (var y = workgroup_id.y * y_per_group; y < (workgroup_id.y + 1u) * y_per_group; y = y + wg_size_y)`;
    }
    else {
        y_loop = `let y_per_group = uniforms.height / dispatch_size_y;
  let y_start = workgroup_id.y * y_per_group + local_id.y;
  for (var y = y_start; y < y_start + y_per_group; y++)`;
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
override dispatch_size_y : u32;`;
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
    }
    else {
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
    const requiredFeatures = ['timestamp-query'];
    if (params.data_type === 'f16') {
        requiredFeatures.push('shader-f16');
    }
    const requiredLimits = {};
    let storageBufferSize;
    let textureSize;
    if (params.storage_type === 'buffer') {
        storageBufferSize = bytesPerLoad(params) * widthInLoads(params) * params.size[1];
        requiredLimits.maxStorageBufferBindingSize = storageBufferSize;
        requiredLimits.maxBufferSize = storageBufferSize;
    }
    else {
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
function caseGenerator$1() {
    const sizeA = 32768;
    const sizeB = 2048;
    let out = {};
    for (const storage_type of ['buffer', 'texture']) {
        for (const pack_type of ['scalar', 'vec2', 'vec4', 'mat2x4', 'mat4x4']) {
            if (pack_type === 'mat2x4' || pack_type === 'mat4x4') {
                if (storage_type === 'texture') {
                    continue;
                }
            }
            for (const data_type of ['f32', 'f16']) {
                for (const row_access of ['blocked', 'striped']) {
                    for (const col_access of ['blocked', 'striped']) {
                        for (const size of [
                            [data_type === 'f16' ? sizeA * 2 : sizeA, sizeB],
                            [data_type === 'f16' ? sizeB * 2 : sizeB, sizeA],
                        ]) {
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
                                // [4, 16],
                                // [2, 32],
                                // [1, 64],
                            ]) {
                                const dispatch_size = [1, size[1] / workgroup_size[1]];
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
                                };
                                /*const width_in_loads = widthInLoads({ pack_type, size });
                                const n_tiles = [
                                  width_in_loads / workgroup_size[1],
                                  size[1] / workgroup_size[0],
                                ];
                
                                for (let loop_x = 1; loop_x <= n_tiles[0]; loop_x *= 8) {
                                  for (let loop_y = 1; loop_y <= n_tiles[1]; loop_y *= 8) {
                                    const dispatch_size = [
                                      n_tiles[0] / loop_x,
                                      n_tiles[1] / loop_y,
                                    ] as const;
                
                                    if (dispatch_size[0] != Math.round(dispatch_size[0])) {
                                      continue;
                                    }
                
                                    if (dispatch_size[1] != Math.round(dispatch_size[1])) {
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
                                }*/
                            }
                        }
                    }
                }
            }
        }
    }
    return out;
}
const cases$1 = caseGenerator$1();

var globalMemRead = /*#__PURE__*/Object.freeze({
  __proto__: null,
  cases: cases$1,
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
function caseGenerator() {
    let out = {};
    for (const storage_dtype of ['f32', 'f16', 'u8']) {
        for (const swizzled of [false, true]) {
            for (const workgroups of [false, true]) {
                for (const subgroups of [false, true]) {
                    for (const compute_dtype of ['f32', 'f16', 'u8']) {
                        if (storage_dtype !== 'u8' &&
                            compute_dtype !== storage_dtype) {
                            continue;
                        }
                        out[`${storage_dtype}${swizzled ? '_swiz' : ''}${workgroups ? '_wg' : ''}${subgroups ? '_sg' : ''}_${compute_dtype}`] = {
                            storage_dtype,
                            swizzled,
                            workgroups,
                            subgroups,
                            compute_dtype,
                            rows: 32768,
                            cols: 2048,
                        };
                    }
                }
            }
        }
    }
    return out;
}
const cases = caseGenerator();

var matVecMul = /*#__PURE__*/Object.freeze({
  __proto__: null,
  cases: cases,
  generateTest: generateTest
});

var benchmarks = {
    globalMemRead,
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
function addSort(th) {
    let asc = undefined;
    th.classList.add('sortable');
    th.addEventListener('click', (() => {
        const table = th.closest('table');
        table.querySelectorAll('.sortable').forEach(s => {
            s.classList.remove('sort-up');
            s.classList.remove('sort-down');
        });
        Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), asc = !asc))
            .forEach(tr => table.appendChild(tr));
        if (asc === true) {
            th.classList.remove('sort-down');
            th.classList.add('sort-up');
        }
        else if (asc === false) {
            th.classList.remove('sort-up');
            th.classList.add('sort-down');
        }
    }));
}
const queryParams = new URLSearchParams(window.location.search);
for (const [name,] of Object.entries(benchmarks)) {
    const link = document.createElement('a');
    link.innerText = name;
    link.href = `./?benchmark=${name}`;
    link.classList.add('benchmark-link');
    document.body.appendChild(link);
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
    const suiteResults = document.createElement('table');
    suiteContainer.appendChild(suiteResults);
    const tableRowHead = document.createElement('tr');
    suiteResults.appendChild(tableRowHead);
    for (const heading of ['case', 'min', 'max', 'avg', 'med', 'std_dev']) {
        const th = document.createElement('th');
        th.innerText = heading;
        tableRowHead.appendChild(th);
        addSort(th);
    }
    for (const [case_name, params] of Object.entries(b.cases)) {
        console.log(name, case_name);
        let results = [];
        test_results.set(name, results);
        let device;
        try {
            const t = b.generateTest(params);
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                continue;
            }
            device = await adapter.requestDevice({
                requiredLimits: t.requiredLimits,
                requiredFeatures: t.requiredFeatures,
            });
            if (!device) {
                continue;
            }
            const run = t.test(device);
            // warmup
            for (let i = 0; i < 3; ++i) {
                run(10);
            }
            // calibration
            let avgTime = 0;
            for (let i = 0; i < 5; ++i) {
                avgTime += (await run(10).getTime()) / 5;
            }
            // compute number of runs to hit 0.1 seconds.
            const n = Math.ceil((1e9 * 0.1) / avgTime);
            // perform 10 trials.
            const trial_results = new Array(10);
            for (let i = 0; i < trial_results.length; ++i) {
                trial_results[i] = 10e-3 * await run(n).getTime(); // convert to microseconds
            }
            const min = trial_results.reduce((a, b) => Math.min(a, b));
            const max = trial_results.reduce((a, b) => Math.max(a, b));
            const avg = trial_results.reduce((a, b) => a + b) / trial_results.length;
            const med = trial_results.sort()[Math.floor(trial_results.length / 2)];
            const std_dev = Math.sqrt(trial_results.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / trial_results.length);
            const r = { case_name, min, max, avg, med, std_dev };
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
        }
        catch (err) {
            console.warn(err);
            continue;
        }
        finally {
            if (device) {
                device.destroy();
            }
        }
    }
}
