import { defineConfig } from 'vite';

// Static build uploadable to S3 without CloudFront:
// everything relative, no plugins, no external resources.
export default defineConfig({
  base: './',
  build: {
    target: 'es2018',
  },
});
