<script setup>
import { ref, computed, watch, nextTick } from "vue";
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';
import GlyphPreviewBar from './components/GlyphPreviewBar.vue';
import GlyphPreview from './components/GlyphPreview.vue';
import LanguageCheckDialog from './components/LanguageCheckDialog.vue';
import FileOperations from './components/FileOperations.vue';
import UIDemoPage from './components/UIDemoPage.vue';
import AppSidebar from './components/AppSidebar.vue'; // <-- Import AppSidebar
// Import Tauri API functions
// import { invoke } from "@tauri-apps/api/core";
// Import from the specific dialog plugin
// import { open, save } from "@tauri-apps/plugin-dialog";
// import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs'; // Remove unused fs import for now

const currentView = ref(null); // Possible values: null, 'header', 'glyph'
const gtfData = ref(null); // Holds the parsed GTF document { header: {}, glyphs: [] }
const currentError = ref(null); // Holds error messages
const selectedGlyphName = ref(null); // Holds the name of the selected glyph
const currentFilePath = ref(null); // Holds the path of the currently open file
const languageDialogVisible = ref(false); // State for dialog visibility
const isDarkMode = ref(true); // Theme state
const glyphEditorRef = ref(null); // <-- Add ref for GlyphEditor

// --- NEW: State for sidebar view mode ---
const isSimplePreviewMode = ref(true); // false = grouped list, true = simple preview grid

// --- Character Sets Data ---
// Define common character sets
const commonLowercase = 'abcdefghijklmnopqrstuvwxyz';
const commonUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const commonDigits = '0123456789';
const commonPunctuation = '!"#$%&\'()*+,-./:;<=>?@[\]^_`{|}~ '; // Includes space
const allCommon = commonLowercase + commonUppercase + commonDigits + commonPunctuation;

const languageCharacterSets = {
  Czech: 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ' + allCommon,
  Slovak: 'áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ' + allCommon,
  Romanian: 'ăâîșțĂÂÎȘȚ' + allCommon,
  Hungarian: 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ' + allCommon,
  Estonian: 'äõöüšžÄÕÖÜŠŽ' + allCommon,
  // Add a set containing only the common characters
  "Basic Latin + Digits": allCommon
};

// --- Computed Properties ---

// Finds the data for the currently selected glyph
const selectedGlyphData = computed(() => {
  if (!gtfData.value || !selectedGlyphName.value) {
    return null;
  }
  return gtfData.value.glyphs.find(g => g.name === selectedGlyphName.value) || null;
});

// Process default palette once for passing down
const processedDefaultPalette = computed(() => {
    return gtfData.value?.header?.default_palette?.entries 
           ? Object.entries(gtfData.value.header.default_palette.entries).map(([char, color]) => ({char, color})) 
           : [];
});

// --- NEW: Computed property for sorted glyphs ---
const sortedGlyphs = computed(() => {
  if (!gtfData.value || !gtfData.value.glyphs) {
    return [];
  }

  // Helper function to parse Unicode string (U+XXXX) to number, returns Infinity for invalid/null
  const parseUnicode = (unicodeStr) => {
    if (!unicodeStr || !unicodeStr.startsWith('U+')) {
      return Infinity; // Treat invalid/missing as largest value to sort to end
    }
    try {
      // Use base 16 for hexadecimal parsing
      return parseInt(unicodeStr.substring(2), 16); 
    } catch (e) {
      console.warn(`Error parsing unicode: ${unicodeStr}`, e);
      return Infinity; // Treat parsing errors as largest value
    }
  };

  // Create a copy to avoid sorting the original array directly
  return [...gtfData.value.glyphs].sort((a, b) => {
    const codePointA = parseUnicode(a.unicode);
    const codePointB = parseUnicode(b.unicode);

    // Simple numerical comparison (Infinity will automatically go to the end)
    return codePointA - codePointB;

    /* // Old sorting by char_repr:
    const charA = a.char_repr;
    const charB = b.char_repr;
    if (!charA && charB) return 1;
    if (charA && !charB) return -1;
    if (!charA && !charB) return 0;
    return String(charA).localeCompare(String(charB));
    */
  }); // End of sort
}); // End of computed

// --- NEW: Computed property for GROUPED glyphs ---
const groupedGlyphs = computed(() => {
  if (!gtfData.value || !gtfData.value.glyphs) {
    return [];
  }

  // --- Group Definitions & Helper --- 
  const groups = {
    Uppercase: [],
    Lowercase: [],
    Digits: [],
    PunctuationSymbols: [], // Basic ASCII Punct/Symbols
    LanguageSpecific: [],
    Other: [], // Other assigned unicode points
    Undefined: [] // Missing or invalid unicode
  };
  // Define order
  const groupOrder = ['Uppercase', 'Lowercase', 'Digits', 'PunctuationSymbols', 'LanguageSpecific', 'Other', 'Undefined'];

  // Helper to check language sets (excluding common chars)
  const languageChars = Object.values(languageCharacterSets)
                             .filter(set => set !== allCommon) // Exclude the basic set
                             .join('')
                             .replace(new RegExp(`[${allCommon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), ''); // Remove common
  const languageCharsSet = new Set(languageChars);

  const parseUnicode = (unicodeStr) => {
    if (!unicodeStr || !unicodeStr.startsWith('U+')) return null;
    try { return parseInt(unicodeStr.substring(2), 16); } catch (e) { return null; }
  };

  // --- Categorize Glyphs --- 
  for (const glyph of sortedGlyphs.value) { // Use already sorted glyphs
    const codePoint = parseUnicode(glyph.unicode);
    const char = glyph.char_repr;

    if (codePoint === null) {
      groups.Undefined.push(glyph);
    } else if (codePoint >= 0x41 && codePoint <= 0x5A) { // Basic Latin Uppercase
      groups.Uppercase.push(glyph);
    } else if (codePoint >= 0x61 && codePoint <= 0x7A) { // Basic Latin Lowercase
      groups.Lowercase.push(glyph);
    } else if (codePoint >= 0x30 && codePoint <= 0x39) { // Digits
      groups.Digits.push(glyph);
    } else if (
      (codePoint >= 0x20 && codePoint <= 0x2F) || // Space to /
      (codePoint >= 0x3A && codePoint <= 0x40) || // : to @
      (codePoint >= 0x5B && codePoint <= 0x60) || // [ to `
      (codePoint >= 0x7B && codePoint <= 0x7E)    // { to ~
    ) {
      groups.PunctuationSymbols.push(glyph);
    } else if (char && languageCharsSet.has(char)) { // Check char_repr against specific lang chars
        groups.LanguageSpecific.push(glyph);
    } else {
        // If it has a valid code point but didn't fit above, put in Other
        // This might include Latin Extended, other symbols etc.
        groups.Other.push(glyph);
    }
  }

  // --- Format Output --- 
  const result = groupOrder
    .map(name => ({ name: name.replace(/([A-Z])/g, ' $1').trim(), glyphs: groups[name] })) // Add spaces to name
    .filter(group => group.glyphs.length > 0); // Only include non-empty groups
  
  return result;
});

// --- Watchers ---

// Removed window title watcher
// watch(currentFilePath, ...) 

// --- Functions ---

// Function to start a new, empty document
function newFile() {
   // TODO: Add check for unsaved changes before proceeding
   // Example: if (hasUnsavedChanges() && !confirm("Discard unsaved changes?")) return;
   console.log("Creating new file...");
   gtfData.value = { header: {}, glyphs: [] }; // Reset data to empty structure
   currentFilePath.value = null; // Clear file path
   selectedGlyphName.value = null;
   currentView.value = 'header'; // Start at header
   currentError.value = null;
}

// Function to handle selecting a glyph from the list
function selectGlyph(glyphName) {
  selectedGlyphName.value = glyphName;
  currentView.value = 'glyph'; // Switch view to glyph editor
}

// Function to handle selecting the header
function selectHeader() {
  selectedGlyphName.value = null; // Deselect any glyph
  currentView.value = 'header'; // Switch view to header editor
}

// Function to add a new glyph
function addGlyph() {
  if (!gtfData.value) return; // Need existing data structure

  // Find a unique default name
  let newName = 'NewGlyph';
  let counter = 1;
  const existingNames = new Set(gtfData.value.glyphs.map(g => g.name));
  while (existingNames.has(newName + counter)) {
      counter++;
  }
  newName = newName + counter;

  // Determine initial size
  const initialSize = gtfData.value?.header?.default_size 
                      ? { ...gtfData.value.header.default_size } 
                      : { width: 5, height: 7 }; 
  
  // Generate initial bitmap based on size
  const initialBitmap = Array(initialSize.height).fill('.'.repeat(initialSize.width));

  // --- Determine initial palette --- 
  // Use a deep copy of the header's default palette if it exists, otherwise empty.
  const initialPalette = (gtfData.value?.header?.default_palette?.entries && 
                         Object.keys(gtfData.value.header.default_palette.entries).length > 0) 
                      ? { entries: JSON.parse(JSON.stringify(gtfData.value.header.default_palette.entries)) }
                      : { entries: {} };
  console.log("Initial palette for new glyph:", initialPalette);

  // Create a default glyph structure
  const newGlyph = {
      name: newName,
      unicode: null,
      char_repr: null,
      size: initialSize, 
      palette: initialPalette, // Use determined initial palette
      bitmap: initialBitmap, 
      validation_warnings: null
  };

  gtfData.value.glyphs.push(newGlyph);
  console.log(`Added glyph: ${newName} with size ${initialSize.width}x${initialSize.height}`);

  // Automatically select the new glyph
  selectGlyph(newName);

  // Scroll to the editor after the DOM updates
  nextTick(() => {
    if (glyphEditorRef.value?.$el) {
      // Scroll the GlyphEditor component itself into view
      glyphEditorRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }
  });
}

// Function to remove the selected glyph
function removeGlyph() {
  if (!gtfData.value || !selectedGlyphName.value) return; // Need data and selection

  // Optional: Add confirmation dialog here later
  // if (!confirm(`Are you sure you want to delete glyph '${selectedGlyphName.value}'?`)) {
  //    return;
  // }

  const indexToRemove = gtfData.value.glyphs.findIndex(g => g.name === selectedGlyphName.value);

  if (indexToRemove !== -1) {
      const removedName = gtfData.value.glyphs[indexToRemove].name;
      gtfData.value.glyphs.splice(indexToRemove, 1);
      console.log(`Removed glyph: ${removedName}`);

      // Deselect and switch view back to header
      selectHeader(); 
  } else {
      console.warn(`Could not find glyph '${selectedGlyphName.value}' to remove.`);
      // Clear selection just in case
      selectHeader(); 
  }
}

// Function to update header data based on emitted event
function updateHeaderData({ field, value }) {
  console.log(`updateHeaderData called for field: ${field} with value:`, value);
  if (gtfData.value && gtfData.value.header) {
      if (field === 'default_palette') {
          // Ensure the value is a valid palette object or null/default
          const newPalette = value && typeof value === 'object' && value.entries ? value : { entries: {} };
          gtfData.value.header[field] = newPalette; 
          console.log("Updated header default_palette:", gtfData.value.header.default_palette);
      } else if (field === 'default_size') {
          // Value should be { width, height } or null
          const newSize = value && typeof value === 'object' && value.width && value.height ? value : null;
          gtfData.value.header[field] = newSize;
          console.log("Updated header default_size:", gtfData.value.header.default_size);
      } else {
          // Handle other header fields (FONT, VERSION, etc.)
          // Handle empty string input: set corresponding field to null
          gtfData.value.header[field] = (typeof value === 'string' && value.trim() === '') ? null : value;
          console.log(`Updated header field '${field}':`, gtfData.value.header[field]);
      }
  } else {
    console.warn("Attempted to update header data, but gtfData or header is null.");
  }
}

// Function to update glyph data based on emitted event
function updateGlyphData({ field, value, action }) {
  if (!gtfData.value || !selectedGlyphName.value) {
    console.warn("Attempted to update glyph data, but gtfData or selectedGlyphName is null.");
    return;
  }
  
  const glyphIndex = gtfData.value.glyphs.findIndex(g => g.name === selectedGlyphName.value);
  
  if (glyphIndex === -1) {
     console.warn(`Attempted to update glyph data, but glyph with name '${selectedGlyphName.value}' not found.`);
     return;
  }

  // Get a reference to the current glyph data for easier access
  const currentGlyph = gtfData.value.glyphs[glyphIndex];

  // Handle specific actions first
  if (action === 'use_default_palette') {
    if (gtfData.value.header.default_palette && gtfData.value.header.default_palette.entries) {
       console.log("Applying default palette to glyph:", currentGlyph.name);
       // Deep copy entries to avoid reactivity issues
       currentGlyph.palette = { 
           entries: JSON.parse(JSON.stringify(gtfData.value.header.default_palette.entries))
       };
       // No need to update other fields here
       return; 
    } else {
        console.warn("Attempted to apply default palette, but none exists in header.");
        return;
    }
  }

  // Handle field updates
  if (field === 'char_repr') {
      const fullCharValue = value; 
      console.log(`[updateGlyphData] Received char_repr update: "${fullCharValue}"`); // Log received value

      // --- Auto-populate Unicode --- 
      console.log(`[updateGlyphData] Checking auto-populate. Current unicode: "${currentGlyph.unicode}"`); // Log current unicode
      const canAutoPopulate = fullCharValue && fullCharValue.length > 0 && (currentGlyph.unicode === null || currentGlyph.unicode === '');
      console.log(`[updateGlyphData] Can auto-populate unicode? ${canAutoPopulate}`); // Log condition result

      if (canAutoPopulate) {
          try {
              const codePoint = fullCharValue.codePointAt(0);
              if (codePoint !== undefined) {
                  const unicodeString = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
                  console.log(`[updateGlyphData] Calculated unicode: ${unicodeString}`); // Log calculated value
                  currentGlyph.unicode = unicodeString; 
                  console.log(`[updateGlyphData] Assigned unicode to data: ${currentGlyph.unicode}`); // Log after assignment
              } else {
                  console.log('[updateGlyphData] codePointAt(0) returned undefined.');
              }
          } catch (e) {
              console.error("[updateGlyphData] Error getting code point:", e);
          }
      }
      // --- End Auto-populate Unicode ---

      currentGlyph.char_repr = fullCharValue.length > 0 ? fullCharValue : null;
      console.log(`[updateGlyphData] Assigned char_repr to data: "${currentGlyph.char_repr}"`);
      console.log("[updateGlyphData] Final glyph data after char_repr update:", JSON.parse(JSON.stringify(currentGlyph))); // Log final state
      return; 

  } else if (field === 'unicode') {
      // For optional string fields like unicode, set to null if empty string is entered
      currentGlyph.unicode = value.trim() === '' ? null : value;
      console.log(`Updated glyph field 'unicode':`, currentGlyph.unicode);
      return; // Handled update, return early
      
  } else if (field === 'name') {
      const processedValue = value.trim() === '' ? null : value;
      if (processedValue === null) {
          console.error("Glyph name cannot be empty.");
          return; // Don't update if name is empty
      }
      // TODO: Add validation here to prevent duplicate names before assigning!
      // Example (needs refinement):
      // const existingNames = new Set(gtfData.value.glyphs.filter(g => g !== currentGlyph).map(g => g.name));
      // if (existingNames.has(processedValue)) {
      //    console.error(`Glyph name "${processedValue}" already exists.`);
      //    // Maybe set an error state for the UI?
      //    return; 
      // }

      // --- NEW: Auto-populate char_repr and unicode if name is single char ---
      if (processedValue.length === 1) {
          const singleChar = processedValue;
          console.log(`Name is single char '${singleChar}'. Updating char_repr.`);
          currentGlyph.char_repr = singleChar;

          // Auto-populate unicode only if it's currently empty
          if (currentGlyph.unicode === null || currentGlyph.unicode === '') {
              try {
                  const codePoint = singleChar.codePointAt(0);
                  if (codePoint !== undefined) {
                      const unicodeString = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
                      console.log(`Auto-populating Unicode from name '${singleChar}' with ${unicodeString}`);
                      currentGlyph.unicode = unicodeString;
                  }
              } catch (e) {
                  console.error("Error getting code point for auto-unicode from name:", e);
              }
          }
      }
      // --- End auto-populate ---

      currentGlyph.name = processedValue;
      // Update the selection ref if the name changed
      selectedGlyphName.value = processedValue;
      console.log(`Updated glyph field 'name':`, currentGlyph.name);
      console.log("[updateGlyphData] Final glyph data after name update:", JSON.parse(JSON.stringify(currentGlyph)));
      return; // Handled update, return early

  } else if (field === 'size') {
     currentGlyph.size = value; // Value should be { width, height } or null
     console.log(`Updated glyph field 'size':`, currentGlyph.size);
     return; // Handled update, return early

  } else if (field === 'palette') {
    // Handles updates from add/remove palette entries
    const processedValue = value && typeof value === 'object' ? value : { entries: {} };
    currentGlyph.palette = processedValue;
    console.log(`Updated glyph field 'palette':`, currentGlyph.palette);
    return; // Handled update, return early

  } else if (field === 'bitmap') {
     if (Array.isArray(value)) {
       currentGlyph.bitmap = value;
       console.log(`Updated glyph field 'bitmap':`, currentGlyph.bitmap);
     } else {
       console.error("Invalid value received for bitmap update, expected array.");
     }
     return; // Handled update, return early
  }

  // Fallback for any other fields (shouldn't normally happen with current structure)
  if (field in currentGlyph) {
      console.warn(`Updating unhandled field '${field}' generically.`);
      currentGlyph[field] = value; 
  } else {
      console.error(`Attempted to update unknown field '${field}' on glyph.`);
  }
}

// Function to add a glyph for a specific character
function addSpecificGlyph(char) {
  if (!gtfData.value || !char || char.length !== 1) {
      console.error("Cannot add specific glyph: Invalid input.", {gtfData: !!gtfData.value, char});
      return;
  }
  if (gtfData.value.glyphs.some(g => g.char_repr === char)) {
      console.warn(`Glyph for character '${char}' already exists.`);
      alert(`Glyph for character '${char}' already exists.`);
      selectGlyph(gtfData.value.glyphs.find(g => g.char_repr === char).name); // Select existing
      return;
  }

  // Generate name: Use the character itself as the base name
  let baseName = String(char); // Use the character
  let newName = baseName;
  let counter = 1;
  const existingNames = new Set(gtfData.value.glyphs.map(g => g.name));
  // Ensure the name is unique
  while (existingNames.has(newName)) {
      newName = `${baseName}_${counter}`;
      counter++;
  }

  // Calculate Unicode
  let unicodeString = null;
  try {
      const codePoint = char.codePointAt(0);
      if (codePoint !== undefined) {
          unicodeString = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
      }
  } catch (e) { console.error("Error getting code point:", e); }

  // Determine initial size
  const initialSize = gtfData.value?.header?.default_size 
                      ? { ...gtfData.value.header.default_size } 
                      : { width: 5, height: 7 }; 
  
  const initialBitmap = Array(initialSize.height).fill('.'.repeat(initialSize.width));

  // Determine initial palette
  const initialPalette = (gtfData.value?.header?.default_palette?.entries && 
                         Object.keys(gtfData.value.header.default_palette.entries).length > 0) 
                      ? { entries: JSON.parse(JSON.stringify(gtfData.value.header.default_palette.entries)) }
                      : { entries: {} };

  const newGlyph = {
      name: newName, // Use the new unique name (char or char_counter)
      unicode: unicodeString,
      char_repr: char,
      size: initialSize, 
      palette: initialPalette, 
      bitmap: initialBitmap,
      validation_warnings: null
  };

  gtfData.value.glyphs.push(newGlyph);
  console.log(`Added specific glyph '${newName}' for character '${char}' with data:`, JSON.parse(JSON.stringify(newGlyph))); // Log added glyph data

  // Select the new glyph
  selectGlyph(newName);
  languageDialogVisible.value = false; 
}

// Placeholder for the currently selected glyph ID/name
// const selectedGlyph = ref(null);

// TODO: Function to change view based on selected glyph

// --- NEW: Method to toggle sidebar view ---
function toggleSidebarView() {
  isSimplePreviewMode.value = !isSimplePreviewMode.value;
}

// --- Re-add function to navigate to UIDemoPage ---
function navigateToUIDemoPage() {
  currentView.value = 'ui-demo'; // Set the current view
  selectedGlyphName.value = null; // Deselect any glyph
}

// Function to add a new glyph (potentially triggered by language check)
function addGlyphForChar(char) {
  console.log(`Attempting to add glyph for character: '${char}'`);
  if (!gtfData.value) return; // Need existing data structure

  // Check if a glyph with this char_repr already exists
  if (gtfData.value.glyphs.some(g => g.char_repr === char)) {
    console.warn(`Glyph with char_repr '${char}' already exists. Cannot add duplicate.`);
    // Optionally, select the existing glyph instead?
    const existingGlyph = gtfData.value.glyphs.find(g => g.char_repr === char);
    if (existingGlyph) {
        selectGlyph(existingGlyph.name);
        languageDialogVisible.value = false; // Close dialog
    }
    return; 
  }

  // Find a unique default name (consider using the char itself if valid)
  let baseName = char.match(/[a-zA-Z0-9]/) ? char : 'Glyph'; // Use char if simple, else default
  let newName = baseName;
  let counter = 1;
  const existingNames = new Set(gtfData.value.glyphs.map(g => g.name));
  // Ensure base name is unique first
  if (existingNames.has(newName)) {
      newName = baseName + counter;
      while (existingNames.has(newName)) {
          counter++;
          newName = baseName + counter;
      }
  } 
  // Check again in case baseName + counter also exists from a previous loop
  while (existingNames.has(newName)) { 
      counter++;
      newName = baseName + counter;
  }

  // Determine initial size
  const initialSize = gtfData.value?.header?.default_size 
                      ? { ...gtfData.value.header.default_size } 
                      : { width: 5, height: 7 }; 
  
  const initialBitmap = Array(initialSize.height).fill('.'.repeat(initialSize.width));

  // Determine initial palette
  const initialPalette = (gtfData.value?.header?.default_palette?.entries && 
                         Object.keys(gtfData.value.header.default_palette.entries).length > 0) 
                      ? { entries: JSON.parse(JSON.stringify(gtfData.value.header.default_palette.entries)) }
                      : { entries: {} };

  const newGlyph = {
      name: newName, // Use the new unique name (char or char_counter)
      unicode: null,
      char_repr: char,
      size: initialSize, 
      palette: initialPalette, 
      bitmap: initialBitmap,
      validation_warnings: null
  };

  gtfData.value.glyphs.push(newGlyph);
  console.log(`Added specific glyph '${newName}' for character '${char}' with data:`, JSON.parse(JSON.stringify(newGlyph))); // Log added glyph data

  // Select the new glyph
  selectGlyph(newName);
  languageDialogVisible.value = false; // Close the dialog after adding

  // Scroll to the editor after the DOM updates
  nextTick(() => {
    if (glyphEditorRef.value?.$el) {
      // Scroll the GlyphEditor component itself into view
      glyphEditorRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }
  });
}

// NEW: Function to handle editing a glyph triggered by language check
function handleEditGlyph(glyphName) {
    console.log(`Language Check: Selecting glyph '${glyphName}'`);
    selectGlyph(glyphName); // Select the glyph
    languageDialogVisible.value = false; // Close the dialog
}

// --- Tauri Integration ---

// Function to load file using Tauri dialog

// Function to save file using Tauri dialog

</script>

<template>
  <v-app id="inspire" :theme="isDarkMode ? 'dark' : 'light'">
    <v-app-bar :theme="isDarkMode ? 'dark' : 'light'">
      <v-app-bar-title>
        GTF Editor 
        {{ gtfData?.header?.font_name ? `- ${gtfData.header.font_name}` : '' }}
        {{ currentFilePath ? ` (${currentFilePath.split('/').pop().split('\\').pop()})` : '(New File)' }}
      </v-app-bar-title>

      <v-btn prepend-icon="mdi-file-outline" @click="newFile">
        New File
      </v-btn>
      <FileOperations
        :gtf-data="gtfData"
        :current-file-path="currentFilePath"
        @update:gtfData="gtfData = $event"
        @update:currentFilePath="currentFilePath = $event"
        @update:currentView="currentView = $event"
        @update:selectedGlyphName="selectedGlyphName = $event"
      />
      <v-btn 
        prepend-icon="mdi-translate" 
        @click="languageDialogVisible = true"
        :disabled="!gtfData"
      >
        Check Characters
      </v-btn>
      <v-btn 
        :prepend-icon="isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="isDarkMode = !isDarkMode"
        :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
      </v-btn>
      <!-- Re-add UIDemoPage Button -->
      <v-btn @click="navigateToUIDemoPage">
        UIDemoPage
      </v-btn>
    </v-app-bar>

    <!-- Use the new AppSidebar component -->
    <AppSidebar
      :active-view="currentView"
      :gtf-data-available="!!gtfData" 
      :selected-glyph-name="selectedGlyphName"
      :is-simple-preview-mode="isSimplePreviewMode"
      :grouped-glyphs="groupedGlyphs"
      :glyph-count="sortedGlyphs.length" 
      :processed-default-palette="processedDefaultPalette"
      @select-header="selectHeader"
      @select-glyph="selectGlyph"
      @add-glyph="addGlyph"
      @remove-glyph="removeGlyph"
      @toggle-sidebar-view="toggleSidebarView"
    />

    <v-main>
      <!-- Place Glyph Preview Bar INSIDE v-main -->

      <!--
      <GlyphPreviewBar 
        v-if="gtfData && gtfData.glyphs && gtfData.glyphs.length > 0"
        :glyphs="sortedGlyphs"
        :default-palette="processedDefaultPalette"
        :selected-glyph-name="selectedGlyphName"
        @select-glyph="selectGlyph"
      />
      -->

      <!-- Display Error if any -->
      <v-container v-if="currentError">
        <v-alert type="error" variant="tonal" prominent border="start">
          {{ currentError }}
        </v-alert>
      </v-container>
      
      <!-- Display Editors or placeholder -->
      <HeaderEditor 
        v-if="currentView === 'header' && gtfData" 
        :header-data="gtfData.header" 
        @update:header-field="updateHeaderData"
      />
      
      <GlyphEditor
        v-if="currentView === 'glyph' && selectedGlyphData"
        ref="glyphEditorRef"
        :key="selectedGlyphName" 
        :glyph-data="selectedGlyphData"
        :palette="selectedGlyphData.palette?.entries ? Object.entries(selectedGlyphData.palette.entries).map(([char, color]) => ({ char, color })) : []" 
        :header-default-palette="processedDefaultPalette"
        @update:glyph-field="updateGlyphData"
      />

      <!-- Re-add UIDemoPage Component Instance -->
      <UIDemoPage
        v-if="currentView === 'ui-demo'"
      />

      <!-- Placeholder for when nothing is selected or data is loading -->
      <v-container v-if="!currentView && gtfData">
        <p>Select the Font Header or a Glyph from the list to start editing.</p>
      </v-container>
       <v-container v-if="!gtfData">
        <p>Open a .gtf file to begin.</p>
        <p v-if="currentError" class="error--text">{{ currentError }}</p>
      </v-container>

    </v-main>

    <!-- Language Check Dialog -->
    <LanguageCheckDialog 
      v-model="languageDialogVisible"
      :glyphs="gtfData?.glyphs || []"
      :character-sets="languageCharacterSets"
      @add-glyph-for-char="addGlyphForChar"
      @edit-glyph="handleEditGlyph"
    />

  </v-app>
</template>

<style scoped>
/* REMOVE sidebar styles - they are now in AppSidebar.vue */
/*
.glyph-group-container {
}
.group-header {
  font-weight: bold;
  margin-top: 8px;
}
.glyph-card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px; 
}
.list-preview {
  margin: 0 !important;
  display: block;
}
.glyph-card {
  cursor: pointer;
  transition: background-color 0.1s ease-in-out;
  width: 52px;
  height: 52px;
  padding: 2px;
}
.glyph-card.v-card--variant-outlined {
    border-color: #1976D2;
    background-color: rgba(25, 118, 210, 0.1);
}
.simple-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px; 
}
.simple-preview-item {
  cursor: pointer;
  padding: 2px;
  border: 1px solid transparent;
  transition: border-color 0.1s ease-in-out;
}
.simple-preview-item.selected {
  border-color: #1976D2;
  background-color: rgba(25, 118, 210, 0.1);
}
.simple-preview-item .list-preview {
  display: block;
  margin: 0 !important;
}
*/
</style>
<style>
/* Global styles if needed */
</style>
