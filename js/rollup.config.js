import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy'

export default {
  input: 'web/main.ts',
  output: {
    file: 'dist/web/bundle.js',
    format: 'es',
  },
  plugins: [
    json(),
    nodeResolve(),
    commonjs(),
    typescript(),
    copy({
      targets: [
        { src: 'web/index.html', dest: 'dist/web' },
      ]
    })
  ],
};
