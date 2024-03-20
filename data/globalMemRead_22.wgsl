enable f16;

struct Uniforms {
  width : u32,
  height : u32,
}

struct Matrix {
  values: array<vec4<f16>>,
}

@group(0) @binding(1) var<storage, read_write> result : f32;
@group(0) @binding(3) var<uniform> uniforms : Uniforms;

override wg_size_x : u32;
override wg_size_y : u32;
override dispatch_size_y : u32;
@group(0) @binding(0) var<storage, read> matrix : Matrix;

@compute @workgroup_size(wg_size_x, wg_size_y) fn main(
  @builtin(global_invocation_id) global_id  : vec3u,
  @builtin(workgroup_id) workgroup_id  : vec3u,
  @builtin(local_invocation_id) local_id  : vec3u
) {
  let y_per_group = uniforms.height / dispatch_size_y;
  for (var y = workgroup_id.y * y_per_group; y < (workgroup_id.y + 1u) * y_per_group; y = y + wg_size_y) {
    let x_per_thread = uniforms.width / wg_size_x;
    let x_start = global_id.x * x_per_thread;
    for (var x = x_start; x < x_start + x_per_thread; x++) {
      let v = matrix.values[y * uniforms.width + x];
      if (all(v == vec4<f16>(123.456))) {
        // This condition should never pass in practice based
        // on the test values we use. It's here to prevent
        // the compiler from optimizing out the loop body.
        result += 1.0;
      }
    }
  }
}
