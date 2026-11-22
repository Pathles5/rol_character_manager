// Flat config: typescript-eslint recommended for TS sources only.
// No third-party formatting rules. mockup/ and scripts/ stay outside.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'mockup/', 'scripts/', 'backend/dist/'],
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.ts'],
  })),
);
