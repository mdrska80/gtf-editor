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
    default: null,
  },
});

// Format the entire glyph data into GTF text format
const formattedGlyphText = computed(() => {
  if (!props.glyphData) {
    return '';
  }

  const g = props.glyphData;
  const lines = [];

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
  const hasPalette =
    g.palette && g.palette.entries && Object.keys(g.palette.entries).length > 0;
  if (hasPalette) {
    lines.push('PALETTE');
    // Sort palette entries by character for consistency
    const sortedEntries = Object.entries(g.palette.entries).sort(
      ([charA], [charB]) => charA.localeCompare(charB)
    );
    for (const [char, color] of sortedEntries) {
      lines.push(`${char} ${color}`);
    }
    lines.push('END PALETTE');
  }

  // DATA keyword
  const hasBitmap = g.bitmap && g.bitmap.length > 0;
  const hasSize =
    g.size && g.size.width !== undefined && g.size.height !== undefined;
  if (hasSize || hasBitmap) {
    lines.push('DATA');
    // Bitmap
    if (hasBitmap) {
      lines.push(...g.bitmap);
    }
    lines.push('END DATA');
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
  border: 1px solid rgb(var(--v-border-color));
  border-radius: 4px;
  background-color: rgb(var(--v-theme-surface));
}

pre {
  background-color: rgb(var(--v-theme-surface));
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre;
  overflow-x: auto;
  color: rgb(var(--v-theme-on-surface));
}

h4 {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-on-surface));
}
</style>
