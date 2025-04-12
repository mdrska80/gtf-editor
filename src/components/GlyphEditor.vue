<template>
  <v-container v-if="glyphData">
    <h2>Glyph Editor: {{ glyphData.name }}</h2>

    <!-- Display Validation Warnings -->
    <v-alert
      v-if="glyphData.validation_warnings && glyphData.validation_warnings.length > 0"
      type="warning"
      title="File Loading Warnings"
      closable
      prominent
      class="mb-4"
    >
      <p>The following issues were found when loading this glyph:</p>
      <ul>
        <li v-for="(warning, index) in glyphData.validation_warnings" :key="index">
          {{ warning }}
        </li>
      </ul>
      <p class="mt-2">Please correct the bitmap data or the palette definition.</p>
    </v-alert>

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
           <h4>Select Draw Character:</h4>
           <v-chip-group mandatory v-model="selectedDrawChar" column>
             <v-chip 
                v-for="(color, char) in glyphData.palette.entries" 
                :key="char"
                :value="char"
                variant="outlined"
                label
             >
                 <div class="color-swatch-small" :style="{ backgroundColor: color }"></div>
                 <code class="char-code-small">{{ char }}</code>
             </v-chip>
             <v-chip v-if="!glyphData.palette.entries || Object.keys(glyphData.palette.entries).length === 0" disabled>
                 Palette Empty
             </v-chip>
           </v-chip-group>

           <v-divider class="my-4"></v-divider>
           <h4>Palette Entries:</h4>
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
        
        <div v-else-if="!isColorMode">
           <h4>Select Draw Character:</h4>
            <v-btn-toggle v-model="selectedDrawChar" mandatory density="compact">
                <v-btn value="#"># (On)</v-btn>
                <v-btn value=".">. (Off)</v-btn>
            </v-btn-toggle>
        </div>

      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h3>Bitmap</h3>
        
        <div 
          v-if="glyphData.size && glyphData.bitmap" 
          class="bitmap-grid"
          :style="gridStyle"
          @mouseup="stopDrawing" 
          @mouseleave="stopDrawing" 
          @contextmenu.prevent
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
                  @mousedown.prevent="startDrawing(x, y, $event)" 
                  @mouseenter="drawOnEnter(x, y)" 
                  
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
  },
  palette: {
    type: Array,
    required: true
  },
  monochrome: {
    type: Boolean,
    default: false
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

const isDrawing = ref(false); // Track if mouse button is down
// State for currently selected drawing character
const selectedDrawChar = ref('.'); // Default for mono off
const selectedEraseChar = ref('.'); // Character used for erasing (right-click), default '.'
const currentCharToDraw = ref('.'); // Character being used in the current draw stroke

// Watch for mode changes to reset selected draw char
watch(() => props.monochrome, (newMode) => {
  console.log("Mode changed, resetting selectedDrawChar");
  if (newMode) {
    // Set default for monochrome (e.g., '#')
    selectedDrawChar.value = '#'; 
    selectedEraseChar.value = '.'; // Ensure erase char is valid for mono
  } else {
    // Set default for color (e.g., first palette char or '.')
    selectedDrawChar.value = props.palette.length > 0 ? props.palette[0].char : '.';
    selectedEraseChar.value = '.'; // Reset erase char if needed
  }
  // Ensure currentCharToDraw is updated if drawing wasn't active
  if (!isDrawing.value) {
      currentCharToDraw.value = selectedDrawChar.value; 
  }
}, { immediate: true }); // immediate: true to run on initial load

// Watch for changes in glyph size to resize the bitmap
watch(() => props.glyphData.size, (newSize, oldSize) => {
  console.log("Size changed:", oldSize, "->", newSize);
  if (!props.glyphData || !props.glyphData.bitmap || !newSize || !oldSize) {
    console.log("Skipping resize: Missing data");
    return; // Exit if essential data is missing
  }

  // Ensure width/height are numbers
  const newWidth = Number(newSize.width) || 0;
  const newHeight = Number(newSize.height) || 0;
  const oldWidth = Number(oldSize.width) || 0;
  const oldHeight = Number(oldSize.height) || 0;

  // Basic validation
  if (newWidth <= 0 || newHeight <= 0) {
      console.warn("Invalid new dimensions, skipping resize.");
      // Optionally reset bitmap or handle differently
      // emit('update:glyphField', { field: 'bitmap', value: [] }); 
      return;
  }

  const currentBitmap = props.glyphData.bitmap;
  let newBitmap = [...currentBitmap]; // Start with a copy
  
  // Determine the character to use for padding based on mode
  const defaultChar = props.monochrome ? '.' : selectedDrawChar.value;
  console.log(`Resizing: Using defaultChar: ${defaultChar} (Monochrome: ${props.monochrome})`);

  // 1. Adjust Height
  if (newHeight > oldHeight) {
    // Add rows
    // Ensure new rows have the correct width (newWidth, not oldWidth)
    const rowToAdd = defaultChar.repeat(newWidth);
    for (let i = oldHeight; i < newHeight; i++) {
      newBitmap.push(rowToAdd);
    }
  } else if (newHeight < oldHeight) {
    // Remove rows
    newBitmap = newBitmap.slice(0, newHeight);
  }

  // 2. Adjust Width (applied to the potentially height-adjusted bitmap)
  if (newWidth !== oldWidth) {
    newBitmap = newBitmap.map(row => {
      // Make sure 'row' is actually a string before calling string methods
      const currentRow = String(row || ''); 
      if (newWidth > oldWidth) {
        // Add padding
        return currentRow.padEnd(newWidth, defaultChar);
      } else {
        // Truncate
        return currentRow.slice(0, newWidth);
      }
    });
  }

  // Check if bitmap actually changed before emitting
  // Use a more reliable check than JSON.stringify for comparing arrays of strings
  let changed = newBitmap.length !== currentBitmap.length;
  if (!changed) {
      for (let i = 0; i < newBitmap.length; i++) {
          if (newBitmap[i] !== currentBitmap[i]) {
              changed = true;
              break;
          }
      }
  }

  if (changed) {
      console.log("Resizing bitmap. Old:", currentBitmap, "New:", newBitmap);
      emit('update:glyphField', { field: 'bitmap', value: newBitmap });
  }

}, { deep: true }); // Use deep watch for object changes

// Determine valid characters based on mode
const validDrawChars = computed(() => {
  if (props.monochrome) {
    // For monochrome, typically only two options: on ('#') and off ('.')
    // Adjust if your monochrome representation differs
    return ['#', '.'];
  } else {
    // For color, valid chars are the keys in the palette
    return props.palette.map(p => p.char);
  }
});

// Check if a character is valid in the current palette/mode
function isCharValid(char) {
  return validDrawChars.value.includes(char);
}

// Dynamic grid style based on size
const gridStyle = computed(() => {
  if (!props.glyphData || !props.glyphData.size) {
    return {};
  }
  const { width, height } = props.glyphData.size;
  // Use the size defined in CSS for consistency
  const cellSize = '24px'; // Match .bitmap-cell min-width/min-height
  return {
    display: 'grid',
    'grid-template-columns': `repeat(${width}, ${cellSize})`,
    'grid-template-rows': `repeat(${height}, ${cellSize})`,
    gap: '1px', // Adjust spacing between cells
    'justify-content': 'start', // Prevent stretching
    'align-content': 'start'
  };
});

// Helper to get cell background color
function getCellStyle(char) {
  if (props.monochrome) {
    // Basic monochrome styling
    return {
      'background-color': char === '#' ? 'black' : 'white',
      'border': '1px solid #eee'
    };
  } else {
    // Color mode styling
    const paletteEntry = props.palette.find(p => p.char === char);
    if (paletteEntry) {
       // Valid character: Use its color and a solid border
       return {
         'background-color': paletteEntry.color,
         'border': '1px solid #eee' 
       };
    } else {
       // Invalid character: Use a neutral background and dashed red border
       return {
         'background-color': '#f0f0f0', // Neutral background for invalid chars
         'border': '1px dashed red' 
       };
    }
  }
}

// Renamed from handleCellClick - updates the cell at given coordinates with a specific character
function updateCell(x, y, drawChar) {
  // Use selectedDrawChar if drawChar is not provided (for potential future single-click use)
  const charToUse = drawChar !== undefined ? drawChar : selectedDrawChar.value;

  console.log(`Updating cell: x=${x}, y=${y}, drawing with: ${charToUse}`);
  
  // Ensure data validity
  if (!props.glyphData || !props.glyphData.bitmap || y >= props.glyphData.bitmap.length) {
      console.error("Cannot update bitmap: Invalid data or y index.");
      return;
  }
  
  // Allow drawing empty space if '' is selected? For now, treat as invalid selection
  if (!charToUse && charToUse !== '') { 
      console.warn("Invalid drawing character provided.");
      return;
  }

  // Create a mutable copy of the bitmap array
  const newBitmap = [...props.glyphData.bitmap];
  
  // Get the target row as an array of characters
  let rowChars = newBitmap[y].split('');

  // Check x bounds and update character
  if (x < rowChars.length) {
      // Only update if the character is actually changing
      if (rowChars[x] !== charToUse) {
          rowChars[x] = charToUse;
          
          // Join the characters back into a string
          newBitmap[y] = rowChars.join('');
          
          // Emit the updated bitmap array
          console.log("Emitting updated bitmap:", newBitmap);
          emit('update:glyphField', { field: 'bitmap', value: newBitmap });
      }
  } else {
      console.error(`Cannot update bitmap: Invalid x index ${x}.`);
  }
}

// Start drawing when mouse button is pressed down on a cell
function startDrawing(x, y, event) {
  isDrawing.value = true;
  
  // Determine draw character based on mouse button
  // event.button === 0 for left, 2 for right
  if (event.button === 0) {
    currentCharToDraw.value = selectedDrawChar.value;
  } else if (event.button === 2) {
    currentCharToDraw.value = selectedEraseChar.value; // Use erase character for right-click
  }
  // Potentially handle middle click (event.button === 1) if needed
  
  console.log(`Start drawing with button ${event.button}, char: ${currentCharToDraw.value}`);
  updateCell(x, y, currentCharToDraw.value); // Draw on the first cell immediately
}

// Continue drawing if mouse enters a cell while button is pressed
function drawOnEnter(x, y) {
  if (isDrawing.value) {
    updateCell(x, y, currentCharToDraw.value); // Use the character determined at startDrawing
  }
}

// Stop drawing when mouse button is released or leaves the grid
function stopDrawing() {
  if (isDrawing.value) {
    console.log("Stop drawing");
    isDrawing.value = false;
  }
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

.color-swatch-small {
  width: 12px;
  height: 12px;
  border: 1px solid #ccc;
  margin-right: 5px;
  display: inline-block;
  vertical-align: middle;
}
.char-code-small {
  font-family: monospace;
  font-size: 0.9em;
}

</style> 