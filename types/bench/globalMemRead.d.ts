import { Benchmark } from './test';
export type Params = {
    storage_type: 'buffer' | 'texture';
    data_type: 'f32' | 'f16';
    size: readonly [number, number];
    region: readonly [number, number];
    dispatch_size: readonly [number, number];
    workgroup_size: readonly [number, number];
    read_width: 1 | 2 | 4 | 8 | 16 | number;
    row_access: 'blocked' | 'striped';
    col_access: 'blocked' | 'striped';
    toString(): string;
};
export declare function generateTest(params: Params): Benchmark;
export declare const cases: Params[];
