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
      var<workgroup> shared_vec : array<vec4<f16>, 256>;
      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) global_id  : vec3u,
                                           @builtin(local_invocation_index) lid : u32) {
        var sum : vec4<f16>;
        for (var base_col = 0u; base_col < uniforms.packedCols; base_col = base_col + 256u) {
          for (var i = 0u; i < 4u; i = i + 1u) {
            shared_vec[4u * lid + i] = vec4<f16>(unpack4xU8(vector.values[base_col + 4u * lid + i]));
          }
          workgroupBarrier();
          for (var i = 0u; i < 256u; i = i + 1u) {
            let col = base_col + i;
            let v : vec4<f16> = shared_vec[i];
            
      sum += vec4<f16>(
        dot(vec4<f16>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col])), v),
        dot(vec4<f16>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col])), v),
        dot(vec4<f16>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col])), v),
        dot(vec4<f16>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col])), v),
      );
          }
          workgroupBarrier();
        }
        result.values[global_id.x] = pack4x8unorm(vec4<f32>(sum));

      }
    