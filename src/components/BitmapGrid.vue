<template>
  <div class="bitmap-editor">
    <!-- Enhanced Controls Header -->
    <div class="editor-controls mb-4">
      <v-card class="controls-card" variant="outlined">
        <v-card-text class="pa-3">
          <div class="d-flex align-center justify-space-between">
            <div class="control-group">
              <span class="control-label">Cell Size</span>
              <div class="size-controls">
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="outlined"
                  :disabled="editorCellSize <= 16"
                  @click="decreaseCellSize"
                ></v-btn>
                <v-chip class="size-display mx-2" label>{{ editorCellSize }}px</v-chip>
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="outlined"
                  :disabled="editorCellSize >= 80"
                  @click="increaseCellSize"
                ></v-btn>
              </div>
            </div>
            
            <div class="control-group">
              <span class="control-label">Grid {{ size?.width || 0 }}×{{ size?.height || 0 }}</span>
              <v-chip class="cell-count" size="small" color="primary" variant="outlined">
                {{ (size?.width || 0) * (size?.height || 0) }} cells
              </v-chip>
            </div>

            <div class="control-group">
              <v-btn
                prepend-icon="mdi-grid"
                variant="outlined"
                size="small"
                @click="toggleGridLines"
              >
                {{ showGridLines ? 'Hide' : 'Show' }} Grid
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Enhanced Grid Container -->
    <div class="grid-container" @contextmenu.prevent>
      <div
        v-if="size && bitmap"
        class="bitmap-grid-wrapper"
        :class="{ 'show-grid-lines': showGridLines }"
      >
        <!-- Grid Background Pattern -->
        <div class="grid-background" :style="gridBackgroundStyle"></div>
        
        <!-- Main Bitmap Grid -->
        <div
          class="bitmap-grid"
          :style="gridStyle"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
          @contextmenu.prevent"
        >
          <template v-for="(row, y) in bitmap" :key="y">
            <div
              v-for="(char, x) in row.split('')"
              :key="`${x}-${y}`"
              class="bitmap-cell"
              :class="{
                'cell-hovered': hoveredX === x && hoveredY === y,
                'cell-drawing': isDrawing,
                'cell-invalid': !isCharValid(char),
              }"
              :style="[getCellStyle(char), cellDynamicSizeStyle]"
              @mousedown.prevent="startDrawing(x, y, $event)"
              @mouseenter="handleCellHover(x, y)"
              @mouseleave="handleCellLeave"
            >
              <!-- Cell Content -->
              <div class="cell-content">
                <div v-if="!isCharValid(char)" class="invalid-indicator">
                  <v-icon size="x-small" color="error">mdi-alert</v-icon>
                </div>
              </div>
              
              <!-- Hover Overlay -->
              <div class="cell-hover-overlay"></div>
            </div>
          </template>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="empty-state">
        <v-icon size="64" color="grey-lighten-2">mdi-grid-large</v-icon>
        <p class="text-grey-lighten-1 mt-2">No bitmap data or size defined</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
  bitmap: {
    type: Array,
    required: true,
  },
  size: {
    type: Object,
    required: true,
  },
  palette: {
    type: Array,
    required: true,
  },
  selectedDrawChar: {
    type: String,
    required: true,
  },
  selectedEraseChar: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:bitmap']);

// Enhanced State
const editorCellSize = ref(48);
const hoveredX = ref(null);
const hoveredY = ref(null);
const isDrawing = ref(false);
const currentCharToDraw = ref('.');
const showGridLines = ref(true);

// Grid style computations
const gridStyle = computed(() => {
  if (!props.size) return {};
  const { width, height } = props.size;
  const cellSizePx = `${editorCellSize.value}px`;
  return {
    display: 'grid',
    'grid-template-columns': `repeat(${width}, ${cellSizePx})`,
    'grid-template-rows': `repeat(${height}, ${cellSizePx})`,
    gap: showGridLines.value ? '2px' : '1px',
    'justify-content': 'center',
    'align-content': 'center',
    padding: '8px',
    position: 'relative',
  };
});

const gridBackgroundStyle = computed(() => {
  if (!props.size || !showGridLines.value) return {};
  const { width, height } = props.size;
  const cellSize = editorCellSize.value + 2; // Include gap
  return {
    width: `${width * cellSize}px`,
    height: `${height * cellSize}px`,
    backgroundImage: `
      linear-gradient(to right, rgba(var(--v-theme-outline), 0.2) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(var(--v-theme-outline), 0.2) 1px, transparent 1px)
    `,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    zIndex: 0,
  };
});

const cellDynamicSizeStyle = computed(() => ({
  width: `${editorCellSize.value}px`,
  height: `${editorCellSize.value}px`,
  minWidth: `${editorCellSize.value}px`,
  minHeight: `${editorCellSize.value}px`,
}));

// Enhanced Control Functions
function increaseCellSize() {
  if (editorCellSize.value < 80) {
    editorCellSize.value += 4;
  }
}

function decreaseCellSize() {
  if (editorCellSize.value > 16) {
    editorCellSize.value -= 4;
  }
}

function toggleGridLines() {
  showGridLines.value = !showGridLines.value;
}

// Enhanced Drawing Functions
function startDrawing(x, y, event) {
  isDrawing.value = true;
  currentCharToDraw.value =
    event.button === 0 ? props.selectedDrawChar : props.selectedEraseChar;
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
  // Don't clear immediately - let the preview panel have a moment
  setTimeout(() => {
    if (!isDrawing.value) {
      hoveredX.value = null;
      hoveredY.value = null;
    }
  }, 100);
}

function stopDrawing() {
  isDrawing.value = false;
}

function updateCell(x, y, charToUse) {
  if (!props.bitmap || y >= props.bitmap.length) return;

  const newBitmap = [...props.bitmap];
  const rowChars = newBitmap[y].split('');

  if (x < rowChars.length && rowChars[x] !== charToUse) {
    rowChars[x] = charToUse;
    newBitmap[y] = rowChars.join('');
    emit('update:bitmap', newBitmap);
  }
}

// Enhanced Helper Functions
const validDrawChars = computed(() => props.palette.map((p) => p.char));

function isCharValid(char) {
  return validDrawChars.value.includes(char);
}

function getCellStyle(char) {
  const paletteEntry = props.palette.find((p) => p.char === char);
  if (paletteEntry) {
    return {
      '--cell-color': paletteEntry.color,
      backgroundColor: paletteEntry.color,
    };
  }
  return {
    '--cell-color': 'rgb(var(--v-theme-error))',
    backgroundColor: 'rgb(var(--v-theme-surface-variant))',
  };
}
</script>

<style scoped>
.bitmap-editor {
  width: 100%;
  user-select: none;
}

.editor-controls .controls-card {
  background: rgba(var(--v-theme-surface-bright), 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
  min-width: 70px;
}

.size-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.size-display {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.grid-container {
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 300px;
}

.bitmap-grid-wrapper {
  position: relative;
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-surface), 0.9) 0%,
    rgba(var(--v-theme-surface-bright), 0.95) 100%);
  border-radius: 12px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bitmap-grid-wrapper:hover {
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.bitmap-grid {
  position: relative;
  z-index: 2;
}

.grid-background {
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.show-grid-lines .grid-background {
  opacity: 1;
}

.bitmap-cell {
  position: relative;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.bitmap-cell:hover {
  transform: scale(1.05);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(var(--v-theme-primary), 0.6);
  z-index: 10;
}

.cell-hovered {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 
    0 0 0 3px rgba(var(--v-theme-primary), 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2) !important;
  transform: scale(1.1) !important;
  z-index: 20;
}

.cell-drawing {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}

.cell-invalid {
  background: repeating-linear-gradient(
    45deg,
    rgba(var(--v-theme-error), 0.1),
    rgba(var(--v-theme-error), 0.1) 2px,
    transparent 2px,
    transparent 4px
  ) !important;
  border-color: rgb(var(--v-theme-error));
}

.cell-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.cell-hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05));
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.bitmap-cell:hover .cell-hover-overlay {
  opacity: 1;
}

.invalid-indicator {
  animation: blink 1s infinite;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  width: 100%;
}

/* Animations */
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .editor-controls .control-group {
    flex-direction: column;
    gap: 4px;
  }
  
  .control-label {
    min-width: auto;
    font-size: 0.8rem;
  }
}
</style>
