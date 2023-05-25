import { defineConfig } from 'vite';
import escode from './packages/plugin/src/index';
console.log(escode)

export default defineConfig({
  plugins: [escode()],
});