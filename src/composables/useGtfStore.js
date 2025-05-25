import { ref, computed } from 'vue';

// Initial empty state structure
const initialGtfData = () => ({ header: {}, glyphs: [] });

// --- Singleton State ---
// Define state refs *outside* the function to make them shared
const gtfData = ref(initialGtfData());
const currentFilePath = ref(null);
const selectedGlyphName = ref(null);
const currentView = ref(null);
const currentError = ref(null);

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
    console.log('GTF Store: Data updated (Singleton)', {
      filePath,
      view,
      glyphName,
    });
  }

  function newFile() {
    // TODO: Add check for unsaved changes before proceeding
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
      if (field === 'default_palette') {
        const newPalette =
          value && typeof value === 'object' && value.entries
            ? value
            : { entries: {} };
        gtfData.value.header[field] = newPalette;
      } else if (field === 'default_size') {
        const newSize =
          value && typeof value === 'object' && value.width && value.height
            ? value
            : null;
        gtfData.value.header[field] = newSize;
      } else {
        gtfData.value.header[field] =
          typeof value === 'string' && value.trim() === '' ? null : value;
      }
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

    if (action === 'use_default_palette') {
      if (gtfData.value.header.default_palette?.entries) {
        currentGlyph.palette = {
          entries: JSON.parse(
            JSON.stringify(gtfData.value.header.default_palette.entries)
          ),
        };
      } else {
        console.warn(
          'GTF Store: Attempted to apply default palette, but none exists in header. (Singleton)'
        );
      }
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
      currentGlyph.char_repr = value.length > 0 ? value : null;
    } else if (field === 'unicode') {
      currentGlyph.unicode = value.trim() === '' ? null : value;
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
        currentGlyph.char_repr = singleChar;
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
      currentGlyph.name = processedValue;
      selectedGlyphName.value = processedValue; // Update selection ref
    } else if (field === 'size') {
      currentGlyph.size = value;
    } else if (field === 'palette') {
      currentGlyph.palette =
        value && typeof value === 'object' ? value : { entries: {} };
    } else if (field === 'bitmap') {
      if (Array.isArray(value)) {
        currentGlyph.bitmap = value;
      } else {
        console.error('GTF Store: Invalid value received for bitmap update.');
      }
    } else if (field) {
      console.warn(
        `GTF Store: Updating unhandled field '${field}' generically.`
      );
      currentGlyph[field] = value;
    } else {
      console.error(
        `GTF Store: Attempted to update unknown field '${field}' on glyph.`
      );
    }
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
    selectGlyph(newName);
  }

  // Return the shared reactive state and methods
  return {
    gtfData,
    currentFilePath,
    selectedGlyphName,
    currentView,
    currentError,
    selectedGlyphData,
    clearError,
    setGtfData,
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
