<template>
  <div class="palette-editor">
    <!-- Simplified Header -->
    <div v-if="localEntries.length > 0" class="palette-header mb-3">
      <div class="d-flex align-center justify-space-between">
        <div class="palette-info">
          <h4 class="palette-title">Color Palette</h4>
          <span class="palette-count">{{ localEntries.length }} colors</span>
        </div>
        <v-btn
          prepend-icon="mdi-plus-circle"
          variant="outlined"
          size="small"
          color="primary"
          @click="openAddDialog"
        >
          Add Color
        </v-btn>
      </div>
    </div>

    <!-- Simplified Palette Grid -->
    <div v-if="localEntries.length > 0" class="palette-grid">
      <div
        v-for="(entry, index) in localEntries"
        :key="index"
        class="palette-item"
        :class="{ 'invalid-entry': !isEntryValid(entry) }"
      >
        <!-- Color Swatch -->
        <div class="color-swatch" :style="{ backgroundColor: entry.color }">
          <v-icon v-if="!isColorValid(entry.color)" color="error" size="small">mdi-alert</v-icon>
        </div>

        <!-- Inputs -->
        <div class="palette-inputs">
          <v-text-field
            v-model="entry.char"
            label="Char"
            maxlength="1"
            density="compact"
            variant="outlined"
            class="char-input"
            hide-details
            @change="updateEntry(index)"
          ></v-text-field>

          <v-text-field
            v-model="entry.color"
            label="Color"
            density="compact"
            variant="outlined"
            class="color-input"
            hide-details
            @change="updateEntry(index)"
          ></v-text-field>

          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="removeEntry(index)"
          ></v-btn>
        </div>
      </div>
    </div>

    <!-- Simplified Empty State -->
    <div v-else class="empty-state">
      <div class="text-center pa-4">
        <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-palette-outline</v-icon>
        <p class="text-grey-lighten-1 mb-3">No colors defined</p>
        <v-btn
          prepend-icon="mdi-plus-circle"
          variant="outlined"
          color="primary"
          @click="openAddDialog"
        >
          Add Color
        </v-btn>
      </div>
    </div>

    <!-- Error Display -->
    <v-alert
      v-if="error"
      type="error"
      variant="outlined"
      density="compact"
      class="mt-3"
    >
      {{ error }}
    </v-alert>

    <!-- Simplified Add Dialog -->
    <v-dialog v-model="dialog" max-width="400px">
      <v-card>
        <v-card-title>Add Color</v-card-title>
        
        <v-card-text class="pa-4">
          <!-- Simple Preview -->
          <div class="mb-4">
            <div class="preview-swatch" :style="{ backgroundColor: newEntry.color }">
              {{ newEntry.char || '?' }}
            </div>
          </div>

          <!-- Input Fields -->
          <v-text-field
            v-model="newEntry.char"
            label="Character"
            maxlength="1"
            required
            variant="outlined"
            class="mb-3"
            :rules="[rules.required, rules.uniqueChar]"
            :error-messages="charError"
          ></v-text-field>
          
          <v-text-field
            v-model="newEntry.color"
            label="Hex Color"
            placeholder="#FF0000"
            required
            variant="outlined"
            class="mb-3"
            :rules="[rules.required, rules.hexColor]"
            :error-messages="colorError"
          ></v-text-field>

          <v-alert
            v-if="dialogError"
            type="error"
            variant="outlined"
            density="compact"
            class="mt-3"
          >
            {{ dialogError }}
          </v-alert>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            variant="elevated"
            :disabled="!isNewEntryValid"
            @click="confirmAddEntry"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, reactive, computed } from 'vue';

const props = defineProps({
  entries: {
    // Expecting { char: color, ... }
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:palette']);

// Local reactive copy of entries for easier manipulation
const localEntries = ref([]);
const error = ref('');
const dialog = ref(false);
const dialogError = ref('');
const charError = ref('');
const colorError = ref('');
const newEntry = reactive({ char: '', color: '#FF0000' });

// Color presets for quick selection
const colorPresets = [
  { name: 'Black', color: '#000000' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Red', color: '#FF0000' },
  { name: 'Green', color: '#00FF00' },
  { name: 'Blue', color: '#0000FF' },
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Purple', color: '#800080' },
  { name: 'Orange', color: '#FFA500' },
];

// Helper to check hex color validity
function isColorValid(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i.test(String(color || ''));
}

function isEntryValid(entry) {
  return entry.char && isColorValid(entry.color);
}

// Convert incoming object prop to local array format
watch(
  () => props.entries,
  (newEntries) => {
    localEntries.value = Object.entries(newEntries || {}).map(
      ([char, color]) => ({ char, color })
    );
  },
  { immediate: true, deep: true }
);

// Computed validation for new entry
const isNewEntryValid = computed(() => {
  return newEntry.char && 
         isColorValid(newEntry.color) && 
         !localEntries.value.some(entry => entry.char === newEntry.char);
});

// Rules for validation
const rules = {
  required: (value) => !!value || 'Required.',
  hexColor: (value) => isColorValid(value) || 'Invalid Hex (#XXX or #XXXXXX).',
  uniqueChar: (value) => {
    // Check against existing entries *outside* the dialog
    const isUnique = !localEntries.value.some((entry) => entry.char === value);
    return isUnique || 'Character already exists in palette.';
  },
};

// Function to emit updates when localEntries change
function emitUpdate() {
  error.value = '';
  charError.value = '';
  colorError.value = '';
  
  // Validate all entries before emitting
  const isValid = localEntries.value.every(isEntryValid);
  if (!isValid) {
    error.value = 'Some palette entries have invalid colors or missing characters.';
  }

  // Convert back to object format for emitting
  const updatedEntriesObject = localEntries.value.reduce((obj, entry) => {
    if (entry.char) {
      // Only include entries with a character
      obj[entry.char] = entry.color || '';
    }
    return obj;
  }, {});
  emit('update:palette', updatedEntriesObject);
}

// Called when inputs change in the list
function updateEntry(index) {
  const entry = localEntries.value[index];
  
  // Validate character
  if (!entry.char) {
    error.value = `Entry ${index + 1} cannot have an empty character.`;
    return;
  }
  
  // Check for duplicate characters
  const currentChar = entry.char;
  const count = localEntries.value.filter((e) => e.char === currentChar).length;
  if (count > 1) {
    error.value = `Character '${currentChar}' is used multiple times. Please use unique characters.`;
    return;
  }
  
  emitUpdate();
}

function removeEntry(index) {
  localEntries.value.splice(index, 1);
  emitUpdate();
}

function openAddDialog() {
  newEntry.char = '';
  newEntry.color = '#FF0000';
  dialogError.value = '';
  charError.value = '';
  colorError.value = '';
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
}

function confirmAddEntry() {
  dialogError.value = '';
  charError.value = '';
  colorError.value = '';
  
  // Validate new entry
  if (!newEntry.char) {
    charError.value = 'Character is required.';
    return;
  }
  if (localEntries.value.some((entry) => entry.char === newEntry.char)) {
    charError.value = 'Character already exists in palette.';
    return;
  }
  if (!isColorValid(newEntry.color)) {
    colorError.value = 'Invalid hex color format (#XXX or #XXXXXX).';
    return;
  }

  localEntries.value.push({ ...newEntry });
  emitUpdate();
  closeDialog();
}
</script>

<style scoped>
.palette-editor {
  width: 100%;
}

/* Header Styles */
.palette-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.palette-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.palette-count {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

/* Grid Layout */
.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

/* Palette Item */
.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.palette-item.invalid-entry {
  border-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.05);
}

/* Color Swatch */
.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Inputs */
.palette-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-grow: 1;
}

.char-input {
  max-width: 60px;
}

.color-input {
  max-width: 120px;
}

/* Empty State */
.empty-state {
  margin-top: 20px;
}

/* Dialog Preview */
.preview-swatch {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 1.2rem;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  margin: 0 auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .palette-grid {
    grid-template-columns: 1fr;
  }
  
  .palette-inputs {
    flex-direction: column;
    gap: 6px;
  }
  
  .char-input,
  .color-input {
    max-width: none;
  }
}
</style>
