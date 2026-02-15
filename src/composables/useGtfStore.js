import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';

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

  /**
   * @param {any} newData
   * @param {string|null} filePath
   * @param {string} view
   * @param {string|null} glyphName
   */
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

  /**
   * Synchronizuje lokální stav s backendem (Rust).
   * Používáme jen když je to nezbytně nutné (např. po načtení souboru).
   */
  async function refreshFromBackend() {
    try {
      const doc = await invoke('get_current_document');
      const info = await invoke('get_state_info');
      if (doc) {
        gtfData.value = doc;
        currentFilePath.value = info.file_path;
        isDirty.value = info.is_dirty;
      }
    } catch (err) {
      console.error('GTF Store: Failed to refresh from backend', err);
    }
  }

  async function addGlyph() {
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

    // Lokální update pro okamžitou reakci UI
    gtfData.value.glyphs.push(newGlyph);

    // Backend update
    try {
      // Protože nemáme speciální 'add_glyph' v Rustu, použijeme budoucí verzi state syncu
      // Pro teď budeme počítat s tím, že backend state se aktualizuje až při specifických akcích
      // Nebo můžeme volat update_glyph pro tento nový objekt (v Rustu se přidá, pokud neexistuje - upravíme Rust později)
      await invoke('update_glyph', { glyphName: newName, updatedGlyph: newGlyph });
      markDirty();
      selectGlyph(newName);
    } catch (err) {
      console.error('Failed to add glyph to backend', err);
    }
  }

  async function removeGlyph() {
    if (!gtfData.value || !selectedGlyphName.value) return;
    const nameToRemove = selectedGlyphName.value;

    console.log(`GTF Store: Removing glyph ${nameToRemove} (Singleton)`);

    const indexToRemove = gtfData.value.glyphs.findIndex(
      (g) => g.name === nameToRemove
    );

    if (indexToRemove !== -1) {
      // Lokálně
      gtfData.value.glyphs.splice(indexToRemove, 1);

      // Backend
      try {
        await invoke('remove_glyph', { glyphName: nameToRemove });
        markDirty();
        selectHeader();
      } catch (err) {
        console.error('Failed to remove glyph from backend', err);
      }
    } else {
      selectHeader();
    }
  }

  async function updateHeaderData({ field, value }) {
    console.log(
      `GTF Store: Updating header - Field: ${field} (Singleton)`,
      value
    );
    if (gtfData.value && gtfData.value.header) {
      let changed = false;
      const header = gtfData.value.header;

      if (field === 'default_palette') {
        const newPalette =
          value && typeof value === 'object' && value.entries
            ? value
            : { entries: {} };
        if (JSON.stringify(header[field]) !== JSON.stringify(newPalette)) {
          header[field] = newPalette;
          changed = true;
          // Sync do Rustu
          await invoke('update_default_palette', { newPalette });
        }
      } else if (field === 'default_size') {
        const newSize =
          value && typeof value === 'object' && value.width && value.height
            ? value
            : null;
        if (JSON.stringify(header[field]) !== JSON.stringify(newSize)) {
          header[field] = newSize;
          changed = true;
          // Sync do Rustu (přes celou hlavičku, protože nemáme update_size)
          await invoke('update_header', { newHeader: header });
        }
      } else {
        const newValue = typeof value === 'string' && value.trim() === '' ? null : value;
        if (header[field] !== newValue) {
          header[field] = newValue;
          changed = true;
          // Sync do Rustu
          await invoke('update_header', { newHeader: header });
        }
      }

      if (changed) markDirty();
    }
  }

  async function updateGlyphData({ field, value, action }) {
    if (!gtfData.value || !selectedGlyphName.value) return;

    const glyphIndex = gtfData.value.glyphs.findIndex(
      (g) => g.name === selectedGlyphName.value
    );
    if (glyphIndex === -1) return;

    const currentGlyph = gtfData.value.glyphs[glyphIndex];
    const oldName = currentGlyph.name;
    let changed = false;

    // Speciální akce: Paleta
    if (action === 'use_default_palette') {
      if (gtfData.value.header.default_palette?.entries) {
        currentGlyph.palette = {
          entries: JSON.parse(
            JSON.stringify(gtfData.value.header.default_palette.entries)
          ),
        };
        changed = true;
      }
    } else if (field === 'bitmap' && action === 'pixel') {
      // Optimalizovaný update JEDNOHO pixelu (volá Rust update_glyph_pixel)
      const { row, col, char } = value;
      // Lokálně
      const chars = [...currentGlyph.bitmap[row]];
      chars[col] = char;
      currentGlyph.bitmap[row] = chars.join('');
      // V Rustu
      await invoke('update_glyph_pixel', {
        glyphName: oldName,
        row,
        col,
        newChar: char
      });
      changed = true;
    } else {
      // Obecné úpravy polí
      if (field === 'char_repr') {
        currentGlyph.char_repr = value.length > 0 ? value : null;
        changed = true;
      } else if (field === 'unicode') {
        currentGlyph.unicode = value.trim() === '' ? null : value;
        changed = true;
      } else if (field === 'name') {
        currentGlyph.name = value;
        selectedGlyphName.value = value;
        changed = true;
      } else if (field === 'size') {
        currentGlyph.size = value;
        changed = true;
      } else if (field === 'palette') {
        currentGlyph.palette = value;
        changed = true;
      } else if (field === 'bitmap') {
        currentGlyph.bitmap = value;
        changed = true;
      }
    }

    if (changed) {
      // Sync CELÉHO glyfu do Rustu (pokud to nebyl jen pixel update, který už se syncnul)
      if (action !== 'pixel') {
        await invoke('update_glyph', {
          glyphName: oldName,
          updatedGlyph: JSON.parse(JSON.stringify(currentGlyph))
        });
      }
      markDirty();
    }
  }

  async function addGlyphForChar(char) {
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

    // Backend update
    try {
      await invoke('update_glyph', { glyphName: newName, updatedGlyph: newGlyph });
      markDirty();
      selectGlyph(newName);
    } catch (err) {
      console.error('Failed to add glyph for char to backend', err);
    }
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
    refreshFromBackend,
    addGlyphForChar,
  };
}
