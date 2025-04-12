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
            @update:model-value="$emit('update:headerField', { field: 'font_name', value: $event })"
            hint="Enter the font name"
            persistent-hint
          ></v-text-field>
          <v-text-field
            label="Version"
            :model-value="headerData.version || ''"
            @update:model-value="$emit('update:headerField', { field: 'version', value: $event })"
            hint="Enter the font/format version"
            persistent-hint
          ></v-text-field>
          <v-text-field
            label="Author"
            :model-value="headerData.author || ''"
            @update:model-value="$emit('update:headerField', { field: 'author', value: $event })"
            hint="Enter the author's name"
            persistent-hint
          ></v-text-field>
          <v-textarea
            label="Description"
            :model-value="headerData.description || ''"
            @update:model-value="$emit('update:headerField', { field: 'description', value: $event })"
            hint="Enter an optional description"
            persistent-hint
            rows="3"
          ></v-textarea>
        </v-form>
      </v-col>

      <v-col cols="12" md="6">
        <h3>Default Palette</h3>
        <p class="text-caption mb-2">Defines default colors used by glyphs unless they have their own palette.</p>
        
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
import { defineProps, defineEmits } from 'vue';
import PaletteEditor from './PaletteEditor.vue'; // Import the new component

// Define the expected props
const props = defineProps({
  headerData: {
    type: Object,
    required: true,
  }
});

// Define the events that this component can emit
const emit = defineEmits(['update:headerField']);

// Function to handle updates from the PaletteEditor
function handleDefaultPaletteUpdate(newEntries) {
   // Reconstruct the full default_palette object before emitting
   // (In case default_palette had other metadata, though unlikely now)
   const currentPalette = props.headerData.default_palette || {};
   emit('update:headerField', { 
     field: 'default_palette', 
     value: { ...currentPalette, entries: newEntries } 
   });
}

</script>

<style scoped>
/* Keep styles if needed, but palette-specific ones are now in PaletteEditor */
</style> 