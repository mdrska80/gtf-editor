<script setup>
import { ref, computed } from "vue";
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';
// Import Tauri API functions
import { invoke } from "@tauri-apps/api/core";
// Import from the specific dialog plugin
import { open } from "@tauri-apps/plugin-dialog";
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
