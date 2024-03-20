
struct Uniforms {
  rows : u32,
  packedCols : u32,
}
struct Matrix {
  values: array<vec4<f32>>
}
struct Vector {
  values: array<vec4<f32>>
}
@group(0) @binding(0) var<storage, read> matrix : Matrix;
@group(0) @binding(1) var<storage, read> vector : Vector;
@group(0) @binding(2) var<storage, read_write> result : Vector;
@group(0) @binding(3) var<uniform> uniforms : Uniforms;
      var<workgroup> shared_vec : array<vec4<f32>, 64>;
      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) global_id  : vec3u,
                                           @builtin(local_invocation_index) lid : u32) {
        var sum : vec4<f32>;
        for (var base_col = 0u; base_col < uniforms.packedCols; base_col = base_col + 64u) {
          for (var i = 0u; i < 1u; i = i + 1u) {
            shared_vec[1u * lid + i] = vector.values[base_col + 1u * lid + i];
          }
          workgroupBarrier();
          for (var i = 0u; i < 64u; i = i + 1u) {
            let col = base_col + i;
            let v : vec4<f32> = shared_vec[i];
            
      sum += vec4<f32>(
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 0u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 1u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 2u], v),
        dot(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 3u], v),
      );
          }
          workgroupBarrier();
        }
        result.values[global_id.x] = sum;

      }
    