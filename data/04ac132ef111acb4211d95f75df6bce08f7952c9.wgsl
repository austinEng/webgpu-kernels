enable f16;

struct Uniforms {
  rows : u32,
  packedCols : u32,
}
struct Matrix {
  values: array<u32>
}
struct Vector {
  values: array<u32>
}
@group(0) @binding(0) var<storage, read> matrix : Matrix;
@group(0) @binding(1) var<storage, read> vector : Vector;
@group(0) @binding(2) var<storage, read_write> result : Vector;
@group(0) @binding(3) var<uniform> uniforms : Uniforms;
    @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) global_id  : vec3u) {
      var sum : vec4<f16>;
      for (var col = 0u; col < uniforms.packedCols; col = col + 1u) {
        let v = vec4<f16>(unpack4xU8(vector.values[col]));
        
      sum += vec4<f16>(
        dot(vec4<f16>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 0u])), v),
        dot(vec4<f16>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 1u])), v),
        dot(vec4<f16>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 2u])), v),
        dot(vec4<f16>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col) + 3u])), v),
      );
      }
      result.values[global_id.x] = pack4x8unorm(vec4<f32>(sum));

    }