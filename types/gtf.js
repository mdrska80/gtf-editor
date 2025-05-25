/**
 * @fileoverview Type definitions for GTF (Glyph Text Format) data structures
 * These types provide comprehensive documentation and type safety for the GTF Editor
 */

/**
 * @typedef {Object} GtfHeader
 * @property {string} font_name - Name of the font
 * @property {string} version - Version of the font
 * @property {string} [description] - Optional description of the font
 * @property {number} [created_timestamp] - Unix timestamp when font was created
 * @property {number} [modified_timestamp] - Unix timestamp when font was last modified
 * @property {GtfPalette} [default_palette] - Default color palette for the font
 * @property {Object<string, any>} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} GtfPalette
 * @property {Object<string, string>} entries - Character to color mapping (e.g., {"#": "#FF0000", ".": "#000000"})
 */

/**
 * @typedef {Object} GtfGlyph
 * @property {string} name - Unique identifier for the glyph
 * @property {string} [char_repr] - Character representation (what character this glyph represents)
 * @property {number} width - Width of the glyph bitmap in cells
 * @property {number} height - Height of the glyph bitmap in cells
 * @property {string[][]} bitmap - 2D array representing the glyph bitmap, where each cell contains a palette character
 * @property {GtfPalette} [palette] - Custom palette for this glyph (overrides default)
 * @property {Object<string, any>} [metadata] - Additional glyph metadata
 */

/**
 * @typedef {Object} GtfData
 * @property {GtfHeader} header - Font header information
 * @property {GtfGlyph[]} glyphs - Array of all glyphs in the font
 */

/**
 * @typedef {Object} ProcessedPaletteEntry
 * @property {string} char - The palette character (e.g., "#", ".")
 * @property {string} color - The hex color value (e.g., "#FF0000")
 */

/**
 * @typedef {ProcessedPaletteEntry[]} ProcessedPalette
 */

/**
 * @typedef {Object} GlyphGroup
 * @property {string} name - Name of the group (e.g., "Letters", "Numbers")
 * @property {GtfGlyph[]} glyphs - Array of glyphs in this group
 */

/**
 * @typedef {Object} FileOperationResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {GtfData} [data] - The loaded GTF data (if successful)
 * @property {string} [filePath] - Path to the loaded file
 * @property {Error} [error] - Error object (if failed)
 * @property {string} [message] - Human-readable message
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {string[]} errors - Array of validation error messages
 * @property {string[]} warnings - Array of validation warning messages
 */

/**
 * @typedef {Object} GtfStoreState
 * @property {GtfData|null} gtfData - Current GTF data
 * @property {string|null} currentFilePath - Path to current file
 * @property {string|null} currentView - Current view (header, glyph, font-preview, ui-demo)
 * @property {string|null} selectedGlyphName - Name of currently selected glyph
 * @property {GtfGlyph|null} selectedGlyphData - Data of currently selected glyph
 */

/**
 * @typedef {Object} ErrorObject
 * @property {string|number} id - Unique error identifier
 * @property {string} timestamp - ISO timestamp when error occurred
 * @property {string} type - Error type (file_operation, validation, network, etc.)
 * @property {string} severity - Error severity (low, medium, high, critical)
 * @property {string} context - Context where error occurred
 * @property {Error} originalError - Original error object
 * @property {string} message - User-friendly error message
 * @property {string} technicalDetails - Technical error details
 * @property {boolean} showToUser - Whether to show this error to the user
 * @property {boolean} dismissed - Whether the error has been dismissed
 * @property {Object} [metadata] - Additional error metadata
 */

/**
 * @typedef {Object} VirtualScrollItem
 * @property {'header'|'item'} type - Type of virtual scroll item
 * @property {string} [group] - Group name (for headers)
 * @property {number} [count] - Item count (for headers)
 * @property {any} [data] - Item data (for items)
 * @property {number} offsetY - Vertical offset in pixels
 * @property {number} height - Height in pixels
 */

/**
 * @typedef {Object} PerformanceOptions
 * @property {number} [maxCacheSize=10] - Maximum cache size for memoization
 * @property {boolean} [deepEqual=false] - Whether to use deep equality checking
 * @property {number} [debounceDelay=300] - Debounce delay in milliseconds
 */

/**
 * @typedef {Object} VirtualScrollOptions
 * @property {import('vue').Ref<any[]>} items - Reactive array of items
 * @property {number} [itemHeight] - Height of each item in pixels
 * @property {number} [containerHeight=400] - Height of scroll container
 * @property {number} [overscan=5] - Number of items to render outside visible area
 */

/**
 * @typedef {Object} ErrorHandlingOptions
 * @property {string} [type] - Error type
 * @property {string} [severity] - Error severity level
 * @property {string} [context] - Error context
 * @property {string} [userMessage] - User-friendly message
 * @property {boolean} [showToUser=true] - Whether to show to user
 * @property {boolean} [logToConsole=true] - Whether to log to console
 */

/**
 * @typedef {Object} AsyncOperationResult
 * @property {boolean} success - Whether operation succeeded
 * @property {any} [data] - Result data (if successful)
 * @property {ErrorObject} [error] - Error object (if failed)
 */

// Export types for IntelliSense (this is a documentation file)
export {}; 