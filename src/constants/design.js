// Design System Constants for GTF Editor
// Centralizes magic numbers and repeated values for consistency

// =============================================================================
// SIZING
// =============================================================================

export const SIZING = {
  // Bitmap Grid
  BITMAP_CELL_SIZE: 48, // pixels - default cell size for bitmap grid
  BITMAP_CELL_SIZE_SMALL: 24, // pixels - smaller cell size option

  // Glyph Preview
  GLYPH_PREVIEW_HEIGHT_DEFAULT: 64, // pixels - default preview height
  GLYPH_PREVIEW_HEIGHT_SMALL: 32, // pixels - small preview height
  GLYPH_PREVIEW_HEIGHT_LARGE: 96, // pixels - large preview height

  // Palette Swatches
  COLOR_SWATCH_SIZE: 20, // pixels - standard color swatch size
  COLOR_SWATCH_SIZE_SMALL: 12, // pixels - small swatch for chips

  // Layout
  SIDEBAR_WIDTH: 300, // pixels - default sidebar width
  CONTAINER_PADDING: 16, // pixels - standard container padding
  SPACING_SMALL: 8, // pixels - small spacing
  SPACING_MEDIUM: 16, // pixels - medium spacing
  SPACING_LARGE: 24, // pixels - large spacing
};

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  // Default Palette Characters
  DEFAULT_CHAR_EMPTY: '.',
  DEFAULT_CHAR_FILLED: '#',

  // Color Defaults
  DEFAULT_BACKGROUND: '#000000',
  DEFAULT_FOREGROUND: '#FFFFFF',

  // Validation/Status Colors (hex values for non-Vuetify contexts)
  ERROR_COLOR: '#F44336',
  WARNING_COLOR: '#FF9800',
  SUCCESS_COLOR: '#4CAF50',
  INFO_COLOR: '#2196F3',
};

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  // Font Families
  FONT_MONO: 'monospace',
  FONT_UI: 'Roboto, sans-serif',

  // Font Sizes (relative units)
  FONT_SIZE_SMALL: '0.8em',
  FONT_SIZE_NORMAL: '1em',
  FONT_SIZE_LARGE: '1.2em',
  FONT_SIZE_XLARGE: '2.5em', // for prominent character input

  // Font Weights
  FONT_WEIGHT_NORMAL: 400,
  FONT_WEIGHT_MEDIUM: 500,
  FONT_WEIGHT_BOLD: 700,
};

// =============================================================================
// LAYOUT
// =============================================================================

export const LAYOUT = {
  // Grid System
  GRID_COLUMNS: 12, // Vuetify grid columns

  // Breakpoints (matching Vuetify defaults)
  BREAKPOINT_SM: 600,
  BREAKPOINT_MD: 960,
  BREAKPOINT_LG: 1264,
  BREAKPOINT_XL: 1904,

  // Z-Index Layers
  Z_INDEX_DROPDOWN: 1000,
  Z_INDEX_MODAL: 1010,
  Z_INDEX_TOOLTIP: 1020,
  Z_INDEX_OVERLAY: 1030,
};

// =============================================================================
// ANIMATIONS
// =============================================================================

export const ANIMATIONS = {
  // Durations (ms)
  DURATION_FAST: 150,
  DURATION_NORMAL: 300,
  DURATION_SLOW: 500,

  // Easing Functions
  EASING_STANDARD: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  EASING_ACCELERATE: 'cubic-bezier(0.4, 0.0, 1, 1)',
  EASING_DECELERATE: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
};

// =============================================================================
// APPLICATION SPECIFIC
// =============================================================================

export const GTF_EDITOR = {
  // File Types
  SUPPORTED_EXTENSIONS: ['.gtf'],

  // Default Values
  DEFAULT_GLYPH_SIZE: { width: 5, height: 7 },
  DEFAULT_FONT_NAME: 'Untitled Font',
  DEFAULT_VERSION: '1.0',

  // Limits
  MAX_GLYPH_SIZE: { width: 100, height: 100 },
  MIN_GLYPH_SIZE: { width: 1, height: 1 },
  MAX_GLYPHS_COUNT: 1000,

  // Local Storage Keys
  STORAGE_KEYS: {
    THEME: 'gtf-editor-theme',
    RECENT_FILES: 'gtf-editor-recent-files',
    PREFERENCES: 'gtf-editor-preferences',
  },
};

// =============================================================================
// CSS CUSTOM PROPERTIES (for use in Vue components)
// =============================================================================

export const CSS_VARS = {
  // Convert sizing constants to CSS custom properties
  '--cell-size': `${SIZING.BITMAP_CELL_SIZE}px`,
  '--cell-size-small': `${SIZING.BITMAP_CELL_SIZE_SMALL}px`,
  '--preview-height': `${SIZING.GLYPH_PREVIEW_HEIGHT_DEFAULT}px`,
  '--swatch-size': `${SIZING.COLOR_SWATCH_SIZE}px`,
  '--swatch-size-small': `${SIZING.COLOR_SWATCH_SIZE_SMALL}px`,

  // Spacing
  '--spacing-sm': `${SIZING.SPACING_SMALL}px`,
  '--spacing-md': `${SIZING.SPACING_MEDIUM}px`,
  '--spacing-lg': `${SIZING.SPACING_LARGE}px`,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate CSS custom properties object for use in Vue components
 * @param {Object} overrides - Override default values
 * @returns {Object} CSS custom properties
 */
export function getCSSVars(overrides = {}) {
  return { ...CSS_VARS, ...overrides };
}

/**
 * Convert pixel value to rem
 * @param {number} pixels - Pixel value
 * @param {number} baseFontSize - Base font size (default 16px)
 * @returns {string} rem value
 */
export function pxToRem(pixels, baseFontSize = 16) {
  return `${pixels / baseFontSize}rem`;
}

/**
 * Get responsive sizing based on screen width
 * @param {number} screenWidth - Current screen width
 * @returns {Object} Responsive sizing constants
 */
export function getResponsiveSizing(screenWidth) {
  if (screenWidth < LAYOUT.BREAKPOINT_SM) {
    return {
      cellSize: SIZING.BITMAP_CELL_SIZE_SMALL,
      previewHeight: SIZING.GLYPH_PREVIEW_HEIGHT_SMALL,
      spacing: SIZING.SPACING_SMALL,
    };
  } else if (screenWidth < LAYOUT.BREAKPOINT_MD) {
    return {
      cellSize: SIZING.BITMAP_CELL_SIZE,
      previewHeight: SIZING.GLYPH_PREVIEW_HEIGHT_DEFAULT,
      spacing: SIZING.SPACING_MEDIUM,
    };
  } else {
    return {
      cellSize: SIZING.BITMAP_CELL_SIZE,
      previewHeight: SIZING.GLYPH_PREVIEW_HEIGHT_LARGE,
      spacing: SIZING.SPACING_LARGE,
    };
  }
}
