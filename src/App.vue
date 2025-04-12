<script setup>
import { ref, computed, watch } from "vue";
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';
import GlyphPreviewBar from './components/GlyphPreviewBar.vue';
import LanguageCheckDialog from './components/LanguageCheckDialog.vue';
// Import Tauri API functions
import { invoke } from "@tauri-apps/api/core";
// Import from the specific dialog plugin
import { open, save } from "@tauri-apps/plugin-dialog";
// import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs'; // Remove unused fs import for now

const currentView = ref(null); // Possible values: null, 'header', 'glyph'
const gtfData = ref(null); // Holds the parsed GTF document { header: {}, glyphs: [] }
const currentError = ref(null); // Holds error messages
const selectedGlyphName = ref(null); // Holds the name of the selected glyph
const currentFilePath = ref(null); // Holds the path of the currently open file
const languageDialogVisible = ref(false); // State for dialog visibility

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

// --- Watchers ---

// Removed window title watcher
// watch(currentFilePath, ...) 

// --- Functions ---

async function openFile() {
  currentError.value = null; // Clear previous errors
  gtfData.value = null; // Clear previous data
  selectedGlyphName.value = null;
  currentView.value = null;
  currentFilePath.value = null; // Reset file path
  try {
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: 'Glyph Text Format',
          extensions: ['gtf']
        }
      ]
    });

    if (selectedPath && typeof selectedPath === 'string') {
      console.log("Selected file:", selectedPath);
      // Call the Rust command to load and parse the file
      const document = await invoke('load_gtf_file', { path: selectedPath });
      console.log("Parsed document:", document);
      gtfData.value = document; // Store the parsed data
      currentFilePath.value = selectedPath; // Store the path
      currentView.value = 'header'; // Show header editor after loading
      selectedGlyphName.value = null; // Ensure no glyph is selected initially
    } else {
      console.log("File selection cancelled.");
    }
  } catch (error) {
    const errorString = String(error); // Ensure error is a string
    console.error("Error loading or parsing file:", errorString);
    
    // Check for the specific known inconsistency error
    if (errorString.includes('more bitmap lines than expected')) {
      console.warn("Known inconsistency: Parser found mismatched bitmap lines vs SIZE. Allowing edit to continue.");
      currentError.value = `Warning: File loaded with known inconsistency (bitmap lines vs SIZE). Please review glyph definitions.`;
      // Keep potentially partially loaded data and view
      // gtfData.value = ???; // Maybe keep data if backend sends partial?
      // currentView.value = 'header'; // Allow user to inspect
    } else {
      // Handle other unexpected errors as before
      currentError.value = `Error: ${errorString}`;
      gtfData.value = null; // Clear data on unexpected error
      currentView.value = null;
      selectedGlyphName.value = null;
      currentFilePath.value = null; // Clear path on unexpected error
      alert(`Failed to load file: ${errorString}`); // Show alert for unexpected errors
    }
  }
}

async function saveFileAs() {
  if (!gtfData.value) {
    alert("No data to save. Please open a file first.");
    return;
  }
  currentError.value = null;
  try {
    const savePath = await save({
      filters: [
        {
          name: 'Glyph Text Format',
          extensions: ['gtf']
        }
      ],
      // Suggest a filename based on the font name if available
      defaultPath: gtfData.value?.header?.font_name ? `${gtfData.value.header.font_name}.gtf` : 'untitled.gtf'
    });

    if (savePath) {
      console.log("Saving to file:", savePath);
      // Call the Rust command to serialize and save the file
      await invoke('save_gtf_file', { 
        path: savePath, 
        document: gtfData.value // Pass the current data
      });
      console.log("File saved successfully.");
      currentFilePath.value = savePath; // Store the path after successful save
      alert("File saved successfully!");
    } else {
      console.log("File saving cancelled.");
    }

  } catch (error) {
    console.error("Error saving file:", error);
    currentError.value = `Error saving file: ${error}`;
    alert(`Failed to save file: ${error}`);
  }
}

// Function to save the file to its current path
async function saveFile() {
  if (!gtfData.value || !currentFilePath.value) {
    console.warn("Save attempted but no data or file path is available.");
    // Optionally call saveFileAs if no path exists?
    // if (!currentFilePath.value && gtfData.value) saveFileAs();
    return;
  }
  currentError.value = null;
  console.log(`Saving to current path: ${currentFilePath.value}`);
  try {
      await invoke('save_gtf_file', { 
        path: currentFilePath.value, // Use the stored path
        document: gtfData.value // Pass the current data
      });
      console.log("File saved successfully (overwrite).");
      // Add subtle feedback, e.g., a temporary message or status bar update
      // For now, maybe just a brief console log
      // alert("File saved."); // Alert might be too intrusive for quick save
  } catch (error) {
     console.error("Error saving file (overwrite):", error);
     currentError.value = `Error saving file: ${error}`;
     alert(`Failed to save file: ${error}`); // Show error on failure
  }
}

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

  // Determine initial size: Use header default or fallback
  const initialSize = gtfData.value?.header?.default_size 
                      ? { ...gtfData.value.header.default_size } // Use default if available (copy)
                      : { width: 5, height: 7 }; // Fallback size
  
  // Create initial bitmap based on initialSize
  const initialBitmap = Array(initialSize.height).fill('.'.repeat(initialSize.width));

  // Create a default glyph structure
  const newGlyph = {
      name: newName,
      unicode: null,
      char_repr: null,
      size: initialSize, // Use determined initial size
      palette: { entries: {} }, // Always initialize with empty palette
      bitmap: initialBitmap, // Use generated initial bitmap
      validation_warnings: null
  };

  gtfData.value.glyphs.push(newGlyph);
  console.log(`Added glyph: ${newName} with size ${initialSize.width}x${initialSize.height}`);

  // Automatically select the new glyph
  selectGlyph(newName);
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

  // Handle field updates as before
  let processedValue = value;
  if (field === 'char_repr') {
      // Ensure only the first character is taken, or null if empty
      processedValue = value.length > 0 ? value.charAt(0) : null;
      
      // --- Auto-populate Unicode (if char_repr is valid and unicode is empty) --- 
      if (processedValue !== null && (currentGlyph.unicode === null || currentGlyph.unicode === '')) {
          try {
              const codePoint = processedValue.codePointAt(0);
              if (codePoint !== undefined) {
                  const unicodeString = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
                  console.log(`Auto-populating Unicode for '${processedValue}' with ${unicodeString}`);
                  // Directly update the unicode field in the data object
                  currentGlyph.unicode = unicodeString; 
              }
          } catch (e) {
              console.error("Error getting code point for auto-unicode:", e);
          }
      }
      // --- End Auto-populate Unicode ---

  } else if (field === 'unicode' || field === 'name') {
      // For optional string fields like unicode, or required like name, set to null if empty string is entered
      processedValue = value.trim() === '' ? null : value;
      // Special handling for name: if name changes, update selectedGlyphName
      if (field === 'name' && processedValue !== null) {
         // Important: Need validation here to prevent duplicate names!
         selectedGlyphName.value = processedValue;
      } else if (field === 'name' && processedValue === null) {
          console.error("Glyph name cannot be empty.");
          return; // Don't update if name is empty
      }
  } else if (field === 'size') {
     processedValue = value; 
  } else if (field === 'palette') {
    // Handles updates from add/remove palette entries
    processedValue = value && typeof value === 'object' ? value : { entries: {} }; 
    currentGlyph.palette = processedValue; 
    console.log(`Updated glyph field '${field}':`, currentGlyph);
    return; // Return early as we modified directly
  } else if (field === 'bitmap') {
     if (Array.isArray(value)) {
       processedValue = value;
     } else {
       console.error("Invalid value received for bitmap update, expected array.");
       return; 
     }
  }
  
  // Update the specific field that triggered the event (if not handled above)
  if (field in currentGlyph) {
      currentGlyph[field] = processedValue;
      console.log(`Updated glyph field '${field}':`, currentGlyph);
  } else {
      console.error(`Attempted to update unknown field '${field}' on glyph.`);
  }

  // ... (Potential reactivity updates if needed)
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

  // Generate name (simple for now)
  let baseName = `Glyph_${char}`;
  let newName = baseName;
  let counter = 1;
  const existingNames = new Set(gtfData.value.glyphs.map(g => g.name));
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

  const newGlyph = {
      name: newName,
      unicode: unicodeString,
      char_repr: char,
      size: initialSize, 
      palette: { entries: {} }, 
      bitmap: initialBitmap,
      validation_warnings: null
  };

  gtfData.value.glyphs.push(newGlyph);
  console.log(`Added specific glyph '${newName}' for character '${char}'`);

  // Select the new glyph
  selectGlyph(newName);
  languageDialogVisible.value = false; // Close dialog after adding
}

// Placeholder for the currently selected glyph ID/name
// const selectedGlyph = ref(null);

// TODO: Function to change view based on selected glyph
</script>

<template>
  <v-app id="inspire">
    <v-app-bar>
      <v-app-bar-title>
        GTF Editor 
        {{ gtfData?.header?.font_name ? `- ${gtfData.header.font_name}` : '' }}
        {{ currentFilePath ? ` (${currentFilePath.split('/').pop().split('\\').pop()})` : '(New File)' }}
      </v-app-bar-title>

      <v-btn prepend-icon="mdi-file-outline" @click="newFile">
        New File
      </v-btn>
      <v-btn prepend-icon="mdi-folder-open-outline" @click="openFile">
        Open File
      </v-btn>
       <v-btn 
        prepend-icon="mdi-content-save" 
        @click="saveFile" 
        :disabled="!gtfData || !currentFilePath" 
      >
        Save
      </v-btn>
      <v-btn 
        prepend-icon="mdi-content-save-cog-outline" 
        @click="saveFileAs" 
        :disabled="!gtfData" 
      >
        Save As...
      </v-btn>
      <v-btn 
        prepend-icon="mdi-translate" 
        @click="languageDialogVisible = true"
        :disabled="!gtfData"
       >
        Language Check
      </v-btn>
      <!-- Placeholder for more menu/buttons -->
    </v-app-bar>

    <v-navigation-drawer permanent>
      <v-list density="compact">
         <v-list-item 
           title="Font Header" 
           :active="currentView === 'header'" 
           @click="selectHeader" 
           :disabled="!gtfData"
           prepend-icon="mdi-information-outline"
         ></v-list-item>
         <v-divider></v-divider>
         <v-list-subheader>GLYPHS ({{ gtfData?.glyphs?.length ?? 0 }})</v-list-subheader>
         
         <!-- Add/Remove Buttons -->
         <v-list-item v-if="gtfData">
             <v-btn 
               @click="addGlyph" 
               block 
               prepend-icon="mdi-plus-box-outline" 
               variant="text" 
               size="small"
               class="mb-1"
             >
                 Add New
             </v-btn>
             <v-btn 
               @click="removeGlyph" 
               block 
               prepend-icon="mdi-minus-box-outline" 
               variant="text" 
               size="small"
               color="error" 
               :disabled="!selectedGlyphName" 
             >
                 Remove Selected
             </v-btn>
         </v-list-item>
         <v-divider v-if="gtfData"></v-divider>

         <!-- Iterate over actual glyphs when loaded -->
         <template v-if="gtfData && gtfData.glyphs">
           <v-list-item 
             v-for="glyph in gtfData.glyphs" 
             :key="glyph.name" 
             :title="glyph.char_repr ? `${glyph.char_repr} (${glyph.name})` : glyph.name" 
             :active="selectedGlyphName === glyph.name"
             @click="selectGlyph(glyph.name)"
             prepend-icon="mdi-format-font"
           >
             <!-- Můžete sem případně přidat další obsah položky -->
           </v-list-item>
         </template>
         <v-list-item v-else-if="!gtfData" title="(No file loaded)" disabled></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <!-- Place Glyph Preview Bar INSIDE v-main -->
      <GlyphPreviewBar 
        v-if="gtfData && gtfData.glyphs && gtfData.glyphs.length > 0"
        :glyphs="gtfData.glyphs"
        :default-palette="processedDefaultPalette"
        :selected-glyph-name="selectedGlyphName"
        @select-glyph="selectGlyph"
      />

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
        :key="selectedGlyphName" 
        :glyph-data="selectedGlyphData"
        :palette="selectedGlyphData.palette?.entries ? Object.entries(selectedGlyphData.palette.entries).map(([char, color]) => ({ char, color })) : []" 
        :header-default-palette="processedDefaultPalette"
        @update:glyph-field="updateGlyphData"
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
      @add-glyph-for-char="addSpecificGlyph"
    />

  </v-app>
</template>

<style scoped>
/* Add some basic styling if needed */
</style>
<style>
/* Global styles if needed */
</style>
