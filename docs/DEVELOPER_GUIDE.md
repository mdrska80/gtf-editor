# GTF Editor Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [State Management](#state-management)
3. [Component Architecture](#component-architecture)
4. [Error Handling System](#error-handling-system)
5. [Performance Patterns](#performance-patterns)
6. [Testing Strategy](#testing-strategy)
7. [Accessibility Implementation](#accessibility-implementation)
8. [Development Tools](#development-tools)

## Architecture Overview

The GTF Editor follows modern Vue 3 architectural patterns with a focus on maintainability, performance, and developer experience.

### Core Principles

1. **Composition Over Options API**: All components use the Composition API for better reusability and type inference
2. **Single Responsibility**: Each composable and component has a clear, focused purpose
3. **Reactive State Management**: Centralized state with reactive updates
4. **Error Boundaries**: Comprehensive error handling at all application layers
5. **Performance First**: Optimized rendering and memory usage

### Technology Decisions

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| Vue 3 | Frontend Framework | Modern reactivity, Composition API, excellent performance |
| Vuetify 3 | UI Framework | Material Design, comprehensive components, accessibility |
| Tauri | Desktop Integration | Rust backend, small bundle size, security |
| Vitest | Testing Framework | Fast, Vue-optimized, modern test runner |
| ESLint + Prettier | Code Quality | Consistent style, error prevention |

## State Management

### GTF Store Pattern (`useGtfStore.js`)

The application uses a centralized store pattern implemented as a Vue composable:

```javascript
// Singleton pattern for shared state
const gtfData = ref(initialGtfData());
const currentFilePath = ref(null);
const currentView = ref('header');
const selectedGlyphName = ref(null);

export function useGtfStore() {
  // Computed properties for derived state
  const selectedGlyph = computed(() => 
    gtfData.value.glyphs.find(g => g.name === selectedGlyphName.value) || null
  );

  // Methods that operate on shared state
  const selectGlyph = (name) => {
    selectedGlyphName.value = name;
    currentView.value = 'glyph';
  };

  return {
    // State
    gtfData: readonly(gtfData),
    selectedGlyph,
    
    // Actions
    selectGlyph,
    updateHeader,
    addGlyph
  };
}
```

### Key Features

- **Singleton Pattern**: State is shared across all component instances
- **Reactive Updates**: All consumers automatically update when state changes
- **Immutable Exposure**: State is exposed as readonly to prevent direct mutations
- **Centralized Logic**: All business logic is contained within the store

### State Flow

```
User Action → Component Event → Store Method → State Update → Reactive Re-render
```

## Component Architecture

### Component Hierarchy

```
App.vue (Root)
├── AppSidebar.vue (Navigation & Glyph List)
│   ├── VirtualScrollList.vue (Performance)
│   └── GlyphPreview.vue (Individual Items)
├── HeaderEditor.vue (GTF Header Management)
├── GlyphEditor.vue (Main Editing Interface)
│   ├── GlyphMetadataEditor.vue
│   ├── GlyphBitmapSection.vue
│   │   └── BitmapGrid.vue (Visual Editor)
│   └── GlyphPaletteSection.vue
└── GlobalErrorHandler.vue (Error Boundaries)
```

### Component Design Patterns

#### 1. Composition API with `<script setup>`

```vue
<script setup>
// Props with validation
const props = defineProps({
  glyph: {
    type: Object,
    required: true,
    validator: (glyph) => glyph && typeof glyph.name === 'string'
  }
});

// Events
const emit = defineEmits(['update:glyph', 'save']);

// Composables for business logic
const { addError } = useErrorHandling();
const devTools = useDevTools();

// Component-specific reactive state
const isEditing = ref(false);
const localGlyph = ref({ ...props.glyph });

// Watchers for prop changes
watch(() => props.glyph, (newGlyph) => {
  localGlyph.value = { ...newGlyph };
});

// Methods
const saveChanges = () => {
  emit('update:glyph', localGlyph.value);
  emit('save');
};
</script>
```

#### 2. Props Down, Events Up Pattern

```javascript
// Parent component
const handleGlyphUpdate = (updatedGlyph) => {
  updateGlyph(updatedGlyph.name, 'name', updatedGlyph.name);
};

// Child component
emit('update:glyph', modifiedGlyph);
```

#### 3. Slot-Based Composition

```vue
<template>
  <VirtualScrollList :items="glyphs">
    <template #item="{ item }">
      <GlyphPreview 
        :glyph="item" 
        @select="selectGlyph"
      />
    </template>
  </VirtualScrollList>
</template>
```

## Error Handling System

### Architecture

The error handling system provides comprehensive error management with user-friendly feedback:

```javascript
// Error types and severity levels
const ERROR_TYPES = {
  FILE_OPERATION: 'file_operation',
  VALIDATION: 'validation',
  NETWORK: 'network',
  PARSING: 'parsing',
  RUNTIME: 'runtime',
  USER_INPUT: 'user_input'
};

const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};
```

### Usage Patterns

#### 1. Component-Level Error Handling

```javascript
const { addError, withErrorHandling } = useErrorHandling();

const saveFile = withErrorHandling(
  async () => {
    await invoke('save_gtf_file', { 
      data: gtfData.value,
      path: filePath 
    });
  },
  {
    context: 'save',
    errorType: 'FILE_OPERATION',
    loadingMessage: 'Saving file...'
  }
);
```

#### 2. Validation Error Handling

```javascript
const { validateRequired, validateRange } = useValidationErrorHandling();

const validateGlyphData = (glyph) => {
  validateRequired('name', glyph.name);
  validateRange('width', glyph.size.width, 1, 100);
};
```

#### 3. Global Error Boundaries

```vue
<template>
  <GlobalErrorHandler>
    <router-view />
  </GlobalErrorHandler>
</template>
```

## Performance Patterns

### 1. Virtual Scrolling

For large datasets (glyph lists), virtual scrolling renders only visible items:

```javascript
// useVirtualScrolling.js
export function useVirtualScrolling(items, itemHeight = 40) {
  const scrollTop = ref(0);
  const containerHeight = ref(0);
  
  const visibleItems = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight.value / itemHeight) + 1,
      items.value.length
    );
    
    return items.value.slice(start, end).map((item, index) => ({
      ...item,
      index: start + index
    }));
  });
  
  return { visibleItems, scrollTop, containerHeight };
}
```

### 2. Computed Property Optimization

```javascript
// Memoized expensive computations
const groupedGlyphs = computed(() => {
  return glyphs.value.reduce((groups, glyph) => {
    const category = categorizeGlyph(glyph);
    if (!groups[category]) groups[category] = [];
    groups[category].push(glyph);
    return groups;
  }, {});
});

// Shallow comparison for object props
const glyphMeta = computed(() => ({
  name: selectedGlyph.value?.name,
  unicode: selectedGlyph.value?.unicode,
  size: selectedGlyph.value?.size
}));
```

### 3. Lazy Loading

```javascript
// Component lazy loading
const GlyphEditor = defineAsyncComponent(() => 
  import('./GlyphEditor.vue')
);

// Route-based code splitting
const routes = [
  {
    path: '/preview',
    component: () => import('./FontPreviewPage.vue')
  }
];
```

## Testing Strategy

### Test Structure

```
tests/
├── composables/           # Business logic tests
│   ├── useErrorHandling.test.js
│   ├── useGtfStore.test.js
│   └── useTheme.test.js
├── components/            # Component tests (future)
└── setup.js              # Test configuration
```

### Testing Patterns

#### 1. Composable Testing

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGtfStore } from '@/composables/useGtfStore';

describe('useGtfStore', () => {
  let store;
  
  beforeEach(() => {
    store = useGtfStore();
    store.createNewFile(); // Reset to clean state
  });

  it('should add glyph with unique name', () => {
    store.addGlyph();
    store.addGlyph();
    
    expect(store.gtfData.value.glyphs).toHaveLength(2);
    expect(store.gtfData.value.glyphs[0].name).toBe('NewGlyph1');
    expect(store.gtfData.value.glyphs[1].name).toBe('NewGlyph2');
  });
});
```

#### 2. Mock Strategy

```javascript
// tests/setup.js
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(mockGtfData)
}));

// Component-specific mocks
const mockUseGtfStore = vi.fn(() => ({
  gtfData: ref(mockData),
  selectGlyph: vi.fn()
}));
```

#### 3. Error Testing

```javascript
it('should handle file operation errors', async () => {
  const { addError, errors } = useErrorHandling();
  
  addError('FILE_OPERATION', 'Test error', 'HIGH');
  
  expect(errors.value).toHaveLength(1);
  expect(errors.value[0].type).toBe('FILE_OPERATION');
  expect(errors.value[0].severity).toBe('HIGH');
});
```

## Accessibility Implementation

### WCAG 2.1 AA Compliance

#### 1. Semantic HTML Structure

```vue
<template>
  <main role="main" aria-label="GTF Editor">
    <aside role="navigation" aria-label="Glyph List">
      <h2 id="glyph-list-heading">Glyphs</h2>
      <ul role="list" aria-labelledby="glyph-list-heading">
        <li 
          v-for="glyph in glyphs" 
          :key="glyph.name"
          role="listitem"
        >
          <button 
            :aria-label="`Edit glyph ${glyph.name}`"
            @click="selectGlyph(glyph.name)"
          >
            {{ glyph.name }}
          </button>
        </li>
      </ul>
    </aside>
  </main>
</template>
```

#### 2. Keyboard Navigation

```javascript
// Global keyboard shortcuts
const handleKeyboard = (event) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'n':
        event.preventDefault();
        createNewFile();
        break;
      case 's':
        event.preventDefault();
        saveFile();
        break;
    }
  }
  
  // Escape key handling
  if (event.key === 'Escape') {
    closeDialogs();
  }
};
```

#### 3. Screen Reader Support

```vue
<template>
  <!-- Live regions for dynamic content -->
  <div 
    aria-live="polite" 
    aria-atomic="true"
    class="sr-only"
  >
    {{ statusMessage }}
  </div>
  
  <!-- Descriptive labels -->
  <input
    :aria-describedby="hasError ? 'name-error' : 'name-help'"
    aria-required="true"
  />
  
  <div id="name-help" class="sr-only">
    Enter a unique name for the glyph
  </div>
  
  <div 
    v-if="hasError" 
    id="name-error" 
    role="alert"
    class="error-message"
  >
    {{ errorMessage }}
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
```

## Development Tools

### Enhanced Debugging

#### 1. Development Console Tools

```javascript
// Available in browser console (development mode)
window.GTF_DEV_TOOLS = {
  // Performance monitoring
  getPerformanceSummary(),
  getMemoryUsage(),
  
  // Logging and analysis
  exportLogs(),
  
  // Benchmarking
  benchmark(name, fn),
  
  // Enhanced logging
  log(level, component, message, data)
};
```

#### 2. Component Performance Tracking

```javascript
// useDevTools.js
export function useDevTools() {
  const trackRender = (componentName) => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      trackComponentPerformance(componentName, 'render', end - start);
    };
  };
  
  return { trackRender, log, benchmark };
}

// Usage in components
const devTools = useDevTools();
const endTracking = devTools.trackRender('GlyphEditor');

onMounted(() => {
  endTracking();
});
```

#### 3. State Change Monitoring

```javascript
// Automatic state change tracking
watch(gtfData, (newData, oldData) => {
  if (isDevelopment) {
    devTools.trackStateChange('gtfData', oldData, newData);
  }
}, { deep: true });
```

### Production Optimizations

```javascript
// main.js
if (process.env.NODE_ENV === 'production') {
  // Minimal error handling
  app.config.errorHandler = (err) => {
    console.error('Application error:', err.message);
  };
  
  // Disable performance tracking
  app.config.performance = false;
} else {
  // Development enhancements
  app.config.errorHandler = (err, instance, info) => {
    console.group('🚨 Vue Application Error');
    console.error('Error:', err);
    console.log('Component:', instance?.$options?.name);
    console.log('Info:', info);
    console.groupEnd();
  };
  
  app.config.performance = true;
}
```

## Best Practices Summary

### Code Organization
- Keep components under 200 lines
- Extract business logic to composables
- Use TypeScript-style JSDoc for type safety
- Implement comprehensive error boundaries

### Performance
- Use virtual scrolling for large lists
- Implement lazy loading for heavy components
- Optimize computed properties with proper dependencies
- Monitor performance with development tools

### Accessibility
- Follow WCAG 2.1 AA guidelines
- Implement proper ARIA labels and roles
- Support keyboard navigation
- Provide screen reader feedback

### Testing
- Write tests for all business logic
- Mock external dependencies
- Test error conditions
- Maintain high coverage for critical paths

### Development Experience
- Use enhanced debugging tools
- Implement comprehensive logging
- Monitor performance metrics
- Document architectural decisions

This guide serves as the foundation for understanding and contributing to the GTF Editor codebase. For specific implementation details, refer to the source code and JSDoc comments throughout the project. 