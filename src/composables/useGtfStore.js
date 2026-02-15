import { ref, computed } from 'vue';

// --- Type Definitions ---
/**
 * @typedef {Object} Glyph
 * @property {string} name
 * @property {string|null} unicode
 * @property {string|null} char_repr
 * @property {Object} size
 * @property {Object} palette
 * @property {Array} bitmap
 * @property {string|null} validation_warnings
 */

/**
 * @typedef {Object} GtfData
 * @property {Object} header
 * @property {Glyph[]} glyphs
 */

// Initial empty state structure
const initialGtfData = () => (/** @type {GtfData} */ ({ header: {}, glyphs: [] }));

// --- Singleton State ---
// Define state refs *outside* the function to make them shared
const gtfData = ref(initialGtfData());
const currentFilePath = /** @type {import('vue').Ref<string|null>} */ (ref(null));
const selectedGlyphName = /** @type {import('vue').Ref<string|null>} */ (ref(null));
const currentView = /** @type {import('vue').Ref<string|null>} */ (ref(null));
const currentError = /** @type {import('vue').Ref<string|null>} */ (ref(null));
const isDirty = ref(false); // Track unsaved changes

// --- Shared Computed Property ---
const selectedGlyphData = computed(() => {
  if (!gtfData.value || !selectedGlyphName.value) {
    return null;
  }
  return (
    gtfData.value.glyphs.find((g) => g.name === selectedGlyphName.value) || null
  );
});

// --- Exported Composable Function ---
export function useGtfStore() {
  // --- Methods (operate on the shared state) ---

  function clearError() {
    currentError.value = null;
  }

  function setGtfData(
    newData,
    filePath = null,
    view = 'header',
    glyphName = null
  ) {
    // Ensure we handle potential null newData
    gtfData.value = newData || initialGtfData();
    currentFilePath.value = filePath;
    currentView.value = view;
    selectedGlyphName.value = glyphName;
    currentError.value = null; // Clear errors on successful load/new
    isDirty.value = false; // Reset dirty flag on load/new
    console.log('GTF Store: Data updated (Singleton)', {
      filePath,
      view,
      glyphName,
      isDirty: isDirty.value
    });
  }

  function markSaved() {
    isDirty.value = false;
    console.log('GTF Store: Marked as saved (Singleton)');
  }

  function markDirty() {
    if (!isDirty.value) {
      isDirty.value = true;
      console.log('GTF Store: Marked as dirty (Singleton)');
    }
  }

  function newFile() {
    // Check for unsaved changes is handled by the caller (e.g. useFileOperations)
    console.log('GTF Store: Creating new file (Singleton)...');
    setGtfData(initialGtfData(), null, 'header', null);
  }

  function selectGlyph(glyphName) {
    selectedGlyphName.value = glyphName;
    currentView.value = 'glyph'; // Switch view to glyph editor
    console.log('GTF Store: Selected glyph (Singleton)', glyphName);
  }

  function selectHeader() {
    selectedGlyphName.value = null; // Deselect any glyph
    currentView.value = 'header'; // Switch view to header editor
    console.log('GTF Store: Selected header (Singleton)');
  }

  function addGlyph() {
    if (!gtfData.value) return;
    console.log('GTF Store: Adding new glyph (Singleton)...');

    let newName = 'NewGlyph';
    let counter = 1;
    const existingNames = new Set(gtfData.value.glyphs.map((g) => g.name));
    while (existingNames.has(newName + counter)) {
      counter++;
    }
    newName = newName + counter;

    const initialSize = gtfData.value?.header?.default_size
      ? { ...gtfData.value.header.default_size }
      : { width: 5, height: 7 };

    const initialBitmap = Array(initialSize.height).fill(
      '.'.repeat(initialSize.width)
    );

    const initialPalette =
      gtfData.value?.header?.default_palette?.entries &&
        Object.keys(gtfData.value.header.default_palette.entries).length > 0
        ? {
          entries: JSON.parse(
            JSON.stringify(gtfData.value.header.default_palette.entries)
          ),
        }
        : { entries: {} };

    const newGlyph = {
      name: newName,
      unicode: null,
      char_repr: null,
      size: initialSize,
      palette: initialPalette,
      bitmap: initialBitmap,
      validation_warnings: null,
    };

    gtfData.value.glyphs.push(newGlyph);
    console.log(`GTF Store: Added glyph: ${newName} (Singleton)`);
    markDirty();
    selectGlyph(newName); // Select the new glyph (triggers view change)
  }

  function removeGlyph() {
    if (!gtfData.value || !selectedGlyphName.value) return;
    console.log(
      `GTF Store: Removing glyph ${selectedGlyphName.value} (Singleton)`
    );

    const indexToRemove = gtfData.value.glyphs.findIndex(
      (g) => g.name === selectedGlyphName.value
    );

    if (indexToRemove !== -1) {
      const removedName = gtfData.value.glyphs[indexToRemove].name;
      gtfData.value.glyphs.splice(indexToRemove, 1);
      console.log(`GTF Store: Removed glyph: ${removedName} (Singleton)`);
      markDirty();
      selectHeader();
    } else {
      console.warn(
        `GTF Store: Could not find glyph '${selectedGlyphName.value}' to remove. (Singleton)`
      );
      selectHeader();
    }
  }

  function updateHeaderData({ field, value }) {
    console.log(
      `GTF Store: Updating header - Field: ${field} (Singleton)`,
      value
    );
    if (gtfData.value && gtfData.value.header) {
      let changed = false;
      if (field === 'default_palette') {
        const newPalette =
          value && typeof value === 'object' && value.entries
            ? value
            : { entries: {} };
        // Simple equality check (shallow) - heavily simplified for object
        if (JSON.stringify(gtfData.value.header[field]) !== JSON.stringify(newPalette)) {
          gtfData.value.header[field] = newPalette;
          changed = true;
        }
      } else if (field === 'default_size') {
        const newSize =
          value && typeof value === 'object' && value.width && value.height
            ? value
            : null;
        if (JSON.stringify(gtfData.value.header[field]) !== JSON.stringify(newSize)) {
          gtfData.value.header[field] = newSize;
          changed = true;
        }
      } else {
        const newValue = typeof value === 'string' && value.trim() === '' ? null : value;
        if (gtfData.value.header[field] !== newValue) {
          gtfData.value.header[field] = newValue;
          changed = true;
        }
      }

      if (changed) markDirty();

    } else {
      console.warn(
        'GTF Store: Attempted to update header data, but gtfData or header is null. (Singleton)'
      );
    }
  }

  function updateGlyphData({ field, value, action }) {
    if (!gtfData.value || !selectedGlyphName.value) return;
    console.log(
      `GTF Store: Updating glyph ${selectedGlyphName.value} - Field: ${field}, Action: ${action} (Singleton)`,
      value
    );

    const glyphIndex = gtfData.value.glyphs.findIndex(
      (g) => g.name === selectedGlyphName.value
    );
    if (glyphIndex === -1) return;

    const currentGlyph = gtfData.value.glyphs[glyphIndex];
    let changed = false;

    if (action === 'use_default_palette') {
      if (gtfData.value.header.default_palette?.entries) {
        currentGlyph.palette = {
          entries: JSON.parse(
            JSON.stringify(gtfData.value.header.default_palette.entries)
          ),
        };
        changed = true;
      } else {
        console.warn(
          'GTF Store: Attempted to apply default palette, but none exists in header. (Singleton)'
        );
      }
      if (changed) markDirty();
      return;
    }

    if (field === 'char_repr') {
      const canAutoPopulate =
        value && value.length > 0 && !currentGlyph.unicode;
      if (canAutoPopulate) {
        try {
          const codePoint = value.codePointAt(0);
          if (codePoint !== undefined) {
            currentGlyph.unicode = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
          }
        } catch (e) {
          console.error('GTF Store: Error getting code point:', e);
        }
      }
      if (currentGlyph.char_repr !== (value.length > 0 ? value : null)) {
        currentGlyph.char_repr = value.length > 0 ? value : null;
        changed = true;
      }
    } else if (field === 'unicode') {
      const newValue = value.trim() === '' ? null : value;
      if (currentGlyph.unicode !== newValue) {
        currentGlyph.unicode = newValue;
        changed = true;
      }
    } else if (field === 'name') {
      const processedValue = value.trim() === '' ? null : value;
      if (processedValue === null) {
        console.error('GTF Store: Glyph name cannot be empty.');
        return;
      }
      // TODO: Add validation here to prevent duplicate names before assigning!

      // Auto-populate if name is single char
      if (processedValue.length === 1) {
        const singleChar = processedValue;
        if (currentGlyph.char_repr !== singleChar) {
          currentGlyph.char_repr = singleChar;
          changed = true;
        }
        if (!currentGlyph.unicode) {
          try {
            const codePoint = singleChar.codePointAt(0);
            if (codePoint !== undefined) {
              currentGlyph.unicode = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
            }
          } catch (e) {
            console.error(
              'GTF Store: Error getting code point for auto-unicode from name:',
              e
            );
          }
        }
      }
      if (currentGlyph.name !== processedValue) {
        currentGlyph.name = processedValue;
        selectedGlyphName.value = processedValue; // Update selection ref
        changed = true;
      }
    } else if (field === 'size') {
      // Deep compare for object
      if (JSON.stringify(currentGlyph.size) !== JSON.stringify(value)) {
        currentGlyph.size = value;
        changed = true;
      }
    } else if (field === 'palette') {
      const newValue = value && typeof value === 'object' ? value : { entries: {} };
      if (JSON.stringify(currentGlyph.palette) !== JSON.stringify(newValue)) {
        currentGlyph.palette = newValue;
        changed = true;
      }
    } else if (field === 'bitmap') {
      if (Array.isArray(value)) {
        // Simple array check - comparing contents might be expensive every pixel change, 
        // but we assume if this fn is called, a change happened in UI.
        // For performance in pixel editor, we might relax "changed" check or assume true.
        currentGlyph.bitmap = value;
        changed = true;
      } else {
        console.error('GTF Store: Invalid value received for bitmap update.');
      }
    } else if (field) {
      console.warn(
        `GTF Store: Updating unhandled field '${field}' generically.`
      );
      if (currentGlyph[field] !== value) {
        currentGlyph[field] = value;
        changed = true;
      }
    } else {
      console.error(
        `GTF Store: Attempted to update unknown field '${field}' on glyph.`
      );
    }

    if (changed) markDirty();
  }

  function addGlyphForChar(char) {
    if (!gtfData.value) return;
    console.log(
      `GTF Store: Attempting to add glyph for char: '${char}' (Singleton)`
    );

    if (gtfData.value.glyphs.some((g) => g.char_repr === char)) {
      console.warn(
        `GTF Store: Glyph with char_repr '${char}' already exists. (Singleton)`
      );
      const existingGlyph = gtfData.value.glyphs.find(
        (g) => g.char_repr === char
      );
      if (existingGlyph) {
        selectGlyph(existingGlyph.name);
      }
      return;
    }

    const baseName = char.match(/[a-zA-Z0-9]/) ? char : 'Glyph';
    let newName = baseName;
    let counter = 1;
    const existingNames = new Set(gtfData.value.glyphs.map((g) => g.name));
    if (existingNames.has(newName)) {
      newName = baseName + counter;
      while (existingNames.has(newName)) {
        counter++;
        newName = baseName + counter;
      }
    }
    while (existingNames.has(newName)) {
      counter++;
      newName = baseName + counter;
    }

    const initialSize = gtfData.value?.header?.default_size
      ? { ...gtfData.value.header.default_size }
      : { width: 5, height: 7 };

    const initialBitmap = Array(initialSize.height).fill(
      '.'.repeat(initialSize.width)
    );

    const initialPalette =
      gtfData.value?.header?.default_palette?.entries &&
        Object.keys(gtfData.value.header.default_palette.entries).length > 0
        ? {
          entries: JSON.parse(
            JSON.stringify(gtfData.value.header.default_palette.entries)
          ),
        }
        : { entries: {} };

    const newGlyph = {
      name: newName,
      unicode: null, // Will be auto-populated by updateGlyphData if char_repr triggers it
      char_repr: char,
      size: initialSize,
      palette: initialPalette,
      bitmap: initialBitmap,
      validation_warnings: null,
    };

    // Auto-populate unicode right away if possible
    if (!newGlyph.unicode && newGlyph.char_repr) {
      try {
        const codePoint = newGlyph.char_repr.codePointAt(0);
        if (codePoint !== undefined) {
          newGlyph.unicode = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
        }
      } catch (e) {
        console.error('GTF Store: Error getting code point for new char:', e);
      }
    }

    gtfData.value.glyphs.push(newGlyph);
    console.log(
      `GTF Store: Added specific glyph '${newName}' for char '${char}' (Singleton)`
    );
    markDirty();
    selectGlyph(newName);
  }

  // Return the shared reactive state and methods
  return {
    gtfData,
    currentFilePath,
    selectedGlyphName,
    currentView,
    currentError,
    isDirty,
    selectedGlyphData,
    clearError,
    setGtfData,
    markSaved,
    newFile,
    selectGlyph,
    selectHeader,
    addGlyph,
    removeGlyph,
    updateHeaderData,
    updateGlyphData,
    addGlyphForChar,
  };
}
