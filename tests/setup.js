import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock Tauri APIs since they're not available in test environment
const mockTauri = {
  invoke: vi.fn().mockResolvedValue({}),
  listen: vi.fn(),
  emit: vi.fn(),
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn()
  },
  dialog: {
    open: vi.fn(),
    save: vi.fn()
  }
};

// Mock window.__TAURI_INTERNALS__ 
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: mockTauri,
  writable: true
});

// Mock @tauri-apps/api modules
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockTauri.invoke
}));

vi.mock('@tauri-apps/api/fs', () => mockTauri.fs);
vi.mock('@tauri-apps/api/dialog', () => mockTauri.dialog);

// Global test utilities
global.mockTauri = mockTauri;

// Vue Test Utils global configuration
config.global.stubs = {
  // Stub Vuetify components that might cause issues in tests
  'v-app': { template: '<div class="v-app"><slot /></div>' },
  'v-main': { template: '<div class="v-main"><slot /></div>' },
  'v-container': { template: '<div class="v-container"><slot /></div>' },
  'v-row': { template: '<div class="v-row"><slot /></div>' },
  'v-col': { template: '<div class="v-col"><slot /></div>' },
  'v-card': { template: '<div class="v-card"><slot /></div>' },
  'v-btn': { template: '<button class="v-btn"><slot /></button>' },
  'v-alert': { template: '<div class="v-alert"><slot /></div>' }
};

// Helper to create a clean test environment
export function createTestEnvironment() {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Reset mock implementations
  mockTauri.invoke.mockResolvedValue({});
  mockTauri.fs.readTextFile.mockResolvedValue('');
  mockTauri.fs.writeTextFile.mockResolvedValue(undefined);
  mockTauri.dialog.open.mockResolvedValue(null);
  mockTauri.dialog.save.mockResolvedValue(null);
  
  // Mock localStorage and return empty for theme to start with light theme
  const localStorageMock = {
    getItem: vi.fn().mockReturnValue(null), // Default to null for theme
    setItem: vi.fn(),
    removeItem: vi.fn()
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
  
  return {
    mockTauri,
    localStorage: localStorageMock
  };
}

// Helper to create sample GTF data for testing
export function createSampleGtfData() {
  return {
    header: {
      font_name: 'Test Font',
      version: '1.0',
      description: 'A test font',
      default_palette: {
        entries: {
          '#': '#FF0000',
          '.': '#000000'
        }
      },
      default_size: {
        width: 5,
        height: 7
      }
    },
    glyphs: [
      {
        name: 'A',
        char_repr: 'A',
        unicode: 'U+0041',
        size: { width: 5, height: 7 },
        palette: {
          entries: {
            '#': '#FF0000',
            '.': '#000000'
          }
        },
        bitmap: [
          '..#..',
          '.#.#.',
          '#...#',
          '#####',
          '#...#',
          '#...#',
          '.....'
        ]
      },
      {
        name: 'B',
        char_repr: 'B',
        unicode: 'U+0042',
        size: { width: 5, height: 7 },
        palette: {
          entries: {
            '#': '#FF0000',
            '.': '#000000'
          }
        },
        bitmap: [
          '####.',
          '#...#',
          '####.',
          '####.',
          '#...#',
          '####.',
          '.....'
        ]
      }
    ]
  };
}

// Helper to create sample error objects
export function createSampleError(type = 'runtime', severity = 'medium') {
  return new Error(`Test ${type} error with ${severity} severity`);
} 