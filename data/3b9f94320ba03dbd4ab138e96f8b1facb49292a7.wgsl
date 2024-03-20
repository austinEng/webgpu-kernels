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
      var<workgroup> shared_vec : array<vec4<f32>, 256>;
      @compute @workgroup_size(64) fn main(
                @builtin(global_invocation_id) global_id  : vec3u,
                @builtin(local_invocation_index) lid : u32,
                @builtin(subgroup_size) sg_size : u32,
                @builtin(subgroup_invocation_id) sg_id : u32) {
          var sum : vec4<f32>;
          var v : vec4<f32>;
          for (var base_col = 0u; base_col < uniforms.packedCols; base_col = base_col + 256u) {
            for (var i = 0u; i < 4u; i = i + 1u) {
              shared_vec[4u * lid + i] = vec4<f32>(unpack4xU8(vector.values[base_col + 4u * lid + i]));
            }
            workgroupBarrier();
            
        if (sg_size == 4u) {
          for (var i = 0u; i < 256u; i = i + 4u) {
            let col = base_col + i;
            let shared_v = shared_vec[i + sg_id];
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 3u])), v),
      );
          }
        } else 
        if (sg_size == 8u) {
          for (var i = 0u; i < 256u; i = i + 8u) {
            let col = base_col + i;
            let shared_v = shared_vec[i + sg_id];
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 4u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 5u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 6u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 7u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 3u])), v),
      );
          }
        } else 
        if (sg_size == 16u) {
          for (var i = 0u; i < 256u; i = i + 16u) {
            let col = base_col + i;
            let shared_v = shared_vec[i + sg_id];
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 4u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 5u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 6u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 7u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 8u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 9u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 10u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 11u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 12u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 13u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 14u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 15u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 3u])), v),
      );
          }
        } else 
        if (sg_size == 32u) {
          for (var i = 0u; i < 256u; i = i + 32u) {
            let col = base_col + i;
            let shared_v = shared_vec[i + sg_id];
            
            v = subgroupBroadcast(shared_v, 0u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 0u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 1u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 1u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 2u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 2u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 3u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 3u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 4u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 4u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 5u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 5u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 6u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 6u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 7u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 7u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 8u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 8u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 9u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 9u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 10u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 10u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 11u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 11u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 12u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 12u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 13u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 13u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 14u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 14u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 15u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 15u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 16u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 16u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 16u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 16u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 16u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 17u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 17u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 17u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 17u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 17u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 18u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 18u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 18u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 18u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 18u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 19u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 19u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 19u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 19u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 19u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 20u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 20u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 20u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 20u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 20u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 21u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 21u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 21u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 21u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 21u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 22u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 22u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 22u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 22u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 22u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 23u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 23u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 23u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 23u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 23u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 24u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 24u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 24u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 24u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 24u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 25u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 25u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 25u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 25u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 25u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 26u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 26u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 26u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 26u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 26u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 27u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 27u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 27u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 27u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 27u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 28u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 28u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 28u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 28u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 28u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 29u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 29u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 29u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 29u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 29u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 30u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 30u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 30u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 30u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 30u) + 3u])), v),
      );
            v = subgroupBroadcast(shared_v, 31u);
            
      sum += vec4<f32>(
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 31u) + 0u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 31u) + 1u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 31u) + 2u])), v),
        dot(vec4<f32>(unpack4xU8(matrix.values[4u * (global_id.x * uniforms.packedCols + col + 31u) + 3u])), v),
      );
          }
        }
            workgroupBarrier();
          }
          result.values[global_id.x] = pack4x8unorm(vec4<f32>(sum));

      }