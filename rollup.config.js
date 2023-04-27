import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import nodePolyfills from 'rollup-plugin-polyfill-node';
import terser from '@rollup/plugin-terser';

export default {
    input: "./dist/index.js",
    output: [
      {
        file: './dist/my-lib-umd.js',
        format: 'umd',
      }
    ],
    plugins: [
      
      commonjs({
        include: /node_modules/
      }),
      resolve(),
      json(),
      
      terser()
      
      
    ],
  }