import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  // '.astro/' is the generated cache dir; .astro source files ARE linted.
  { ignores: ['dist/', 'dist-test/', '.design/', '.astro/', 'node_modules/', 'public/', 'playwright-report/', 'test-results/'] },
  tseslint.configs.recommended,
  astro.configs['flat/recommended'],
  astro.configs['flat/jsx-a11y-strict'],
  // Scrollable regions (Terminal.astro <pre>) must be keyboard-focusable (WCAG 2.1.1).
  { files: ['**/*.astro'], rules: { 'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['tabpanel', 'region'] }] } },
);
