import { defineConfig } from 'vite';
import escode from './packages/plugin/src/index';

export default defineConfig({
  plugins: [escode()],
});