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
                    class="char-item"
                    :class="{ 'char-exists-bg': glyphExists(char) }"
                 >
                   <span 
                     class="char-display"
                     :class="{ 'char-exists-text': glyphExists(char) }"
                     :title="glyphExists(char) ? `Glyph '${getGlyphName(char)}' exists` : `Add glyph for ${char}`"
                    >
                      {{ char }}
                   </span>
                   <v-icon 
                     v-if="glyphExists(char)"
                     color="success" 
                     size="small" 
                     class="status-icon"
                   >
                     mdi-check
                   </v-icon>
                   <v-tooltip location="top" :text="`Add glyph for '${char}'`" v-else>
                     <template v-slot:activator="{ props: tooltipProps }">
                       <v-btn 
                         v-bind="tooltipProps"
                         icon="mdi-plus-box-outline"
                         size="x-small"
                         variant="text"
                         color="primary"
                         @click="addGlyph(char)"
                         class="add-button status-icon"
                       ></v-btn>
                     </template>
                   </v-tooltip>
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

const emit = defineEmits(['update:modelValue', 'add-glyph-for-char']);

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

function addGlyph(char) {
    emit('add-glyph-for-char', char);
    // Note: App.vue handles adding and closing the dialog
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
    gap: 6px;
    margin-top: 10px;
    font-size: 1.4em;
    line-height: 1.6;
}
.char-item {
    display: inline-flex;
    align-items: center;
    padding: 3px 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
    min-width: 45px;
    justify-content: center;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    background-color: #ffebee;
}
.char-display {
    margin-right: 5px;
}
.char-exists-text {
    color: #777;
}
.char-exists-bg {
    background-color: #e8f5e9;
}
.status-icon {
    margin-left: auto;
}
.add-button {
    /* inherits status-icon margin */
}
</style> 