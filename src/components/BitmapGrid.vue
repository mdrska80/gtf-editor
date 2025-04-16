<template>
  <div>
    <!-- Cell Size Controls -->
    <div class="mb-2">
      <span class="mr-2 text-caption">Cell Size:</span>
      <v-btn icon="mdi-minus" size="x-small" @click="decreaseCellSize" :disabled="editorCellSize <= 8"></v-btn>
      <span class="mx-2">{{ editorCellSize }}px</span>
      <v-btn icon="mdi-plus" size="x-small" @click="increaseCellSize"></v-btn>
    </div>

    <!-- Grid Container -->
    <div 
      v-if="size && bitmap"
      style="background-color: #000000; padding: 5px; border-radius: 4px; display: flex; justify-content: center;"
      @contextmenu.prevent
    >
      <div 
        class="bitmap-grid"
        :style="gridStyle"
        @mouseup="stopDrawing" 
        @mouseleave="stopDrawing" 
        @contextmenu.prevent
      >
        <template v-for="(row, y) in bitmap" :key="y">
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
                :class="{
                  'highlight-row': hoveredY === y,
                  'highlight-col': hoveredX === x,
                  'highlight-current': hoveredX === x && hoveredY === y
                }"
                :style="[getCellStyle(char), cellDynamicSizeStyle]"
                icon 
                variant="flat" 
                size="x-small" 
                :ripple="false"
                @mousedown.prevent="startDrawing(x, y, $event)" 
                @mouseenter="handleCellHover(x, y)" 
                @mouseleave="handleCellLeave"
              >
                <span v-if="!isCharValid(char)" class="invalid-char-indicator">{{ char }}</span>
              </v-btn>
            </template>
          </v-tooltip>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  bitmap: {
    type: Array,
    required: true
  },
  size: {
    type: Object,
    required: true
  },
  palette: {
    type: Array,
    required: true
  },
  selectedDrawChar: {
    type: String,
    required: true
  },
  selectedEraseChar: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:bitmap']);

// Cell size state
const editorCellSize = ref(32);
const hoveredX = ref(null);
const hoveredY = ref(null);

// Drawing state
const isDrawing = ref(false);
const currentCharToDraw = ref('.');

// Grid style computations
const gridStyle = computed(() => {
  if (!props.size) return {};
  const { width, height } = props.size;
  const cellSizePx = `${editorCellSize.value}px`;
  return {
    display: 'grid',
    'grid-template-columns': `repeat(${width}, ${cellSizePx})`,
    'grid-template-rows': `repeat(${height}, ${cellSizePx})`,
    gap: '1px',
    'justify-content': 'start',
    'align-content': 'start'
  };
});

const cellDynamicSizeStyle = computed(() => ({
  width: `${editorCellSize.value}px`,
  height: `${editorCellSize.value}px`,
  minWidth: `${editorCellSize.value}px`,
  minHeight: `${editorCellSize.value}px`,
}));

// Cell size control functions
function increaseCellSize() {
  editorCellSize.value += 4;
}

function decreaseCellSize() {
  if (editorCellSize.value > 8) {
    editorCellSize.value -= 4;
  }
}

// Drawing functions
function startDrawing(x, y, event) {
  isDrawing.value = true;
  currentCharToDraw.value = event.button === 0 ? props.selectedDrawChar : props.selectedEraseChar;
  updateCell(x, y, currentCharToDraw.value);
}

function handleCellHover(x, y) {
  hoveredX.value = x;
  hoveredY.value = y;
  if (isDrawing.value) {
    updateCell(x, y, currentCharToDraw.value);
  }
}

function handleCellLeave() {
  hoveredX.value = null;
  hoveredY.value = null;
}

function stopDrawing() {
  isDrawing.value = false;
}

function updateCell(x, y, charToUse) {
  if (!props.bitmap || y >= props.bitmap.length) return;
  
  const newBitmap = [...props.bitmap];
  let rowChars = newBitmap[y].split('');
  
  if (x < rowChars.length && rowChars[x] !== charToUse) {
    rowChars[x] = charToUse;
    newBitmap[y] = rowChars.join('');
    emit('update:bitmap', newBitmap);
  }
}

// Validation functions
const validDrawChars = computed(() => props.palette.map(p => p.char));

function isCharValid(char) {
  return validDrawChars.value.includes(char);
}

function getCellStyle(char) {
  const paletteEntry = props.palette.find(p => p.char === char);
  if (paletteEntry) {
    return {
      'background-color': paletteEntry.color,
      'border': '1px solid #eee'
    };
  }
  return {
    'background-color': '#f0f0f0',
    'border': '1px dashed red'
  };
}
</script>

<style scoped>
.bitmap-grid {
  line-height: 0;
}

.bitmap-cell {
  width: 24px;
  height: 24px;
  max-width: 24px;
  max-height: 24px;
  min-width: 24px;
  min-height: 24px;
  padding: 0 !important;
  border-radius: 0 !important;
  border: none;
  box-shadow: none !important;
  transition: all 0.1s ease;
}

.bitmap-cell:hover {
  cursor: pointer;
  border: 1px solid #aaa !important;
}

.highlight-row {
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.3) !important;
}

.highlight-col {
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.3) !important;
}

.highlight-current {
  border: 2px solid #ffff00 !important;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.8) !important;
  z-index: 1;
}

.invalid-char-indicator {
  color: red;
  font-weight: bold;
  font-size: 10px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
</style> 