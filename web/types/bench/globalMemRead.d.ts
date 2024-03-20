import { Benchmark } from './test';
export type Params = {
    storage_type: 'buffer' | 'texture';
    data_type: 'f32' | 'f16';
    pack_type: 'scalar' | 'vec2' | 'vec4' | 'mat2x4' | 'mat4x4';
    row_access: 'blocked' | 'striped';
    col_access: 'blocked' | 'striped';
    workgroup_size: readonly [number, number];
    size: readonly [number, number];
    dispatch_size: readonly [number, number];
};
export declare function generateTest(params: Params): Benchmark;
export declare const cases: Record<string, Params>;
