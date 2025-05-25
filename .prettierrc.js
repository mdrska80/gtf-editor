export default {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  
  // Indentation and spacing
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  
  // Line breaks and wrapping
  printWidth: 80,
  endOfLine: 'lf',
  bracketSameLine: false,
  
  // Vue specific settings
  vueIndentScriptAndStyle: false,
  
  // HTML/XML formatting
  htmlWhitespaceSensitivity: 'css',
  
  // Override for specific file types
  overrides: [
    {
      files: '*.vue',
      options: {
        parser: 'vue',
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
  ],
}; 