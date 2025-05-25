<template>
  <div>
    <!-- List of existing entries -->
    <div
      v-for="(entry, index) in localEntries"
      :key="index"
      class="palette-entry"
    >
      <!-- Character Input -->
      <v-text-field
        v-model="entry.char"
        label="Char"
        maxlength="1"
        density="compact"
        class="char-input"
        @change="updateEntry(index)"
      ></v-text-field>

      <!-- Color Input -->
      <v-text-field
        v-model="entry.color"
        label="Color (Hex)"
        :rules="[rules.required, rules.hexColor]"
        density="compact"
        class="color-input"
        @change="updateEntry(index)"
      ></v-text-field>

      <!-- NEW: Color Preview Swatch -->
      <div
        class="color-preview-swatch"
        :style="{ backgroundColor: entry.color }"
        :class="{ 'invalid-color': !isColorValid(entry.color) }"
        :title="isColorValid(entry.color) ? entry.color : 'Invalid Hex Color'"
      ></div>

      <!-- Remove Button -->
      <v-btn
        icon="mdi-delete"
        size="small"
        variant="text"
        title="Remove Entry"
        @click="removeEntry(index)"
      ></v-btn>
    </div>

    <!-- Error Message -->
    <v-alert v-if="error" type="error" density="compact" class="mt-2">
      {{ error }}
    </v-alert>

    <!-- Add Entry Button -->
    <v-btn
      prepend-icon="mdi-plus"
      size="small"
      class="mt-2"
      @click="openAddDialog"
    >
      Add Entry
    </v-btn>

    <!-- Add/Edit Dialog (remains mostly unchanged) -->
    <v-dialog v-model="dialog" max-width="300px">
      <v-card>
        <v-card-title>Add New Palette Entry</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newEntry.char"
            label="Character (single)"
            maxlength="1"
            required
            :rules="[rules.required, rules.uniqueChar]"
          ></v-text-field>
          <v-text-field
            v-model="newEntry.color"
            label="Color (e.g., #FFFFFF)"
            required
            :rules="[rules.required, rules.hexColor]"
          ></v-text-field>
          <!-- Simple swatch in dialog too -->
          <div
            v-if="newEntry.color"
            class="color-preview-swatch ml-2"
            :style="{ backgroundColor: newEntry.color }"
            :class="{ 'invalid-color': !isColorValid(newEntry.color) }"
            style="display: inline-block; vertical-align: middle"
          ></div>
          <v-alert
            v-if="dialogError"
            type="error"
            density="compact"
            class="mt-2"
          >
            {{ dialogError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="confirmAddEntry">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, reactive } from 'vue';

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
const newEntry = reactive({ char: '', color: '#FFFFFF' });

// Helper to check hex color validity
function isColorValid(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i.test(String(color || ''));
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
  // Validate all entries before emitting
  const isValid = localEntries.value.every(
    (entry) => entry.char && entry.color && isColorValid(entry.color)
  );
  if (!isValid) {
    error.value = 'Some palette entries are invalid.';
    // Optionally prevent emitting if invalid, or let parent handle potential bad state?
    // For now, we still emit, but show an error locally.
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
  // Optional: Add validation check here if needed
  // Ensure the character is not empty before potentially emitting
  if (!localEntries.value[index].char) {
    error.value = `Entry at index ${index} cannot have an empty character.`;
    return; // Prevent emitting update with empty char key
  }
  // Check for duplicate characters on edit
  const currentChar = localEntries.value[index].char;
  const count = localEntries.value.filter((e) => e.char === currentChar).length;
  if (count > 1) {
    error.value = `Character '${currentChar}' is duplicated. Please use unique characters.`;
    // Don't emit yet, let user fix it.
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
  newEntry.color = '#FFFFFF';
  dialogError.value = '';
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
}

function confirmAddEntry() {
  dialogError.value = ''; // Clear previous error
  // Validate new entry before adding
  if (!newEntry.char) {
    dialogError.value = 'Character is required.';
    return;
  }
  if (localEntries.value.some((entry) => entry.char === newEntry.char)) {
    dialogError.value = 'Character already exists in palette.';
    return;
  }
  if (!isColorValid(newEntry.color)) {
    dialogError.value = 'Invalid Hex color format (#XXX or #XXXXXX).';
    return;
  }

  localEntries.value.push({ ...newEntry });
  emitUpdate();
  closeDialog();
}
</script>

<style scoped>
.palette-entry {
  display: flex;
  align-items: center; /* Align items vertically */
  gap: 8px; /* Add some space between elements */
  margin-bottom: 8px;
}

.char-input {
  max-width: 60px;
  flex-shrink: 0;
}

.color-input {
  flex-grow: 1; /* Allow color input to take remaining space */
}

.color-preview-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  /* Use currentColor for a subtle, theme-adaptive border */
  border: 1px solid currentColor;
  opacity: 0.7; /* Make it slightly transparent so bg shows */
  flex-shrink: 0; /* Prevent swatch from shrinking */
  display: inline-block; /* Needed for alignment */
  vertical-align: middle; /* Align with text fields */
}

.color-preview-swatch.invalid-color {
  /* Use Vuetify's theme error color */
  border: 2px solid rgb(var(--v-theme-error));
  opacity: 1; /* Ensure error border is fully opaque */
}

/* Ensure buttons don't stretch */
.v-btn {
  flex-shrink: 0;
}
</style>
