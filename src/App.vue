<script setup>
// import { ref } from "vue"; // Keep for later
</script>

<template>
  <v-app id="inspire">
    <v-app-bar>
      <v-app-bar-title>GTF Editor</v-app-bar-title>
      <!-- Placeholder for potential menu/buttons -->
    </v-app-bar>

    <v-navigation-drawer permanent>
      <v-list>
        <v-list-item title="Glyphs List" subtitle="Placeholder"></v-list-item>
        <!-- TODO: Populate with actual glyphs -->
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <h2>Main Content Area</h2>
        <p>Here we will display the header editor or the selected glyph editor.</p>
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
