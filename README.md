# GTF Editor

A modern, professional desktop application for editing GTF (Glyph/Font) files, built with Vue 3, Vite, Vuetify, and Tauri.

## 🚀 Features

- **Professional GTF File Editing**: Complete support for GTF v2 format with header and glyph editing
- **Visual Bitmap Editor**: Interactive grid-based bitmap editing with real-time preview
- **Palette Management**: Advanced color palette editing with drag-and-drop functionality
- **Character Mapping**: Comprehensive Unicode support with character preview and validation
- **Theme Support**: Light/dark mode with persistent user preferences
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support and keyboard navigation
- **Performance Optimized**: Virtual scrolling, lazy loading, and optimized rendering
- **Professional Quality**: Comprehensive error handling, testing, and development tools

## 🛠️ Technology Stack

- **Frontend**: Vue 3 with Composition API
- **UI Framework**: Vuetify 3 with Material Design
- **Build Tool**: Vite for fast development and optimized builds
- **Desktop**: Tauri for native desktop integration
- **Testing**: Vitest with Vue Test Utils
- **Code Quality**: ESLint + Prettier with comprehensive rules
- **Language**: JavaScript with JSDoc type annotations

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Rust and Cargo (for Tauri)
- Git

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd gtf-editor

# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start desktop application (Tauri)
npm run tauri dev

# Build for production
npm run build
npm run tauri build
```

### Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server
npm run tauri dev    # Start Tauri desktop app

# Building
npm run build        # Build for production
npm run preview      # Preview production build
npm run tauri build  # Build desktop application

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier

# Testing
npm run test         # Interactive test runner
npm run test:run     # Run tests once
npm run test:ui      # Visual test interface
npm run test:coverage # Generate coverage report
npm run test:watch   # Watch mode for development
```

## 🏗️ Architecture Overview

### Project Structure

```
gtf-editor/
├── src/
│   ├── components/          # Vue components
│   │   ├── AppSidebar.vue
│   │   ├── BitmapGrid.vue
│   │   ├── GlobalErrorHandler.vue
│   │   └── ...
│   ├── composables/         # Vue composables (business logic)
│   │   ├── useErrorHandling.js
│   │   ├── useGtfStore.js
│   │   ├── useTheme.js
│   │   ├── useDevTools.js
│   │   └── ...
│   ├── constants/           # Application constants
│   │   └── design.js
│   ├── types/              # JSDoc type definitions
│   │   └── gtf.js
│   ├── App.vue             # Root component
│   └── main.js             # Application entry point
├── src-tauri/              # Tauri backend (Rust)
├── tests/                  # Test suites
└── docs/                   # Documentation
```

### Key Architectural Patterns

1. **Composition API**: Modern Vue 3 patterns with reactive composables
2. **Centralized State**: Store pattern with `useGtfStore` composable
3. **Error Boundaries**: Comprehensive error handling with user feedback
4. **Component Decomposition**: Small, focused, testable components
5. **Performance Optimization**: Virtual scrolling, lazy loading, memoization

## 🧩 Core Components

### State Management (`useGtfStore.js`)
Centralized state management for GTF data, file operations, and view navigation.

```javascript
import { useGtfStore } from '@/composables/useGtfStore';

const { 
  gtfData, 
  selectedGlyph, 
  currentView,
  selectGlyph,
  updateHeader,
  addGlyph 
} = useGtfStore();
```

### Error Handling (`useErrorHandling.js`)
Professional error management with categorization and user feedback.

```javascript
import { useErrorHandling } from '@/composables/useErrorHandling';

const { addError, errors, isLoading } = useErrorHandling();

// Add categorized errors
addError('FILE_OPERATION', 'Failed to save file', 'HIGH', {
  context: 'save',
  filename: 'example.gtf'
});
```

### Theme Management (`useTheme.js`)
Theme switching with persistence and system integration.

```javascript
import { useTheme } from '@/composables/useTheme';

const { isDarkMode, toggleTheme, setTheme } = useTheme();
```

### Development Tools (`useDevTools.js`)
Advanced debugging and performance monitoring for development.

```javascript
import { useDevTools } from '@/composables/useDevTools';

const { log, benchmark, trackStateChange } = useDevTools();

// Enhanced logging
log('info', 'Component', 'Operation completed', { data });

// Performance benchmarking
const result = benchmark('heavy-operation', () => {
  // Your code here
});
```

## 🔧 Development Guidelines

### Code Style
- Follow ESLint configuration (Vue 3 + modern JavaScript)
- Use Prettier for consistent formatting
- Prefer arrow functions and const/let over var
- Use descriptive component and function names

### Component Guidelines
- Keep components under 200 lines
- Use Composition API with `<script setup>`
- Implement proper prop validation
- Emit events for parent communication
- Use scoped styles when possible

### Testing Strategy
- Unit tests for composables and utilities
- Component tests for UI interactions
- Mock external dependencies (Tauri APIs)
- Aim for comprehensive coverage of business logic

### Accessibility Standards
- WCAG 2.1 AA compliance
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast and reduced motion support

## 🧪 Testing

### Test Structure
```
tests/
├── composables/
│   ├── useErrorHandling.test.js
│   ├── useGtfStore.test.js
│   └── useTheme.test.js
└── setup.js
```

### Running Tests
```bash
# Development testing
npm run test:watch

# CI/CD testing
npm run test:run

# Coverage analysis
npm run test:coverage

# Visual test interface
npm run test:ui
```

### Writing Tests
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGtfStore } from '@/composables/useGtfStore';

describe('useGtfStore', () => {
  beforeEach(() => {
    // Reset state before each test
  });

  it('should initialize with empty state', () => {
    const { gtfData } = useGtfStore();
    expect(gtfData.value).toEqual(expectedInitialState);
  });
});
```

## 🚀 Performance Optimization

### Implemented Optimizations
- **Virtual Scrolling**: Efficient rendering of large glyph lists
- **Lazy Loading**: Components loaded on demand
- **Memoization**: Cached computed properties and expensive operations
- **Code Splitting**: Reduced initial bundle size
- **Optimized Vuetify**: Custom defaults and tree-shaking

### Performance Monitoring
Use development tools for performance analysis:

```javascript
// Browser console (development mode)
window.GTF_DEV_TOOLS.getPerformanceSummary();
window.GTF_DEV_TOOLS.getMemoryUsage();
window.GTF_DEV_TOOLS.exportLogs();
```

## 🔍 Debugging

### Development Tools
- **Enhanced Error Handling**: Detailed error context and stack traces
- **Performance Monitoring**: Component render times and memory usage
- **State Tracking**: Automatic logging of state changes
- **Component Inspection**: Development-time debugging utilities

### Debug Mode
```bash
# Enable development mode
NODE_ENV=development npm run dev

# Debug specific components
# Use Vue DevTools browser extension
# Check browser console for enhanced logging
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the guidelines above
4. Add/update tests as needed
5. Run the full test suite (`npm run test:run`)
6. Check code quality (`npm run lint && npm run format`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Quality Checklist
- [ ] All tests pass (`npm run test:run`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is properly formatted (`npm run format`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Accessibility standards maintained
- [ ] Performance impact considered

## 📚 Additional Resources

### GTF Format Specification
See `glyph_format_spec_v2.md` for detailed GTF v2 format documentation.

### API Documentation
- **Tauri Commands**: File operations and system integration
- **Component Props**: See JSDoc comments in component files
- **Composable APIs**: Comprehensive JSDoc type definitions in `types/gtf.js`

### External Dependencies
- [Vue 3 Documentation](https://vuejs.org/)
- [Vuetify 3 Documentation](https://vuetifyjs.com/)
- [Tauri Documentation](https://tauri.app/)
- [Vitest Documentation](https://vitest.dev/)

## 📄 License

[Add your license information here]

## 👥 Team

[Add team/contributor information here]

---

**Built with ❤️ using modern web technologies and professional development practices.**
