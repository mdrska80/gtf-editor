<template>
  <v-container>
    <h2>Glyph Editor</h2>

    <v-row>
      <v-col cols="12" md="6">
        <h3>Metadata</h3>
        <v-form>
          <v-text-field label="Glyph Name" placeholder="GlyphA"></v-text-field>
          <v-text-field label="Unicode" placeholder="U+0041"></v-text-field>
          <v-text-field label="Character" placeholder="A"></v-text-field>
          <v-text-field label="Size" placeholder="5x7"></v-text-field>
        </v-form>
      </v-col>

      <v-col cols="12" md="6">
        <h3>Palette</h3>
        <!-- TODO: Palette editor (optional) -->
        <p>(Palette editor placeholder)</p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h3>Bitmap</h3>
        <!-- TODO: Visual bitmap editor -->
        <p>(Bitmap editor placeholder)</p>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
// Later: Define props to receive glyph data
// Later: Define emits to send updated data back
</script>

<style scoped>
/* Add component-specific styles if needed */
</style> 