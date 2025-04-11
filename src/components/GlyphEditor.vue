<template>
  <v-container v-if="glyphData">
    <h2>Glyph Editor: {{ glyphData.name }}</h2>

    <v-row>
      <v-col cols="12" md="6">
        <h3>Metadata</h3>
        <v-form>
          <v-text-field 
            label="Glyph Name" 
            :model-value="glyphData.name" 
            readonly
          ></v-text-field>
          <v-text-field 
            label="Unicode" 
            :model-value="glyphData.unicode || ''" 
            placeholder="Not set"
            readonly
          ></v-text-field>
          <v-text-field 
            label="Character" 
            :model-value="glyphData.char_repr || ''" 
            placeholder="Not set"
            readonly
          ></v-text-field>
          <v-text-field 
            label="Size (WxH)" 
            :model-value="formattedSize" 
            placeholder="Not set"
            readonly
          ></v-text-field>
        </v-form>
      </v-col>

      <v-col cols="12" md="6">
        <h3>Palette</h3>
        <!-- TODO: Palette editor (optional) -->
        <p v-if="glyphData.palette">({{ glyphData.palette.entries ? Object.keys(glyphData.palette.entries).length : 0 }} colors)</p>
        <p v-else>(Monochrome)</p>
        <p>(Palette editor placeholder)</p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h3>Bitmap</h3>
        <!-- TODO: Visual bitmap editor -->
         <pre v-if="glyphData.bitmap && glyphData.bitmap.length > 0">{{ glyphData.bitmap.join('\n') }}</pre>
         <p v-else>(No bitmap data)</p>
        <p>(Bitmap editor placeholder)</p>
      </v-col>
    </v-row>

  </v-container>
  <v-container v-else>
     <p>No glyph data available. Select a glyph from the list.</p>
  </v-container>
</template>

<script setup>
import { defineProps, computed } from 'vue';

// Define the expected props
const props = defineProps({
  glyphData: {
    type: Object, // Expecting the Glyph object from Rust
    required: true,
  }
});

// Computed property to format the size object
const formattedSize = computed(() => {
  if (props.glyphData && props.glyphData.size) {
    return `${props.glyphData.size.width}x${props.glyphData.size.height}`;
  }
  return ''; // Return empty string if size is not set
});

// Later: Define emits to send updated data back
</script>

<style scoped>
/* Add component-specific styles if needed */
pre {
  background-color: #eee;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre;
  overflow-x: auto;
}
</style> 