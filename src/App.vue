<script setup>
import { ref, computed } from "vue";
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';
// Import Tauri API functions
import { invoke } from "@tauri-apps/api/core";
// Import from the specific dialog plugin
import { open, save } from "@tauri-apps/plugin-dialog";
// import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs'; // Remove unused fs import for now

const currentView = ref(null); // Possible values: null, 'header', 'glyph'
const gtfData = ref(null); // Holds the parsed GTF document { header: {}, glyphs: [] }
const currentError = ref(null); // Holds error messages
const selectedGlyphName = ref(null); // Holds the name of the selected glyph

// --- Computed Properties ---

// Finds the data for the currently selected glyph
const selectedGlyphData = computed(() => {
  if (!gtfData.value || !selectedGlyphName.value) {
    return null;
  }
  return gtfData.value.glyphs.find(g => g.name === selectedGlyphName.value) || null;
});

// --- Functions ---

async function openFile() {
  currentError.value = null; // Clear previous errors
  gtfData.value = null; // Clear previous data
  selectedGlyphName.value = null;
  currentView.value = null;
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
      currentView.value = 'header'; // Show header editor after loading
      selectedGlyphName.value = null; // Ensure no glyph is selected initially
    } else {
      console.log("File selection cancelled.");
    }
  } catch (error) {
    console.error("Error loading or parsing file:", error);
    currentError.value = `Error: ${error}`;
    gtfData.value = null; // Clear data on error
    currentView.value = null;
    selectedGlyphName.value = null;
    alert(`Failed to load file: ${error}`); // Simple error feedback
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
      // Optionally show a success message (e.g., using a snackbar)
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

// Function to update header data based on emitted event
function updateHeaderData({ field, value }) {
  console.log(`updateHeaderData called for field: ${field} with value: ${value}`);
  if (gtfData.value && gtfData.value.header) {
    // Handle empty string input: set corresponding field to null (or empty string based on backend expectation)
    // For simplicity, we'll set to null if value is empty, otherwise keep the value.
    // Rust side uses Option<String>, so null/None is appropriate.
    gtfData.value.header[field] = value.trim() === '' ? null : value;
    console.log("Updated header:", gtfData.value.header);
  } else {
    console.warn("Attempted to update header data, but gtfData or header is null.");
  }
}

// Function to update glyph data based on emitted event
function updateGlyphData({ field, value }) {
  if (!gtfData.value || !selectedGlyphName.value) {
    console.warn("Attempted to update glyph data, but gtfData or selectedGlyphName is null.");
    return;
  }
  
  const glyphIndex = gtfData.value.glyphs.findIndex(g => g.name === selectedGlyphName.value);
  
  if (glyphIndex === -1) {
     console.warn(`Attempted to update glyph data, but glyph with name '${selectedGlyphName.value}' not found.`);
     return;
  }

  // Handle specific fields
  let processedValue = value;
  if (field === 'char_repr') {
      // Ensure only the first character is taken, or null if empty
      processedValue = value.length > 0 ? value.charAt(0) : null;
  } else if (field === 'unicode' || field === 'name') {
      // For optional string fields like unicode, or required like name, set to null if empty string is entered
      processedValue = value.trim() === '' ? null : value;
      // Special handling for name: if name changes, update selectedGlyphName
      if (field === 'name' && processedValue !== null) {
         // Important: Need validation here to prevent duplicate names!
         // For now, just update the selection if name changed
         selectedGlyphName.value = processedValue;
      } else if (field === 'name' && processedValue === null) {
          // Prevent setting name to null/empty - should show validation error later
          console.error("Glyph name cannot be empty.");
          return; // Don't update if name is empty
      }
  } else if (field === 'size') {
     // Value should be { width, height } or null if cleared
     processedValue = value; 
     // TODO: When size changes, we might need to resize/clear the bitmap data!
     // This requires careful handling later.
  }
  // Add handling for other fields like size later
  
  // Update the data
  // Make sure we are not trying to set an unknown field
  if (field in gtfData.value.glyphs[glyphIndex]) {
      gtfData.value.glyphs[glyphIndex][field] = processedValue;
      console.log("Updated glyph:", gtfData.value.glyphs[glyphIndex]);
  } else {
      console.error(`Attempted to update unknown field '${field}' on glyph.`);
  }

  // If the name was changed, we might need to force reactivity update for the list title
  // (Vue might not detect deep changes in the title computation automatically)
  // A simple way (though not ideal) is to temporarily reset the array
  // if (field === 'name') {
  //   gtfData.value.glyphs = [...gtfData.value.glyphs];
  // }
}

// Placeholder for the currently selected glyph ID/name
// const selectedGlyph = ref(null);

// TODO: Function to change view based on selected glyph
</script>

<template>
  <v-app id="inspire">
    <v-app-bar>
      <v-app-bar-title>
        GTF Editor {{ gtfData?.header?.font_name ? `- ${gtfData.header.font_name}` : '' }}
      </v-app-bar-title>

      <v-btn prepend-icon="mdi-folder-open-outline" @click="openFile">
        Open File
      </v-btn>
      <v-btn 
        prepend-icon="mdi-content-save-outline" 
        @click="saveFileAs" 
        :disabled="!gtfData" 
      >
        Save As...
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
      <!-- Display Error if any -->
      <v-container v-if="currentError">
        <v-alert type="error" variant="tonal" prominent border="start">
          {{ currentError }}
        </v-alert>
      </v-container>
      <!-- Display Editors or placeholder -->
      <HeaderEditor 
        v-else-if="currentView === 'header' && gtfData" 
        :headerData="gtfData.header" 
        @update:headerField="updateHeaderData"
      />
      <GlyphEditor 
        v-else-if="currentView === 'glyph' && selectedGlyphData" 
        :glyphData="selectedGlyphData" 
        @update:glyphField="updateGlyphData"
      />
      <v-container v-else>
        <p v-if="!gtfData">Please open a GTF file using the button above.</p>
        <p v-else>Select an item from the list on the left.</p>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
/* Add some basic styling if needed */
</style>
<style>
/* Global styles if needed */
</style>
