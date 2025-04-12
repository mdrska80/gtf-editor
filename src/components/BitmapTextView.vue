<template>
  <div class="bitmap-text-view">
    <h4>Raw Bitmap Data:</h4>
    <pre v-if="bitmap && bitmap.length > 0">{{ formattedBitmap }}</pre>
    <p v-else>(No bitmap data)</p>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  bitmap: {
    type: Array, // Array of strings
    required: true,
    default: () => []
  }
});

// Join the array of strings into a single string with newlines
const formattedBitmap = computed(() => {
  return props.bitmap.join('\n');
});

</script>

<style scoped>
.bitmap-text-view {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

pre {
  background-color: #eee;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre;
  overflow-x: auto;
  max-height: 200px; /* Limit height if bitmap is very tall */
}

h4 {
    margin-bottom: 8px;
}
</style> 