<template>
  <v-col cols="12" md="6">
    <h3>Palette</h3>

    <!-- Drawing character selection -->
    <h4>Select Draw Character:</h4>
    <v-chip-group v-model="selectedDrawChar" mandatory column>
      <v-chip
        v-for="entry in palette"
        :key="entry.char"
        :value="entry.char"
        variant="outlined"
        label
      >
        <div
          class="color-swatch-small"
          :style="{ backgroundColor: entry.color }"
        ></div>
        <code class="char-code-small">{{ entry.char }}</code>
      </v-chip>
      <v-chip v-if="!palette || palette.length === 0" disabled>
        Palette Empty
      </v-chip>
    </v-chip-group>

    <v-divider class="my-4"></v-divider>
    <h4>Palette Entries:</h4>

    <!-- Apply default palette button -->
    <v-btn
      :disabled="!hasDefaultPalette"
      size="small"
      variant="elevated"
      color="secondary"
      class="mb-2"
      prepend-icon="mdi-format-paint"
      title="Replace current entries with header default palette"
      @click="applyDefaultPalette"
    >
      Use Default Palette
    </v-btn>

    <!-- Palette editor -->
    <PaletteEditor
      :entries="glyphData.palette?.entries || {}"
      @update:palette="handleGlyphPaletteUpdate"
    />
  </v-col>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch } from 'vue';
import PaletteEditor from './PaletteEditor.vue';

const props = defineProps({
  glyphData: {
    type: Object,
    required: true,
  },
  palette: {
    type: Array,
    required: true,
  },
  headerDefaultPalette: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  'update:glyphField',
  'update:selectedDrawChar',
  'update:selectedEraseChar',
]);

// Local state
const selectedDrawChar = ref('.');
const selectedEraseChar = ref('.');

// Computed properties
const hasDefaultPalette = computed(
  () => props.headerDefaultPalette && props.headerDefaultPalette.length > 0
);

// Watch palette changes to keep selectedDrawChar valid
watch(
  () => props.palette,
  (newPalette) => {
    let preferredChar = '.';
    if (newPalette && newPalette.some((p) => p.char === '#')) {
      preferredChar = '#';
    } else if (newPalette && newPalette.length > 0) {
      preferredChar = newPalette[0].char;
    }

    const currentSelectionValid =
      newPalette && newPalette.some((p) => p.char === selectedDrawChar.value);

    if (
      !currentSelectionValid ||
      (preferredChar !== '.' && selectedDrawChar.value !== preferredChar)
    ) {
      selectedDrawChar.value = preferredChar;
      emit('update:selectedDrawChar', selectedDrawChar.value);
    }

    selectedEraseChar.value = '.';
    emit('update:selectedEraseChar', selectedEraseChar.value);
  },
  { immediate: true, deep: true }
);

// Methods
function applyDefaultPalette() {
  if (hasDefaultPalette.value) {
    emit('update:glyphField', { action: 'use_default_palette' });
  }
}

function handleGlyphPaletteUpdate(newEntries) {
  const currentPalette = props.glyphData.palette || {};
  emit('update:glyphField', {
    field: 'palette',
    value: { ...currentPalette, entries: newEntries },
  });
}
</script>

<style scoped>
.color-swatch-small {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.24);
}

.char-code-small {
  font-size: 0.8em;
  font-weight: 500;
}
</style>
