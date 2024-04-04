import { Benchmark } from './test';
export type Params = {
    storage_dtype: 'f32' | 'f16' | 'u8';
    compute_dtype: 'f32' | 'f16' | 'u8';
    workgroups: boolean;
    subgroups: boolean;
    swizzled: boolean;
    rows: number;
    cols: number;
    toString(): string;
};
export declare function generateTest(params: Params): Benchmark;
export declare const cases: Params[];
