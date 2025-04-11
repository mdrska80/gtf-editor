<script setup>
import { ref } from "vue"; // Keep for later
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';

// State to control which view is shown in the main area
// Possible values: 'header', 'glyph'
// Later, this will be driven by user selection
const currentView = ref('header'); // Start by showing the header editor

// Placeholder for the list of glyphs
// const glyphs = ref([]);

// Placeholder for the currently selected glyph ID/name
// const selectedGlyph = ref(null);

// TODO: Function to change view (e.g., when a glyph is selected)
</script>

<template>
  <v-app id="inspire">
    <v-app-bar>
      <v-app-bar-title>GTF Editor</v-app-bar-title>
      <!-- Placeholder for potential menu/buttons -->
    </v-app-bar>

    <v-navigation-drawer permanent>
      <v-list>
        <v-list-item title="Font Header" @click="currentView = 'header'"></v-list-item>
        <v-divider></v-divider>
        <v-list-subheader>GLYPHS</v-list-subheader>
        <!-- TODO: Iterate over actual glyphs -->
        <v-list-item title="Glyph A (Placeholder)" @click="currentView = 'glyph'"></v-list-item>
        <v-list-item title="Glyph B (Placeholder)" @click="currentView = 'glyph'"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <!-- Conditionally render the editor components -->
      <HeaderEditor v-if="currentView === 'header'" />
      <GlyphEditor v-else-if="currentView === 'glyph'" />
      <v-container v-else>
        <p>Select an item from the list.</p>
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
