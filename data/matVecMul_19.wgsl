enable chromium_experimental_subgroups;

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
      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) global_id  : vec3u,
                                      @builtin(subgroup_size) sg_size : u32,
                                      @builtin(subgroup_invocation_id) sg_id : u32) {
          var sum : vec4<f32>;
          var v : vec4<f32>;
          if (sg_size == 4u) {
          for (var col = 0u; col < uniforms.packedCols; col = col + 4u) {
            let shared_v = vec4<f32>(unpack4xU8(vector.values[col + sg_id]));
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 0u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 1u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 2u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 3u])), v),
      );
          }
        } else if (sg_size == 8u) {
          for (var col = 0u; col < uniforms.packedCols; col = col + 8u) {
            let shared_v = vec4<f32>(unpack4xU8(vector.values[col + sg_id]));
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 0u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 1u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 2u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 4u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 4u])), v),
      );
            v = subgroupBroadcast(shared_v, 5u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 5u])), v),
      );
            v = subgroupBroadcast(shared_v, 6u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 6u])), v),
      );
            v = subgroupBroadcast(shared_v, 7u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 7u])), v),
      );
          }
        } else if (sg_size == 16u) {
          for (var col = 0u; col < uniforms.packedCols; col = col + 16u) {
            let shared_v = vec4<f32>(unpack4xU8(vector.values[col + sg_id]));
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 0u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 1u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 2u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 4u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 4u])), v),
      );
            v = subgroupBroadcast(shared_v, 5u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 5u])), v),
      );
            v = subgroupBroadcast(shared_v, 6u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 6u])), v),
      );
            v = subgroupBroadcast(shared_v, 7u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 7u])), v),
      );
            v = subgroupBroadcast(shared_v, 8u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 8u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 8u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 8u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 8u])), v),
      );
            v = subgroupBroadcast(shared_v, 9u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 9u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 9u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 9u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 9u])), v),
      );
            v = subgroupBroadcast(shared_v, 10u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 10u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 10u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 10u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 10u])), v),
      );
            v = subgroupBroadcast(shared_v, 11u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 11u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 11u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 11u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 11u])), v),
      );
            v = subgroupBroadcast(shared_v, 12u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 12u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 12u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 12u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 12u])), v),
      );
            v = subgroupBroadcast(shared_v, 13u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 13u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 13u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 13u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 13u])), v),
      );
            v = subgroupBroadcast(shared_v, 14u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 14u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 14u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 14u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 14u])), v),
      );
            v = subgroupBroadcast(shared_v, 15u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 15u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 15u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 15u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 15u])), v),
      );
          }
        } else if (sg_size == 32u) {
          for (var col = 0u; col < uniforms.packedCols; col = col + 32u) {
            let shared_v = vec4<f32>(unpack4xU8(vector.values[col + sg_id]));
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 0u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 1u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 2u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 3u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 4u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 4u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 4u])), v),
      );
            v = subgroupBroadcast(shared_v, 5u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 5u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 5u])), v),
      );
            v = subgroupBroadcast(shared_v, 6u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 6u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 6u])), v),
      );
            v = subgroupBroadcast(shared_v, 7u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 7u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 7u])), v),
      );
            v = subgroupBroadcast(shared_v, 8u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 8u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 8u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 8u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 8u])), v),
      );
            v = subgroupBroadcast(shared_v, 9u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 9u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 9u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 9u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 9u])), v),
      );
            v = subgroupBroadcast(shared_v, 10u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 10u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 10u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 10u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 10u])), v),
      );
            v = subgroupBroadcast(shared_v, 11u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 11u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 11u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 11u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 11u])), v),
      );
            v = subgroupBroadcast(shared_v, 12u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 12u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 12u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 12u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 12u])), v),
      );
            v = subgroupBroadcast(shared_v, 13u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 13u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 13u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 13u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 13u])), v),
      );
            v = subgroupBroadcast(shared_v, 14u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 14u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 14u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 14u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 14u])), v),
      );
            v = subgroupBroadcast(shared_v, 15u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 15u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 15u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 15u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 15u])), v),
      );
            v = subgroupBroadcast(shared_v, 16u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 16u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 16u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 16u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 16u])), v),
      );
            v = subgroupBroadcast(shared_v, 17u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 17u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 17u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 17u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 17u])), v),
      );
            v = subgroupBroadcast(shared_v, 18u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 18u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 18u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 18u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 18u])), v),
      );
            v = subgroupBroadcast(shared_v, 19u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 19u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 19u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 19u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 19u])), v),
      );
            v = subgroupBroadcast(shared_v, 20u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 20u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 20u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 20u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 20u])), v),
      );
            v = subgroupBroadcast(shared_v, 21u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 21u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 21u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 21u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 21u])), v),
      );
            v = subgroupBroadcast(shared_v, 22u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 22u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 22u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 22u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 22u])), v),
      );
            v = subgroupBroadcast(shared_v, 23u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 23u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 23u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 23u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 23u])), v),
      );
            v = subgroupBroadcast(shared_v, 24u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 24u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 24u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 24u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 24u])), v),
      );
            v = subgroupBroadcast(shared_v, 25u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 25u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 25u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 25u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 25u])), v),
      );
            v = subgroupBroadcast(shared_v, 26u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 26u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 26u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 26u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 26u])), v),
      );
            v = subgroupBroadcast(shared_v, 27u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 27u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 27u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 27u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 27u])), v),
      );
            v = subgroupBroadcast(shared_v, 28u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 28u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 28u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 28u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 28u])), v),
      );
            v = subgroupBroadcast(shared_v, 29u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 29u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 29u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 29u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 29u])), v),
      );
            v = subgroupBroadcast(shared_v, 30u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 30u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 30u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 30u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 30u])), v),
      );
            v = subgroupBroadcast(shared_v, 31u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 0u) * uniforms.packedCols + col + 31u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 1u) * uniforms.packedCols + col + 31u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 2u) * uniforms.packedCols + col + 31u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[(4u * global_id.x + 3u) * uniforms.packedCols + col + 31u])), v),
      );
          }
        }
          result.values[global_id.x] = pack4x8unorm(vec4<f32>(sum));

      }