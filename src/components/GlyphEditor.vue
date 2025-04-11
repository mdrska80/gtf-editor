<template>
  <v-container v-if="glyphData">
    <h2>Glyph Editor: {{ glyphData.name }}</h2>

    <v-row>
      <v-col cols="12" md="6">
        <h3>Metadata</h3>
        <v-form @submit.prevent>
          <v-text-field 
            label="Glyph Name" 
            :model-value="glyphData.name" 
            @update:model-value="$emit('update:glyphField', { field: 'name', value: $event })"
          ></v-text-field>
          <v-text-field 
            label="Unicode" 
            :model-value="glyphData.unicode || ''" 
            @update:model-value="$emit('update:glyphField', { field: 'unicode', value: $event })"
            placeholder="U+XXXX"
            hint="Format: U+XXXX"
          ></v-text-field>
          <v-text-field 
            label="Character" 
            :model-value="glyphData.char_repr || ''" 
            @update:model-value="$emit('update:glyphField', { field: 'char_repr', value: $event })"
            placeholder="Single character"
            maxlength="1" 
            counter
          ></v-text-field>
          <v-text-field 
            label="Size (WxH)" 
            v-model="sizeInput" 
            @change="handleSizeChange" 
            :error-messages="sizeError" 
            placeholder="e.g., 5x7"
            hint="Enter width x height"
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
import { defineProps, ref, watch, defineEmits } from 'vue';

// Define the expected props
const props = defineProps({
  glyphData: {
    type: Object, // Expecting the Glyph object from Rust
    required: true,
  }
});

// Define the events that this component can emit
const emit = defineEmits(['update:glyphField']);

// Local state for the size input field
const sizeInput = ref('');
const sizeError = ref(''); // Error message for size input

// Watch for changes in the incoming glyph data to update the local input
watch(() => props.glyphData, (newGlyphData) => {
  if (newGlyphData && newGlyphData.size) {
    sizeInput.value = `${newGlyphData.size.width}x${newGlyphData.size.height}`;
  } else if (newGlyphData) {
    sizeInput.value = ''; // Clear if size is null/undefined in new data
  } else {
    sizeInput.value = ''; // Clear if glyphData itself is null
  }
  sizeError.value = ''; // Clear error on data change
}, { immediate: true }); // Run immediately on component mount

// Validate and emit size changes
function handleSizeChange() {
  sizeError.value = ''; // Clear previous error
  const value = sizeInput.value.trim();
  if (!value) {
    // Allow clearing the size - emit null
    emit('update:glyphField', { field: 'size', value: null });
    return;
  }

  const sizeRegex = /^(\d+)x(\d+)$/;
  const match = value.match(sizeRegex);

  if (match) {
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      sizeError.value = 'Width and height must be positive numbers.';
    } else {
      // Emit the structured size object
      emit('update:glyphField', { field: 'size', value: { width, height } });
    }
  } else {
    sizeError.value = 'Invalid format. Use WxH (e.g., 5x7).';
  }
}

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