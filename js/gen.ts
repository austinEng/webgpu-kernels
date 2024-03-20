import benchmarks from './benchmarks';
import fs from 'fs/promises';
import { subtle } from 'crypto';

for (const file of await fs.readdir(new URL('../data/', import.meta.url))) {
  await fs.unlink(new URL('../data/' + file, import.meta.url));
}

const shaders = new Map<string, string>();

for (const [name, b] of Object.entries(benchmarks)) {
  let shortNameCount = 0;
  for (const [case_name, params] of Object.entries(b.cases)) {
    const { wgsl, requiredLimits, requiredFeatures } = b.generateTest(params);
    let shortName = shaders.get(wgsl);
    if (shortName === undefined) {
      shortName = name + '_' + (shortNameCount ++);
      // const hashArray = Array.from(new Uint8Array(await subtle.digest('SHA-1', Buffer.from(wgsl))));
      // shortName = hashArray
      //   .map((b) => b.toString(16).padStart(2, "0"))
      //   .join("");
      fs.writeFile(new URL('../data/' + shortName + '.wgsl', import.meta.url), wgsl);
      shaders.set(wgsl, shortName);
    }

    fs.writeFile(new URL('../data/' + name + '_' + case_name + '.json', import.meta.url),
                 JSON.stringify({
                   shader: `${shortName}.wgsl`,
                   requiredFeatures,
                   requiredLimits,
                   params,
                 }, undefined, 2));
  }
}
