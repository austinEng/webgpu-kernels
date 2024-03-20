

export type Benchmark = {
  wgsl: string,
  requiredLimits: Record<string, number>,
  requiredFeatures: Iterable<GPUFeatureName>,
  test: (device: GPUDevice) => (n: number) => {
    getTime: () => Promise<number>,
  }
}
