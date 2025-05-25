import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Vue 3 configuration
  ...vue.configs['flat/recommended'],
  
  // Prettier integration
  prettierConfig,
  
  {
    files: ['**/*.{js,jsx,vue}'],
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'src-tauri/target/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs'
    ],
    plugins: {
      prettier
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        // Node.js globals for config files
        __dirname: 'readonly',
        __filename: 'readonly',
        // Tauri globals
        __TAURI_INTERNALS__: 'readonly',
        // Test globals
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',
      
      // Vue 3 specific rules
      'vue/multi-word-component-names': 'off', // Allow single word components
      'vue/no-unused-vars': 'error',
      'vue/no-multiple-template-root': 'off', // Vue 3 allows multiple roots
      'vue/v-on-event-hyphenation': 'off', // Allow camelCase events
      'vue/attribute-hyphenation': 'off', // Allow camelCase attributes
      
      // JavaScript quality rules
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_' 
      }],
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Code style preferences
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      
      // Performance considerations
      'vue/no-watch-after-await': 'error',
      'vue/no-computed-properties-in-data': 'error',
      
      // Modern JavaScript features
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error'
    }
  },
  
  // Test files specific configuration
  {
    files: ['tests/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    rules: {
      'no-console': 'off' // Allow console in tests
    }
  }
]; 