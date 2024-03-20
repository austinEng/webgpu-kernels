
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
    @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) global_id  : vec3u) {
      var sum : vec4<f32>;
      for (var col = 0u; col < uniforms.packedCols; col = col + 1u) {
        let v = vector.values[col];
        
      sum += vec4<f32>(
        dot(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col], v),
        dot(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col], v),
        dot(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col], v),
        dot(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col], v),
      );
      }
      result.values[global_id.x] = sum;

    }