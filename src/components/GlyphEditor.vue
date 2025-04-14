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
          >
            <template v-slot:append-inner>
              <span class="text-caption text-grey">({{ unicodeDecimalValue }})</span>
            </template>
          </v-text-field>
          <v-text-field 
            label="Character" 
            :model-value="glyphData.char_repr || ''" 
            @update:model-value="handleCharReprInput"
            placeholder="Single character"
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
        
        <!-- Always show color palette UI -->
        <h4>Select Draw Character:</h4>
        <v-chip-group mandatory v-model="selectedDrawChar" column>
           <v-chip 
              v-for="entry in props.palette" 
              :key="entry.char"
              :value="entry.char"
              variant="outlined"
              label
           >
               <div class="color-swatch-small" :style="{ backgroundColor: entry.color }"></div>
               <code class="char-code-small">{{ entry.char }}</code>
           </v-chip>
           <v-chip v-if="!props.palette || props.palette.length === 0" disabled>
               Palette Empty
           </v-chip>
         </v-chip-group>

        <v-divider class="my-4"></v-divider>
        <h4>Palette Entries:</h4>
        
         <!-- Button to apply default palette -->
         <v-btn 
           @click="applyDefaultPalette" 
           :disabled="!hasDefaultPalette" 
           size="small"
           variant="outlined"
           class="mb-2"
           prepend-icon="mdi-format-paint"
           title="Replace current entries with header default palette"
          >
            Use Default Palette
         </v-btn>

        <!-- Use the new PaletteEditor component -->
        <PaletteEditor 
           :entries="glyphData.palette?.entries || {}"
           @update:palette="handleGlyphPaletteUpdate"
        />

      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <h3>Bitmap</h3>
        
        <!-- NEW: Add Size Controls -->
        <div class="mb-2">
          <span class="mr-2 text-caption">Cell Size:</span>
          <v-btn icon="mdi-minus" size="x-small" @click="decreaseCellSize" :disabled="editorCellSize <= 8"></v-btn>
          <span class="mx-2">{{ editorCellSize }}px</span>
          <v-btn icon="mdi-plus" size="x-small" @click="increaseCellSize"></v-btn>
        </div>

        <!-- RE-ADD Outer wrapper div for border and centering -->
        <div 
          v-if="glyphData.size && glyphData.bitmap"
          style="background-color: #000000; padding: 5px; border-radius: 4px; display: flex; justify-content: center;"
          @contextmenu.prevent
        >
          <!-- Existing grid div -->
          <div 
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
                    :style="[getCellStyle(char), cellDynamicSizeStyle]"
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
          </div> <!-- End of existing grid div -->
        </div> <!-- End of RE-ADDED outer wrapper div -->

        <!-- NEW: Add the BitmapTextView component -->
        <BitmapTextView 
          v-if="glyphData && glyphData.bitmap"
          :bitmap="glyphData.bitmap" 
          @update:bitmap="handleBitmapTextUpdate"
        />

        <!-- NEW: Add the GlyphTextView component -->
        <GlyphTextView 
          v-if="glyphData"
          :glyph-data="glyphData"
        />

        <p v-else>(No bitmap data or size defined)</p>

      </v-col>
    </v-row>

  </v-container>
  <v-container v-else>
     <p>No glyph data available. Select a glyph from the list.</p>
  </v-container>
</template>

<script setup>
import { defineProps, ref, watch, defineEmits, computed, nextTick } from 'vue';
import PaletteEditor from './PaletteEditor.vue'; // Import the new component
import BitmapTextView from './BitmapTextView.vue'; // <-- IMPORT the new component
import GlyphTextView from './GlyphTextView.vue';   // <-- IMPORT the newest component

// Define the expected props
const props = defineProps({
  glyphData: {
    type: Object, // Expecting the Glyph object from Rust
    required: true,
  },
  palette: { // Processed palette array [{ char, color }, ...]
    type: Array,
    required: true
  },
  headerDefaultPalette: { // Processed default palette array [{ char, color }, ...]
    type: Array,
    default: () => []
  }
});

// Define the events that this component can emit
const emit = defineEmits(['update:glyphField']);

// Local state for the size input field
const sizeInput = ref('');
const sizeError = ref('');
const isUpdatingFromTextArea = ref(false);

// --- NEW: State for Editor Cell Size ---
const editorCellSize = ref(32); // Default cell size in pixels (Changed from 24)

// --- NEW: Computed property for Decimal Unicode ---
const unicodeDecimalValue = computed(() => {
  const unicodeStr = props.glyphData?.unicode;
  if (!unicodeStr || !unicodeStr.startsWith('U+')) {
    return ''; // Return empty if format is wrong or missing
  }
  try {
    const hexPart = unicodeStr.substring(2);
    const decimalValue = parseInt(hexPart, 16);
    // Check if parsing resulted in a valid number
    if (isNaN(decimalValue)) {
        return '';
    }
    return decimalValue.toString(); // Return decimal value as string
  } catch (e) {
    return ''; // Return empty on error
  }
});

// --- Watcher for the Size Prop to update the local text input --- 
watch(() => props.glyphData?.size, (newSize) => {
  console.log("Watcher: props.glyphData.size changed ->", newSize);
  if (newSize && newSize.width !== undefined && newSize.height !== undefined) {
    // Update the local text input field when the prop changes
    sizeInput.value = `${newSize.width}x${newSize.height}`;
    sizeError.value = ''; // Clear error if size becomes valid
    console.log(`Watcher: Updated sizeInput to ${sizeInput.value}`);
  } else {
    // Clear the input if the size prop becomes null or invalid
    sizeInput.value = '';
    console.log("Watcher: Cleared sizeInput because prop size is invalid/null");
  }
}, { deep: true, immediate: true }); // immediate: true to set initial value, deep: true for object changes

// --- NEW METHOD to log and emit char_repr updates ---
function handleCharReprInput(newValue) {
  console.log('GlyphEditor: handleCharReprInput received:', JSON.stringify(newValue)); // Log the exact value
  emit('update:glyphField', { field: 'char_repr', value: newValue });
}

// Validate and emit size changes *from the text input*
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

// Check if a default palette was provided via props
const hasDefaultPalette = computed(() => props.headerDefaultPalette && props.headerDefaultPalette.length > 0);

// Function to emit the action to use the default palette
function applyDefaultPalette() {
    if (hasDefaultPalette.value) {
        emit('update:glyphField', { action: 'use_default_palette' });
    }
}

// Function to handle palette updates from the PaletteEditor component
function handleGlyphPaletteUpdate(newEntries) {
    // Reconstruct the full palette object before emitting
    const currentPalette = props.glyphData.palette || {};
    emit('update:glyphField', { 
      field: 'palette', 
      value: { ...currentPalette, entries: newEntries }
    });
}

// --- Bitmap Logic ---

const isDrawing = ref(false); // Track if mouse button is down
const selectedDrawChar = ref('.'); // Default for mono off
const selectedEraseChar = ref('.'); // Character used for erasing (right-click), default '.'
const currentCharToDraw = ref('.'); // Character being used in the current draw stroke

// Watch palette changes to keep selectedDrawChar valid
watch(() => props.palette, (newPalette) => {
    console.log("Palette prop changed, updating selectedDrawChar if needed.");
    
    // Determine the preferred default character
    let preferredChar = '.'; // Default if palette is empty or '#' not found
    if (newPalette && newPalette.some(p => p.char === '#')) {
      preferredChar = '#'; // Use '#' if it exists in the palette
    }
    else if (newPalette && newPalette.length > 0) {
      preferredChar = newPalette[0].char; // Fallback to the first char if '#' is not present
    }
    console.log(`Preferred draw char based on palette: ${preferredChar}`);

    // Check if the current selection is still valid in the new palette
    const currentSelectionValid = newPalette && newPalette.some(p => p.char === selectedDrawChar.value);

    // Update selectedDrawChar only if it's invalid OR if the preferred char exists and isn't already selected
    if (!currentSelectionValid || (preferredChar !== '.' && selectedDrawChar.value !== preferredChar)) {
        selectedDrawChar.value = preferredChar;
        console.log(`Updating selectedDrawChar to: ${selectedDrawChar.value}`);
    } else {
        console.log(`Keeping current selectedDrawChar: ${selectedDrawChar.value}`);
    }

    // Reset erase char to '.' for simplicity
    selectedEraseChar.value = '.'; 
     if (!isDrawing.value) {
      currentCharToDraw.value = selectedDrawChar.value; 
  }
}, { immediate: true, deep: true }); 

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
  
  // Determine the character to use for padding - always use selectedDrawChar
  const defaultChar = selectedDrawChar.value;
  console.log(`Resizing: Using defaultChar: ${defaultChar}`);

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

// Determine valid characters from the palette
const validDrawChars = computed(() => {
  return props.palette.map(p => p.char);
});

// Check if a character is valid in the palette
function isCharValid(char) {
  return validDrawChars.value.includes(char);
}

// Dynamic grid style based on size AND editorCellSize
const gridStyle = computed(() => {
  if (!props.glyphData || !props.glyphData.size) {
    return {};
  }
  const { width, height } = props.glyphData.size;
  const cellSizePx = `${editorCellSize.value}px`; // Use reactive size
  return {
    display: 'grid',
    'grid-template-columns': `repeat(${width}, ${cellSizePx})`,
    'grid-template-rows': `repeat(${height}, ${cellSizePx})`,
    gap: '1px', // Keep existing gap
    'justify-content': 'start',
    'align-content': 'start'
  };
});

// --- NEW: Dynamic Style for Cell Size only ---
const cellDynamicSizeStyle = computed(() => ({
  width: `${editorCellSize.value}px`,
  height: `${editorCellSize.value}px`,
  minWidth: `${editorCellSize.value}px`,
  minHeight: `${editorCellSize.value}px`,
}));

// Helper to get cell background color (always checks palette)
function getCellStyle(char) {
    const paletteEntry = props.palette.find(p => p.char === char);
    if (paletteEntry) {
       return {
         'background-color': paletteEntry.color,
         'border': '1px solid #eee' 
       };
    } else {
       // Still show invalid chars with dashed border
       return {
         'background-color': '#f0f0f0',
         'border': '1px dashed red' 
       };
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

// --- Handler for updates from BitmapTextView (Reverting to Simplified Logic) ---
function handleBitmapTextUpdate(newBitmapArrayFromSplit) {
  // *** SET FLAG ***
  isUpdatingFromTextArea.value = true;
  console.log("--- Text Area Update Start (Simplified Logic) ---");
  // console.log("Raw input array:", JSON.stringify(newBitmapArrayFromSplit)); // Keep console less noisy unless debugging

  // Calculate dimensions: Width from first line, Height from total lines
  const newHeight = newBitmapArrayFromSplit.length;
  const newWidth = String(newBitmapArrayFromSplit[0] || '').length; // Width based ONLY on the first line
  console.log(`Simplified Logic Calculated dimensions: ${newWidth}x${newHeight}`);

  // Get current dimensions for comparison later
  const currentSize = props.glyphData?.size;
  const currentWidth = currentSize?.width ?? 0;
  const currentHeight = currentSize?.height ?? 0;
  // console.log(`Current dimensions: ${currentWidth}x${currentHeight}`);

  // --- REMOVED Normalization Step --- 

  // Emit the raw bitmap array directly from text area split
  emit('update:glyphField', { field: 'bitmap', value: newBitmapArrayFromSplit }); 
  // console.log("Emitted raw bitmap array:", JSON.stringify(newBitmapArrayFromSplit));

  // Check if dimensions actually changed (based on first line width & total height)
  // and emit size update if needed
  if (newWidth !== currentWidth || newHeight !== currentHeight) {
    console.log(`Simplified Logic: Emitting size update ${currentWidth}x${currentHeight} -> ${newWidth}x${newHeight}`);
    emit('update:glyphField', { field: 'size', value: { width: newWidth, height: newHeight } });
  } else {
    // console.log("Simplified Logic: Size did not change.");
  }

  // *** RESET FLAG after Vue processes updates ***
  nextTick(() => {
    isUpdatingFromTextArea.value = false;
  });
  console.log("--- Text Area Update End (Simplified Logic) ---");
}

// --- NEW: Cell Size Control Functions ---
function increaseCellSize() {
  editorCellSize.value += 4; // Increase by 4px
}
function decreaseCellSize() {
  if (editorCellSize.value > 8) { // Prevent going too small
    editorCellSize.value -= 4; // Decrease by 4px
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
  line-height: 0; /* Prevent extra space around buttons */
}

.bitmap-cell {
  width: 24px; /* Explicit width (will be overridden by inline style)*/
  height: 24px; /* Explicit height (will be overridden by inline style)*/
  max-width: 24px; 
  max-height: 24px;
  min-width: 24px; 
  min-height: 24px;
  padding: 0 !important; 
  border-radius: 0 !important; 
  border: none;
  box-shadow: none !important; 
}

/* Optional: change cursor */
.bitmap-cell:hover {
  cursor: pointer; 
  border: 1px solid #aaa !important; 
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