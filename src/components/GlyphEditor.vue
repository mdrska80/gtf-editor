<template>
  <v-container v-if="glyphData">

    <!--
    <h1>{{ glyphData.name }}</h1>
    -->

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
      <GlyphMetadataEditor 
        :glyph-data="glyphData"
        @update:glyphField="$emit('update:glyphField', $event)"
      />

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
        
        <BitmapGrid
          :bitmap="glyphData.bitmap"
          :size="glyphData.size"
          :palette="props.palette"
          :selected-draw-char="selectedDrawChar"
          :selected-erase-char="selectedEraseChar"
          @update:bitmap="handleBitmapUpdate"
        />

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
import PaletteEditor from './PaletteEditor.vue';
import BitmapTextView from './BitmapTextView.vue';
import GlyphTextView from './GlyphTextView.vue';
import GlyphMetadataEditor from './GlyphMetadataEditor.vue';
import BitmapGrid from './BitmapGrid.vue';

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
const editorCellSize = ref(48); // Default cell size in pixels (Changed from 24)

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

const selectedDrawChar = ref('.'); // Default for mono off
const selectedEraseChar = ref('.'); // Character used for erasing (right-click), default '.'

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
  
  // Determine the character to use for padding - always use '.'
  const defaultChar = '.';
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

// Add new handler for bitmap updates from BitmapGrid
function handleBitmapUpdate(newBitmap) {
  emit('update:glyphField', { field: 'bitmap', value: newBitmap });
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