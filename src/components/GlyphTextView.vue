<template>
  <div class="glyph-text-view">
    <h4>Complete Glyph Definition (GTF Format):</h4>
    <pre v-if="glyphData">{{ formattedGlyphText }}</pre>
    <p v-else>(No glyph data)</p>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  glyphData: {
    type: Object, // Expecting the full Glyph object from Rust
    required: true,
    default: null
  }
});

// Format the entire glyph data into GTF text format
const formattedGlyphText = computed(() => {
  if (!props.glyphData) {
    return '';
  }

  const g = props.glyphData;
  let lines = [];

  // Start
  lines.push(`GLYPH ${g.name || 'Unnamed'}`);

  // Metadata
  if (g.unicode) {
    lines.push(`UNICODE ${g.unicode}`);
  }
  if (g.char_repr) {
    lines.push(`CHAR ${g.char_repr}`);
  }
  if (g.size && g.size.width !== undefined && g.size.height !== undefined) {
    lines.push(`SIZE ${g.size.width}x${g.size.height}`);
  }

  // Palette
  if (g.palette && g.palette.entries && Object.keys(g.palette.entries).length > 0) {
    lines.push('PALETTE');
    // Sort palette entries by character for consistency
    const sortedEntries = Object.entries(g.palette.entries).sort(([charA], [charB]) => charA.localeCompare(charB));
    for (const [char, color] of sortedEntries) {
      lines.push(`${char} ${color}`);
    }
  }

  // Bitmap
  if (g.bitmap && g.bitmap.length > 0) {
    lines.push(...g.bitmap);
  }

  // End
  lines.push(`END GLYPH ${g.name || 'Unnamed'}`);

  return lines.join('\n');
});

</script>

<style scoped>
.glyph-text-view {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f0f0f0; /* Slightly different background */
}

pre {
  background-color: #e0e0e0; /* Different background for pre */
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre;
  overflow-x: auto;
}

h4 {
    margin-bottom: 8px;
}
</style> 