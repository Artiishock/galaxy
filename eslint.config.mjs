import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Flat config, ESLint 10.
 *
 * `eslint-config-next` намеренно не используется: пресет тянет плагины
 * (import / jsx-a11y / react), которые на 10.09.2026 объявляют peer `eslint <=9`,
 * а ESLint 9 помечен EOL. Плагины подключаются напрямую — оба поддерживают ESLint 10.
 *
 * Линтинг с учётом типов включён (`projectService`): именно он ловит
 * незавершённые промисы и неверные async-обработчики — для 3D-кода с ручным
 * жизненным циклом это важнее стилистических правил.
 */
export default tseslint.config(
  // `out/` — результат статического экспорта: там лежит собранный код, который
  // линтовать нечего и незачем.
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'eslint.config.mjs'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,

      // Дисциплина из CLAUDE.md §11 и §3.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
