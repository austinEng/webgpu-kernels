/// <reference types="dist" />
import { Benchmark } from './test';
export type Params = {
    storage_type: 'buffer' | 'texture';
    data_type: 'f32' | 'f16';
    dispatch_size: number;
    workgroup_size: number;
    read_width: 1 | 2 | 4 | 8 | 16 | number;
    access: 'blocked' | 'striped';
    toString(): string;
};
export declare function generateTest(params: Params): Benchmark;
export declare function caseGenerator(adapterOpts?: GPURequestAdapterOptions): Promise<Params[]>;
