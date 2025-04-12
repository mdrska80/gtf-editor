<template>
  <div>
    <!-- Display Palette Entries using PaletteItem -->
    <v-list density="compact" lines="one">
      <PaletteItem
        v-for="(color, char) in entries" 
        :key="char"
        :char="char"
        :color="color"
        @remove="removePaletteEntry"
        @edit="startEditingEntry"
      />
      <v-list-item v-if="!entries || Object.keys(entries).length === 0">
         <v-list-item-title>(Palette is empty)</v-list-item-title>
      </v-list-item>
    </v-list>

    <v-divider class="my-4"></v-divider>

    <!-- Add/Edit Entry Form -->
    <h4>{{ isEditing ? 'Update Color' : 'Add New Color' }}</h4>
     <v-row dense>
       <v-col cols="3">
         <v-text-field 
           label="Char"
           v-model="editPaletteChar"
           maxlength="1"
           density="compact"
           :error-messages="editPaletteError"
           :readonly="isEditing" 
           :variant="isEditing ? 'filled' : 'outlined'" 
         ></v-text-field>
       </v-col>
       <v-col cols="6">
          <v-text-field 
           label="Color (#RGB/RRGGBB)"
           v-model="editPaletteColor"
            density="compact"
            :error-messages="editPaletteError"
         ></v-text-field>
         <!-- TODO: Add color picker integration later -->
         <!-- <v-color-picker v-model="editPaletteColor" hide-inputs></v-color-picker> -->
       </v-col>
       <v-col cols="3">
         <v-btn @click="addOrUpdateEntry" :color="isEditing ? 'success' : 'primary'" block>
            {{ isEditing ? 'Update' : 'Add' }}
         </v-btn>
       </v-col>
     </v-row>
     <v-btn v-if="isEditing" @click="cancelEditing" size="small" variant="text" class="mt-2">Cancel Edit</v-btn>

  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed } from 'vue';
import PaletteItem from './PaletteItem.vue'; // Import the new item component

// Props
const props = defineProps({
  entries: {
    type: Object, 
    required: true,
    default: () => ({})
  }
});

// Emits
const emit = defineEmits(['update:palette']);

// State for Add/Edit form
const editPaletteChar = ref('');
const editPaletteColor = ref('#FFFFFF');
const editPaletteError = ref('');
const editingCharKey = ref(null); // Store the key of the char being edited

// Computed property to determine if we are in edit mode
const isEditing = computed(() => editingCharKey.value !== null);

// Function to populate the form for editing
function startEditingEntry({ char, color }) {
    console.log(`Editing entry: ${char} - ${color}`);
    editingCharKey.value = char;
    editPaletteChar.value = char;
    editPaletteColor.value = color;
    editPaletteError.value = ''; // Clear any previous errors
}

// Function to clear the editing state and form
function cancelEditing() {
    editingCharKey.value = null;
    editPaletteChar.value = '';
    editPaletteColor.value = '#FFFFFF';
    editPaletteError.value = '';
}

// Add or Update an entry
function addOrUpdateEntry() {
  editPaletteError.value = ''; 
  const char = editPaletteChar.value.trim();
  const color = editPaletteColor.value.trim();

  if (char.length !== 1) {
    editPaletteError.value = 'Enter a single character.';
    return;
  }
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)) {
     editPaletteError.value = 'Invalid color format (#RGB or #RRGGBB).';
     return;
  }
  
  const currentEntries = props.entries || {};

  // If adding (not editing), check if char already exists
  if (!isEditing.value && currentEntries[char]) {
       editPaletteError.value = `Character '${char}' already exists in palette.`;
       return;
  }

  // Create a mutable copy 
  const updatedEntries = { ...currentEntries };
  updatedEntries[char] = color; // Add or overwrite the entry
  
  // Emit the update
  emit('update:palette', updatedEntries);

  // Reset form (clear editing state if we were editing)
  cancelEditing(); 
}

// Remove an entry
function removePaletteEntry(charToRemove) {
  if (!props.entries) return;
  
  // Create a mutable copy, excluding the character to remove
  const updatedEntries = { ...props.entries };
  delete updatedEntries[charToRemove];

  // Emit the update
  emit('update:palette', updatedEntries);

  // If we were editing the character that just got removed, cancel editing
  if (editingCharKey.value === charToRemove) {
      cancelEditing();
  }
}

</script>

<style scoped>
/* Styles copied from Header/Glyph Editor */
.palette-item .v-list-item-title {
  display: flex;
  align-items: center;
}
.color-swatch {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  margin-right: 10px;
  display: inline-block;
}
.char-code {
  font-family: monospace;
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
  margin-right: 5px;
}
</style> 