<script setup>
import { ref } from "vue";
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';
// Import Tauri API functions
import { invoke } from "@tauri-apps/api/core";
// Import from the specific dialog plugin
import { open } from "@tauri-apps/plugin-dialog";
// import { BaseDirectory, readTextFile } from '@tauri-apps/api/fs'; // Remove unused fs import for now

const currentView = ref(null); // Start with no view selected
const gtfData = ref(null); // Holds the parsed GTF document { header: {}, glyphs: [] }
const currentError = ref(null); // Holds error messages

// --- Functions ---

async function openFile() {
  currentError.value = null; // Clear previous errors
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
    } else {
      console.log("File selection cancelled.");
    }
  } catch (error) {
    console.error("Error loading or parsing file:", error);
    currentError.value = `Error: ${error}`;
    gtfData.value = null; // Clear data on error
    currentView.value = null;
    alert(`Failed to load file: ${error}`); // Simple error feedback
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
           @click="currentView = 'header'"
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
             :active="currentView === 'glyph' /* && selectedGlyph === glyph.name */" 
             @click="currentView = 'glyph' /*; selectedGlyph = glyph.name */"
             prepend-icon="mdi-format-font"
           ></v-list-item>
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
      <HeaderEditor v-else-if="currentView === 'header' && gtfData" :headerData="gtfData.header" />
      <GlyphEditor v-else-if="currentView === 'glyph' && gtfData" />
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
