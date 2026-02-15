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
   * Syncs local state with backend.
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
      console.error('GTF Store: Refresh failed', err);
    }
  }

  async function addGlyph() {
    if (!gtfData.value) return;
    console.log('GTF Store: Adding new glyph (Singleton)...');

    try {
      const newGlyph = await invoke('add_empty_glyph');
      gtfData.value.glyphs.push(newGlyph);
      markDirty();
      selectGlyph(newGlyph.name);
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
    if (!gtfData.value?.header) return;
    console.log(`GTF Store: Updating header field: ${field}`, value);

    gtfData.value.header[field] = value;

    try {
      if (field === 'default_palette') {
        await invoke('update_default_palette', { new_palette: value });
      } else {
        await invoke('update_header', { new_header: gtfData.value.header });
      }
      markDirty();
    } catch (err) {
      console.error('GTF Store: Header update failed', err);
    }
  }

  async function updateGlyphData({ field, value, action }) {
    if (!gtfData.value || !selectedGlyphName.value) return;

    const glyphIndex = gtfData.value.glyphs.findIndex(
      (g) => g.name === selectedGlyphName.value
    );
    if (glyphIndex === -1) return;

    const oldName = selectedGlyphName.value;

    try {
      if (action === 'use_default_palette') {
        const updated = await invoke('apply_default_palette_to_glyph', { glyph_name: oldName });
        gtfData.value.glyphs[glyphIndex] = updated;
        markDirty();
        return;
      }

      if (field === 'bitmap' && action === 'pixel') {
        const { row, col, char } = value;
        const chars = [...gtfData.value.glyphs[glyphIndex].bitmap[row]];
        chars[col] = char;
        gtfData.value.glyphs[glyphIndex].bitmap[row] = chars.join('');

        await invoke('update_glyph_pixel', { glyph_name: oldName, row, col, new_char: char });
        markDirty();
        return;
      }

      // Atomic field updates for strings (name, unicode, char_repr)
      if (['name', 'unicode', 'char_repr'].includes(field)) {
        const updated = await invoke('update_glyph_field', { glyph_name: oldName, field, value });
        gtfData.value.glyphs[glyphIndex] = updated;
        if (field === 'name') selectedGlyphName.value = value;
        markDirty();
        return;
      }

      // General fallback (update local and sync whole glyph)
      gtfData.value.glyphs[glyphIndex][field] = value;
      await invoke('update_glyph', {
        glyph_name: oldName,
        updated_glyph: JSON.parse(JSON.stringify(gtfData.value.glyphs[glyphIndex]))
      });
      markDirty();
    } catch (err) {
      console.error('GTF Store: Update failed', err);
    }
  }

  async function addGlyphForChar(char) {
    if (!gtfData.value) return;
    console.log(`GTF Store: Adding glyph for char: '${char}' (Singleton)`);

    try {
      const result = await invoke('add_glyph_for_char', { char });

      // Update local state if it's a new glyph
      if (!gtfData.value.glyphs.some(g => g.name === result.name)) {
        gtfData.value.glyphs.push(result);
        markDirty();
      }

      selectGlyph(result.name);
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
