<template>
  <v-container v-if="headerData">
    <h2>Header Editor</h2>
    <v-row>
      <v-col cols="12" md="6">
        <h3>Metadata</h3>
        <v-form @submit.prevent>
          <v-text-field
            label="Font Name"
            :model-value="headerData.font_name || ''"
            hint="Enter the font name"
            persistent-hint
            @update:model-value="
              $emit('update:headerField', { field: 'font_name', value: $event })
            "
          ></v-text-field>
          <v-text-field
            label="Version"
            :model-value="headerData.version || ''"
            hint="Enter the font/format version"
            persistent-hint
            @update:model-value="
              $emit('update:headerField', { field: 'version', value: $event })
            "
          ></v-text-field>
          <v-text-field
            label="Author"
            :model-value="headerData.author || ''"
            hint="Enter the author's name"
            persistent-hint
            @update:model-value="
              $emit('update:headerField', { field: 'author', value: $event })
            "
          ></v-text-field>
          <v-textarea
            label="Description"
            :model-value="headerData.description || ''"
            hint="Enter an optional description"
            persistent-hint
            rows="3"
            @update:model-value="
              $emit('update:headerField', {
                field: 'description',
                value: $event,
              })
            "
          ></v-textarea>
          <v-text-field
            label="Default Size (WxH)"
            :model-value="defaultSizeInput"
            :error-messages="defaultSizeError"
            placeholder="e.g., 5x7"
            hint="Default WxH for new glyphs"
            persistent-hint
            @update:model-value="defaultSizeInput = $event"
            @change="handleDefaultSizeChange"
          ></v-text-field>
        </v-form>
      </v-col>

      <v-col cols="12" md="6">
        <h3>Default Palette</h3>
        <p class="text-caption mb-2">
          Defines default colors used by glyphs unless they have their own
          palette.
        </p>

        <PaletteEditor
          :entries="headerData.default_palette?.entries || {}"
          @update:palette="handleDefaultPaletteUpdate"
        />
      </v-col>
    </v-row>
  </v-container>
  <v-container v-else>
    <p>No header data available.</p>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue';
import PaletteEditor from './PaletteEditor.vue'; // Import the new component

// Define the expected props
const props = defineProps({
  headerData: {
    type: Object,
    required: true,
  },
});

// Define the events that this component can emit
const emit = defineEmits(['update:headerField']);

// Local state for default size input
const defaultSizeInput = ref('');
const defaultSizeError = ref('');

// Watch for changes in the incoming header data to update the local input
watch(
  () => props.headerData.default_size,
  (newSize) => {
    if (newSize) {
      defaultSizeInput.value = `${newSize.width}x${newSize.height}`;
    } else {
      defaultSizeInput.value = ''; // Clear if size is null/undefined
    }
    defaultSizeError.value = ''; // Clear error on data change
  },
  { immediate: true, deep: true }
); // Use deep watch for object

// Validate and emit default size changes
function handleDefaultSizeChange() {
  defaultSizeError.value = ''; // Clear previous error
  const value = defaultSizeInput.value.trim();
  if (!value) {
    // Allow clearing the size - emit null
    emit('update:headerField', { field: 'default_size', value: null });
    return;
  }

  const sizeRegex = /^(\d+)x(\d+)$/;
  const match = value.match(sizeRegex);

  if (match) {
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      defaultSizeError.value = 'Width and height must be positive numbers.';
    } else {
      // Emit the structured size object
      emit('update:headerField', {
        field: 'default_size',
        value: { width, height },
      });
    }
  } else {
    defaultSizeError.value = 'Invalid format. Use WxH (e.g., 5x7).';
  }
}

// Function to handle updates from the PaletteEditor
function handleDefaultPaletteUpdate(newEntries) {
  // Reconstruct the full default_palette object before emitting
  // (In case default_palette had other metadata, though unlikely now)
  const currentPalette = props.headerData.default_palette || {};
  emit('update:headerField', {
    field: 'default_palette',
    value: { ...currentPalette, entries: newEntries },
  });
}
</script>

<style scoped>
/* Keep styles if needed, but palette-specific ones are now in PaletteEditor */
</style>
