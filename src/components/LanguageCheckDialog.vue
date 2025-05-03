<!--
  Language Character Set Check Dialog

  Purpose:
  Provides a UI to check if glyphs for required characters 
  (common + language-specific) exist in the current font data.
  Allows adding missing glyphs quickly.

  Features:
  - Dropdown to select a target language.
  - Displays a grid of required characters (common first, then specific).
  - Visual distinction:
    - Missing characters: Light red background, '+' button to add.
    - Existing characters: Light green background, greyed text, checkmark icon.
  - Tooltips show glyph name (if existing) or action prompt.

  Props:
  - modelValue (Boolean): Controls dialog visibility (for v-model).
  - glyphs (Array): The list of glyph objects from the main font data.
  - characterSets (Object): Maps language names to strings of specific characters.

  Emits:
  - update:modelValue (Boolean): For v-model updates.
  - add-glyph-for-char (String): Emitted with the character when the '+' button is clicked.
  - edit-glyph (String): Emitted with the glyph name when the glyph is clicked.
-->
<template>
  <v-dialog v-model="dialogVisible" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Language Character Set Check</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="selectedLanguage"
                :items="languageOptions"
                label="Select Language"
                dense
                outlined
                hide-details
              ></v-select>
            </v-col>
          </v-row>

          <v-row v-if="selectedLanguage && orderedCharacters.length">
            <v-col cols="12">
              <p class="text-caption">Required Characters for {{ selectedLanguage }}: (Common + Specific)</p>
              <div class="character-grid">
                 <div 
                    v-for="char in orderedCharacters"
                    :key="char"
                    class="char-item elevation-2"
                    :class="{ 'char-exists-bg': glyphExists(char) }"
                    :title="glyphExists(char) ? `Edit glyph '${getGlyphName(char)}'` : `Add glyph for ${char}`"
                    @click="handleCharItemClick(char)"
                 >
                   <span 
                     class="char-display"
                     :class="{ 'char-exists-text': glyphExists(char) }"
                   >
                     {{ char }}
                   </span>
                 </div>
              </div>
            </v-col>
          </v-row>
          <v-row v-else-if="selectedLanguage">
             <v-col cols="12"><p>No character data found for {{ selectedLanguage }}.</p></v-col>
          </v-row>

        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  glyphs: {
    type: Array,
    required: true
  },
  characterSets: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'add-glyph-for-char', 'edit-glyph']);

const selectedLanguage = ref(null);

// Common characters
const commonChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const languageOptions = computed(() => Object.keys(props.characterSets));

// Combined and ordered characters
const orderedCharacters = computed(() => {
  if (!selectedLanguage.value) return [];
  const specificChars = props.characterSets[selectedLanguage.value] || '';
  // Combine common and specific, ensuring common come first and no duplicates
  const combined = commonChars + specificChars;
  const uniqueChars = Array.from(new Set(combined.split(''))); // Use Set for uniqueness
  // Ensure common chars are ordered first as defined in commonChars string
  const commonSet = new Set(commonChars.split(''));
  const orderedUnique = [
      ...commonChars.split('').filter(c => uniqueChars.includes(c)), // Common chars present in the set
      ...uniqueChars.filter(c => !commonSet.has(c)) // Specific chars not in common
  ];
  return orderedUnique;
});

// Map of char_repr to glyph name for tooltips
const charToNameMap = computed(() => {
    const map = new Map();
    props.glyphs.forEach(g => {
        if (g.char_repr) {
            map.set(g.char_repr, g.name);
        }
    });
    return map;
});

// Keep track of existing characters for quick lookup
const existingChars = computed(() => {
    return new Set(props.glyphs.map(g => g.char_repr).filter(Boolean));
});

function glyphExists(char) {
    return existingChars.value.has(char);
}

function getGlyphName(char) {
    return charToNameMap.value.get(char) || '?'; // Get name for tooltip
}

function handleCharItemClick(char) {
  if (glyphExists(char)) {
    const glyphName = getGlyphName(char);
    if (glyphName && glyphName !== '?') {
        emit('edit-glyph', glyphName); 
    } else {
        console.warn(`Could not find glyph name for existing char: ${char}`);
    }
  } else {
    emit('add-glyph-for-char', char);
  }
}

function closeDialog() {
  dialogVisible.value = false;
}

// Reset selected language when dialog opens/closes
watch(dialogVisible, (newValue) => {
  if (!newValue) {
    // Reset when closing
    // selectedLanguage.value = null; 
    // Let's keep the selection for now, maybe user wants to check again
  }
});

</script>

<style scoped>
.character-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    font-size: 1.4em;
    line-height: 1;
}
.char-item {
    position: relative; /* Make item a positioning context */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 55px; /* Increased width */
    height: 40px; /* Keep height */
    border: 1px solid rgb(var(--v-theme-outline-variant));
    border-radius: 6px;
    transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    background-color: rgb(var(--v-theme-error-container));
    color: rgb(var(--v-theme-on-error-container));
    cursor: pointer; /* Indicate clickability */
}
.char-item:hover {
    /* Subtle border highlight for missing glyph items on hover */
    border-color: rgb(var(--v-theme-error)); 
}

/* Reset border highlight if glyph exists */
.char-item.char-exists-bg:hover {
    border-color: rgb(var(--v-theme-success));
}

.char-display {
    flex-grow: 1;
    text-align: center;
    /* Ensure text doesn't overlap with absolute icon */
    /* padding-right: 18px; */ /* No longer needed */
}
.char-exists-text {
    color: rgb(var(--v-theme-on-surface-variant));
}
.char-exists-bg {
    background-color: rgb(var(--v-theme-success-container));
    color: rgb(var(--v-theme-on-success-container));
    border-color: rgb(var(--v-theme-success));
}
</style> 