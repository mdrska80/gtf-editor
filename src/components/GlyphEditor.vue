<template>
  <v-container v-if="glyphData">
    <h2>Glyph Editor: {{ glyphData.name }}</h2>

    <v-row>
      <v-col cols="12" md="6">
        <h3>Metadata</h3>
        <v-form @submit.prevent>
          <v-text-field 
            label="Glyph Name" 
            :model-value="glyphData.name" 
            @update:model-value="$emit('update:glyphField', { field: 'name', value: $event })"
          ></v-text-field>
          <v-text-field 
            label="Unicode" 
            :model-value="glyphData.unicode || ''" 
            @update:model-value="$emit('update:glyphField', { field: 'unicode', value: $event })"
            placeholder="U+XXXX"
            hint="Format: U+XXXX"
          ></v-text-field>
          <v-text-field 
            label="Character" 
            :model-value="glyphData.char_repr || ''" 
            @update:model-value="$emit('update:glyphField', { field: 'char_repr', value: $event })"
            placeholder="Single character"
            maxlength="1" 
            counter
          ></v-text-field>
          <v-text-field 
            label="Size (WxH)" 
            v-model="sizeInput" 
            @change="handleSizeChange" 
            :error-messages="sizeError" 
            placeholder="e.g., 5x7"
            hint="Enter width x height"
          ></v-text-field>
        </v-form>
      </v-col>

      <v-col cols="12" md="6">
        <h3>Palette</h3>
        
        <v-switch
          :model-value="isColorMode"
          @update:model-value="toggleColorMode"
          :label="isColorMode ? 'Color Mode' : 'Monochrome Mode'"
          color="primary"
          inset
        ></v-switch>

        <template v-if="isColorMode && glyphData.palette">
          <v-list density="compact" lines="one">
            <v-list-item 
              v-for="(color, char) in glyphData.palette.entries" 
              :key="char"
              class="palette-item"
            >
              <template v-slot:prepend>
                <div class="color-swatch" :style="{ backgroundColor: color }"></div>
              </template>
              <v-list-item-title><code class="char-code">{{ char }}</code> : {{ color }}</v-list-item-title>
              <template v-slot:append>
                <v-btn 
                  icon="mdi-delete" 
                  variant="text" 
                  size="small" 
                  @click="removePaletteEntry(char)"
                  title="Remove Color"
                ></v-btn>
              </template>
            </v-list-item>
             <v-list-item v-if="!glyphData.palette.entries || Object.keys(glyphData.palette.entries).length === 0">
                <v-list-item-title class="text-grey">Palette is empty.</v-list-item-title>
             </v-list-item>
          </v-list>

          <v-divider class="my-4"></v-divider>

          <h4>Add New Color</h4>
          <v-row dense>
            <v-col cols="3">
              <v-text-field 
                label="Char"
                v-model="newPaletteChar"
                maxlength="1"
                density="compact"
                :error-messages="newPaletteError"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
               <v-text-field 
                label="Color (#RGB or #RRGGBB)"
                v-model="newPaletteColor"
                 density="compact"
                 :error-messages="newPaletteError"
              ></v-text-field>
              <!-- TODO: Optionally add v-color-picker -->
            </v-col>
            <v-col cols="3">
              <v-btn @click="addPaletteEntry" color="primary" block>Add</v-btn>
            </v-col>
          </v-row>
        </template>
        
        <p v-else-if="!isColorMode">(Monochrome Mode - Uses '#' and '.')</p>

      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h3>Bitmap</h3>
        
        <div 
          v-if="glyphData.size && glyphData.bitmap" 
          class="bitmap-grid"
          :style="gridStyle"
        >
          <template v-for="(row, y) in glyphData.bitmap" :key="y">
            <v-tooltip 
              v-for="(char, x) in row.split('')" 
              :key="`${x}-${y}`"
              :text="isCharValid(char) ? '' : `Char \'${char}\' not in palette!`"
              :disabled="isCharValid(char)"
              location="top"
            >
              <template v-slot:activator="{ props: tooltipProps }">
                <v-btn 
                  v-bind="tooltipProps" 
                  class="bitmap-cell"
                  :style="getCellStyle(char)"
                  icon 
                  variant="flat" 
                  size="x-small" 
                  :ripple="false"
                  @click="handleCellClick(x, y)" 
                >
                  <!-- Display character ONLY if it's invalid -->
                  <span v-if="!isCharValid(char)" class="invalid-char-indicator">{{ char }}</span>
                </v-btn>
              </template>
            </v-tooltip>
          </template>
        </div>
        <p v-else>(No bitmap data or size defined)</p>

      </v-col>
    </v-row>

  </v-container>
  <v-container v-else>
     <p>No glyph data available. Select a glyph from the list.</p>
  </v-container>
</template>

<script setup>
import { defineProps, ref, watch, defineEmits, computed } from 'vue';

// Define the expected props
const props = defineProps({
  glyphData: {
    type: Object, // Expecting the Glyph object from Rust
    required: true,
  }
});

// Define the events that this component can emit
const emit = defineEmits(['update:glyphField']);

// Local state for the size input field
const sizeInput = ref('');
const sizeError = ref(''); // Error message for size input

// Watch for changes in the incoming glyph data to update the local input
watch(() => props.glyphData, (newGlyphData) => {
  if (newGlyphData && newGlyphData.size) {
    sizeInput.value = `${newGlyphData.size.width}x${newGlyphData.size.height}`;
  } else if (newGlyphData) {
    sizeInput.value = ''; // Clear if size is null/undefined in new data
  } else {
    sizeInput.value = ''; // Clear if glyphData itself is null
  }
  sizeError.value = ''; // Clear error on data change
}, { immediate: true }); // Run immediately on component mount

// Validate and emit size changes
function handleSizeChange() {
  sizeError.value = ''; // Clear previous error
  const value = sizeInput.value.trim();
  if (!value) {
    // Allow clearing the size - emit null
    emit('update:glyphField', { field: 'size', value: null });
    return;
  }

  const sizeRegex = /^(\d+)x(\d+)$/;
  const match = value.match(sizeRegex);

  if (match) {
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      sizeError.value = 'Width and height must be positive numbers.';
    } else {
      // Emit the structured size object
      emit('update:glyphField', { field: 'size', value: { width, height } });
    }
  } else {
    sizeError.value = 'Invalid format. Use WxH (e.g., 5x7).';
  }
}

// --- Palette State & Logic ---
const newPaletteChar = ref('');
const newPaletteColor = ref('#FFFFFF');
const newPaletteError = ref('');

// Computed property to check if the glyph is in color mode (has a palette object)
const isColorMode = computed(() => props.glyphData && props.glyphData.palette !== null && props.glyphData.palette !== undefined);

// Toggle between color and monochrome mode
function toggleColorMode() {
  newPaletteError.value = ''; // Clear errors
  let newPaletteValue = null;
  if (!isColorMode.value) {
    // Switching TO color mode: create empty palette if needed
    newPaletteValue = props.glyphData.palette || { entries: {} }; 
  } else {
    // Switching TO monochrome mode: set palette to null
    newPaletteValue = null;
  }
  emit('update:glyphField', { field: 'palette', value: newPaletteValue });
}

// Add a new entry to the palette
function addPaletteEntry() {
  newPaletteError.value = ''; // Clear previous error
  const char = newPaletteChar.value.trim();
  const color = newPaletteColor.value.trim();

  if (char.length !== 1) {
    newPaletteError.value = 'Enter a single character.';
    return;
  }
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)) {
     newPaletteError.value = 'Invalid color format (#RGB or #RRGGBB).';
     return;
  }
  if (!props.glyphData.palette || !props.glyphData.palette.entries) {
      newPaletteError.value = 'Cannot add to non-existent palette.'; // Should not happen if switch works
      return;
  }
  if (props.glyphData.palette.entries[char]) {
       newPaletteError.value = `Character '${char}' already exists in palette.`;
       return;
  }

  // Create a mutable copy of the entries
  const updatedEntries = { ...props.glyphData.palette.entries };
  updatedEntries[char] = color;
  
  // Emit the entire updated palette object
  emit('update:glyphField', { field: 'palette', value: { entries: updatedEntries } });

  // Clear input fields
  newPaletteChar.value = '';
  // newPaletteColor.value = '#FFFFFF'; // Keep last color?
}

// Remove an entry from the palette
function removePaletteEntry(charToRemove) {
  if (!props.glyphData.palette || !props.glyphData.palette.entries) return;
  
  // Create a mutable copy, excluding the character to remove
  const updatedEntries = { ...props.glyphData.palette.entries };
  delete updatedEntries[charToRemove];

  // Emit the entire updated palette object
  emit('update:glyphField', { field: 'palette', value: { entries: updatedEntries } });
}

// --- Bitmap Logic ---

// TODO: Add state for currently selected drawing character/color
const selectedDrawChar = ref('.'); // Default for mono off

// Computed property for grid styling (CSS Grid)
const gridStyle = computed(() => {
  if (props.glyphData && props.glyphData.size) {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${props.glyphData.size.width}, auto)`,
      gap: '1px',
      backgroundColor: '#ccc', // Grid lines
      border: '1px solid #ccc',
      width: 'min-content' // Prevent grid from stretching
    };
  }
  return {};
});

// Helper to check if a character is valid in the current context
function isCharValid(char) {
   if (isColorMode.value) {
     // Color mode: valid if palette exists and contains the char
     return !!(props.glyphData.palette && props.glyphData.palette.entries && Object.prototype.hasOwnProperty.call(props.glyphData.palette.entries, char));
   } else {
     // Monochrome mode: valid if # or .
     return char === '#' || char === '.';
   }
}

// Helper to get cell background color
function getCellStyle(char) {
  let bgColor = '#ffffff';
  let style = {}; 

  if (isColorMode.value && props.glyphData.palette && props.glyphData.palette.entries) {
      if (Object.prototype.hasOwnProperty.call(props.glyphData.palette.entries, char)) {
          bgColor = props.glyphData.palette.entries[char];
      } else {
          bgColor = '#f0f0f0'; 
          style.border = '1px dashed red'; 
      }
  } else {
      bgColor = (char === '#') ? '#000000' : '#ffffff';
      style.border = '1px solid transparent'; 
  }
  style.backgroundColor = bgColor;
  return style;
}

// Placeholder for handling cell clicks (editing)
function handleCellClick(x, y) {
  console.log(`Clicked cell: x=${x}, y=${y}`);
  // TODO: Implement bitmap update logic here
  // 1. Get current drawing char/color
  // 2. Update character at [y][x] in a mutable copy of the bitmap array
  // 3. Emit the updated bitmap array: emit('update:glyphField', { field: 'bitmap', value: newBitmapArray });
}

</script>

<style scoped>
/* Add component-specific styles if needed */
pre {
  background-color: #eee;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre;
  overflow-x: auto;
}
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

.bitmap-grid {
  margin-top: 10px;
  line-height: 0; /* Prevent extra space around buttons */
}

.bitmap-cell {
  min-width: 24px; /* Ensure button has size */
  min-height: 24px;
  padding: 0;
  border-radius: 0; /* Make it square */
  border: none;
  box-shadow: none !important; /* Override Vuetify shadow */
}

/* Optional: change cursor */
.bitmap-cell:hover {
  cursor: pointer; 
}

.invalid-char-indicator {
  color: red;
  font-weight: bold;
  font-size: 10px; /* Make it small */
  position: absolute; /* Position it within the button */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none; /* Allow clicking the button underneath */
}

</style> 