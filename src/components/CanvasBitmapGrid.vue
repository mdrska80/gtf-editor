<template>
  <div class="canvas-bitmap-editor">
    <!-- Canvas Controls - Compact Style -->
    <div class="editor-controls mb-3">
      <v-card class="controls-card-compact" variant="outlined">
        <v-card-text class="controls-content-compact">
          <div class="controls-row-compact">
            <div class="control-group-compact">
              <span class="control-label-readable">Cell Size</span>
              <div class="size-controls-compact">
                <v-btn
                  prepend-icon="mdi-minus"
                  variant="elevated"
                  size="small"
                  :disabled="editorCellSize <= 4"
                  @click="decreaseCellSize"
                  class="cell-size-btn-compact"
                >
                </v-btn>
                <v-chip class="size-display-compact mx-2" label>{{ editorCellSize }}px</v-chip>
                <v-btn
                  prepend-icon="mdi-plus"
                  variant="elevated"
                  size="small"
                  :disabled="editorCellSize >= 64"
                  @click="increaseCellSize"
                  class="cell-size-btn-compact"
                >
                </v-btn>
              </div>
            </div>
            
            <div class="control-group-compact">
              <span class="control-label-readable">Grid {{ size?.width || 0 }}×{{ size?.height || 0 }}</span>
              <v-chip class="cell-count-compact" size="small" color="primary" variant="tonal">
                {{ (size?.width || 0) * (size?.height || 0) }} cells
              </v-chip>
            </div>

            <div class="control-group-compact">
              <v-btn
                prepend-icon="mdi-grid"
                variant="elevated"
                size="small"
                color="secondary"
                @click="toggleGridLines"
                class="grid-toggle-btn-compact"
              >
                {{ showGridLines ? 'Hide' : 'Show' }} Grid
              </v-btn>
            </div>

            <!-- Performance Indicator -->
            <div class="control-group-compact">
              <v-chip 
                :color="performanceColor" 
                size="small" 
                variant="tonal"
                :prepend-icon="performanceIcon"
                class="performance-chip-compact"
              >
                {{ performanceText }}
              </v-chip>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-container" @contextmenu.prevent>
      <div
        v-if="size && bitmap"
        class="canvas-wrapper"
        :class="{ 'show-grid-lines': showGridLines }"
      >
        <!-- Main Canvas Element -->
        <canvas
          ref="canvasRef"
          class="bitmap-canvas"
          :width="canvasWidth"
          :height="canvasHeight"
          @mousedown.prevent="handleCanvasMouseDown"
          @mousemove="handleCanvasMouseMove"
          @mouseup="handleCanvasMouseUp"
          @mouseleave="handleCanvasMouseLeave"
          @wheel="handleCanvasWheel"
          @contextmenu.prevent
        ></canvas>

        <!-- Cursor Overlay for Visual Feedback -->
        <div
          v-if="cursorPosition"
          class="cursor-overlay"
          :style="cursorStyle"
        ></div>

        <!-- Performance Monitor (Development) -->
        <div v-if="showPerformanceMonitor" class="performance-monitor">
          <div class="perf-stat">FPS: {{ currentFPS }}</div>
          <div class="perf-stat">Render: {{ lastRenderTime }}ms</div>
          <div class="perf-stat">Cells: {{ totalCells }}</div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="empty-state">
        <v-icon size="64" color="grey-lighten-2">mdi-canvas</v-icon>
        <p class="text-grey-lighten-1 mt-2">No bitmap data or size defined</p>
        <p class="text-caption text-grey-lighten-2">Canvas Renderer Ready</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';

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

// State
const canvasRef = ref(null);
const editorCellSize = ref(24); // Default cell size for comfortable editing
const isDrawing = ref(false);
const currentDrawChar = ref('.');
const showGridLines = ref(true);
const cursorPosition = ref(null);
const showPerformanceMonitor = ref(false); // Enable for development

// Performance Monitoring
const currentFPS = ref(60);
const lastRenderTime = ref(0);
const frameCount = ref(0);
const lastFrameTime = ref(performance.now());

// Canvas Dimensions
const canvasWidth = computed(() => {
  if (!props.size) return 400;
  return props.size.width * editorCellSize.value + (showGridLines.value ? props.size.width + 1 : 0);
});

const canvasHeight = computed(() => {
  if (!props.size) return 400;
  return props.size.height * editorCellSize.value + (showGridLines.value ? props.size.height + 1 : 0);
});

// Performance Indicators
const totalCells = computed(() => (props.size?.width || 0) * (props.size?.height || 0));

const performanceColor = computed(() => {
  if (totalCells.value < 1000) return 'success';
  if (totalCells.value < 5000) return 'warning';
  return 'error';
});

const performanceIcon = computed(() => {
  if (totalCells.value < 1000) return 'mdi-speedometer';
  if (totalCells.value < 5000) return 'mdi-speedometer-medium';
  return 'mdi-speedometer-slow';
});

const performanceText = computed(() => {
  if (totalCells.value < 1000) return 'Optimal';
  if (totalCells.value < 5000) return 'Good';
  return 'Heavy';
});

// Cursor Style with Color Preview
const cursorStyle = computed(() => {
  if (!cursorPosition.value) return { display: 'none' };
  
  const pos = cursorPosition.value;
  const cellSize = editorCellSize.value;
  const gridOffset = showGridLines.value ? 1 : 0;
  const wrapperPadding = 16; // Account for canvas-wrapper padding
  
  // Get the color that will be applied
  const previewChar = props.selectedDrawChar;
  const paletteEntry = props.palette?.find(p => p.char === previewChar);
  const previewColor = paletteEntry?.color || '#888888';
  
  return {
    position: 'absolute',
    left: `${pos.x * cellSize + pos.x * gridOffset + gridOffset + wrapperPadding}px`,
    top: `${pos.y * cellSize + pos.y * gridOffset + gridOffset + wrapperPadding}px`,
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    border: '2px solid #ffffff',
    backgroundColor: previewColor,
    opacity: '0.7',
    pointerEvents: 'none',
    borderRadius: '2px',
    zIndex: 10,
    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
  };
});

// Control Functions
function increaseCellSize() {
  if (editorCellSize.value < 64) {
    editorCellSize.value += 2;
    nextTick(renderCanvas);
  }
}

function decreaseCellSize() {
  if (editorCellSize.value > 4) {
    editorCellSize.value -= 2;
    nextTick(renderCanvas);
  }
}

function toggleGridLines() {
  showGridLines.value = !showGridLines.value;
  nextTick(renderCanvas);
}

// Canvas Interaction Handlers
function handleCanvasMouseDown(event) {
  const coords = getGridCoordinates(event);
  if (!coords) return;
  
  isDrawing.value = true;
  currentDrawChar.value = event.button === 0 ? props.selectedDrawChar : props.selectedEraseChar;
  updateBitmapCell(coords.x, coords.y, currentDrawChar.value);
}

function handleCanvasMouseMove(event) {
  const coords = getGridCoordinates(event);
  
  if (coords) {
    cursorPosition.value = coords;
    
    if (isDrawing.value) {
      updateBitmapCell(coords.x, coords.y, currentDrawChar.value);
    }
  } else {
    cursorPosition.value = null;
  }
}

function handleCanvasMouseUp() {
  isDrawing.value = false;
}

function handleCanvasMouseLeave() {
  isDrawing.value = false;
  cursorPosition.value = null;
}

function handleCanvasWheel(event) {
  // Only zoom when Ctrl/Cmd is held
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault(); // Prevent browser zoom
    
    const zoomStep = 2;
    const currentSize = editorCellSize.value;
    
    if (event.deltaY < 0) {
      // Zoom in (wheel up)
      if (currentSize < 64) {
        editorCellSize.value = Math.min(64, currentSize + zoomStep);
        nextTick(renderCanvas);
      }
    } else {
      // Zoom out (wheel down)
      if (currentSize > 4) {
        editorCellSize.value = Math.max(4, currentSize - zoomStep);
        nextTick(renderCanvas);
      }
    }
  }
}

// Helper Functions
function getGridCoordinates(event) {
  if (!canvasRef.value || !props.size) return null;
  
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const cellSize = editorCellSize.value;
  const gridOffset = showGridLines.value ? 1 : 0;
  
  // Calculate grid position
  const gridX = Math.floor((x - gridOffset) / (cellSize + gridOffset));
  const gridY = Math.floor((y - gridOffset) / (cellSize + gridOffset));
  
  // Check bounds
  if (gridX >= 0 && gridX < props.size.width && gridY >= 0 && gridY < props.size.height) {
    return { x: gridX, y: gridY };
  }
  
  return null;
}

function updateBitmapCell(x, y, char) {
  if (!props.bitmap || y >= props.bitmap.length) return;
  
  const newBitmap = [...props.bitmap];
  const row = newBitmap[y];
  if (typeof row === 'string') {
    const rowChars = row.split('');
    if (x < rowChars.length && rowChars[x] !== char) {
      rowChars[x] = char;
      newBitmap[y] = rowChars.join('');
      emit('update:bitmap', newBitmap);
    }
  }
}

// Canvas Rendering
function renderCanvas() {
  if (!canvasRef.value || !props.size || !props.bitmap) return;
  
  const startTime = performance.now();
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const cellSize = editorCellSize.value;
  const gridOffset = showGridLines.value ? 1 : 0;
  
  // Draw grid background if enabled
  if (showGridLines.value) {
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= props.size.width; x++) {
      const xPos = x * (cellSize + gridOffset) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= props.size.height; y++) {
      const yPos = y * (cellSize + gridOffset) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvas.width, yPos);
      ctx.stroke();
    }
  }
  
  // Draw bitmap cells
  for (let y = 0; y < props.bitmap.length && y < props.size.height; y++) {
    const row = props.bitmap[y];
    if (typeof row === 'string') {
      for (let x = 0; x < row.length && x < props.size.width; x++) {
        const char = row[x];
        const color = getCellColor(char);
        
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(
            x * (cellSize + gridOffset) + gridOffset,
            y * (cellSize + gridOffset) + gridOffset,
            cellSize,
            cellSize
          );
        }
      }
    }
  }
  
  // Performance tracking
  const endTime = performance.now();
  lastRenderTime.value = Math.round((endTime - startTime) * 100) / 100;
  
  // FPS calculation
  frameCount.value++;
  if (endTime - lastFrameTime.value >= 1000) {
    currentFPS.value = Math.round((frameCount.value * 1000) / (endTime - lastFrameTime.value));
    frameCount.value = 0;
    lastFrameTime.value = endTime;
  }
}

function getCellColor(char) {
  if (!props.palette) return 'transparent';
  const paletteEntry = props.palette.find(p => p && p.char === char);
  return paletteEntry ? paletteEntry.color : 'transparent';
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Create a clean export canvas without UI overlays (grid lines, cursors, etc.)
 * @param {number} scaleFactor - Multiplier for output resolution (1x, 2x, 4x, etc.)
 * @param {string} format - 'png' or 'bmp'
 * @param {string} backgroundColor - Background color for BMP format (default: white)
 * @returns {HTMLCanvasElement} Clean canvas ready for export
 */
function createExportCanvas(scaleFactor = 1, format = 'png', backgroundColor = '#ffffff') {
  if (!props.size || !props.bitmap) {
    throw new Error('No bitmap data or size available for export');
  }

  // Calculate export dimensions (no grid lines, pure bitmap cells)
  const cellSize = Math.max(1, Math.round(editorCellSize.value * scaleFactor));
  const exportWidth = props.size.width * cellSize;
  const exportHeight = props.size.height * cellSize;

  // Create dedicated export canvas
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const ctx = exportCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context for export canvas');
  }

  // Set background for BMP format (PNG will have transparent background)
  if (format.toLowerCase() === 'bmp') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  }

  // Render bitmap cells (no grid lines, no UI overlays)
  for (let y = 0; y < props.bitmap.length && y < props.size.height; y++) {
    const row = props.bitmap[y];
    if (typeof row === 'string') {
      for (let x = 0; x < row.length && x < props.size.width; x++) {
        const char = row[x];
        const color = getCellColor(char);

        // For PNG: skip transparent cells to maintain transparency
        // For BMP: render all cells (transparent cells show background)
        if (color && (format.toLowerCase() === 'bmp' || color !== 'transparent')) {
          ctx.fillStyle = color === 'transparent' ? backgroundColor : color;
          ctx.fillRect(
            x * cellSize,
            y * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
  }

  return exportCanvas;
}

/**
 * Export bitmap as BMP with solid background
 * @param {number} scaleFactor - Resolution multiplier (default: 1x)
 * @param {string} backgroundColor - Background color (default: white)
 * @returns {Promise<Blob>} BMP blob data (as PNG with solid background)
 */
async function exportAsBMP(scaleFactor = 1, backgroundColor = '#ffffff') {
  try {
    const exportCanvas = createExportCanvas(scaleFactor, 'bmp', backgroundColor);
    
    // Note: Canvas toBlob doesn't support true BMP format
    // We export as PNG with solid background, which is compatible for most uses
    return new Promise((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create BMP blob'));
        }
      }, 'image/png', 1.0);
    });
  } catch (error) {
    throw new Error(`BMP export failed: ${error.message}`);
  }
}

/**
 * Get export data URL for preview or direct download
 * @param {string} format - 'png' or 'bmp'
 * @param {number} scaleFactor - Resolution multiplier
 * @param {string} backgroundColor - Background color for BMP
 * @returns {string} Data URL string
 */
function getExportDataURL(format = 'png', scaleFactor = 1, backgroundColor = '#ffffff') {
  try {
    const exportCanvas = createExportCanvas(scaleFactor, format, backgroundColor);
    return exportCanvas.toDataURL('image/png', 1.0);
  } catch (error) {
    throw new Error(`Export data URL failed: ${error.message}`);
  }
}

/**
 * Get export information for UI display
 * @param {number} scaleFactor - Resolution multiplier
 * @returns {Object} Export dimensions and file size estimate
 */
function getExportInfo(scaleFactor = 1) {
  if (!props.size) return null;

  const cellSize = Math.max(1, Math.round(editorCellSize.value * scaleFactor));
  const width = props.size.width * cellSize;
  const height = props.size.height * cellSize;
  
  // Rough file size estimation
  const pixelCount = width * height;
  const estimatedBmpSizeKB = Math.round((pixelCount * 4) / 1024); // Uncompressed estimate

  return {
    dimensions: { width, height },
    cellSize,
    scaleFactor,
    estimatedFileSize: {
      bmp: `~${estimatedBmpSizeKB}KB`
    }
  };
}

// Expose export methods for parent components
defineExpose({
  exportAsBMP,
  getExportDataURL,
  getExportInfo,
  createExportCanvas
});

// ============================================================================
// END EXPORT FUNCTIONALITY
// ============================================================================

// Watchers
watch([() => props.bitmap, () => props.size, () => props.palette], () => {
  nextTick(renderCanvas);
}, { deep: true });

watch(editorCellSize, () => {
  nextTick(renderCanvas);
});

watch(showGridLines, () => {
  nextTick(renderCanvas);
});

// Lifecycle
onMounted(() => {
  nextTick(renderCanvas);
});
</script>

<style scoped>
.canvas-bitmap-editor {
  width: 100%;
  user-select: none;
}

/* Compact Canvas Controls - Matching Export Style */
.controls-card-compact {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
}

.controls-content-compact {
  padding: 12px !important;
}

.controls-row-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.control-group-compact {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label-readable {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  min-width: 70px;
}

.size-controls-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}

.size-display-compact {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 700;
  min-width: 50px;
  text-align: center;
}

.cell-count-compact {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 600;
}

.render-mode-compact {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.grid-toggle-btn-compact {
  font-weight: 600;
  text-transform: none;
  min-width: 100px;
}

.cell-size-btn-compact {
  text-transform: none;
  font-weight: 600;
  min-width: 80px;
}

.performance-chip-compact {
  font-weight: 600;
}

.canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 300px;
}

.canvas-wrapper {
  position: relative;
  background: linear-gradient(135deg, 
    #f8f9fa 0%,
    #ffffff 100%);
  border-radius: 12px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  padding: 16px;
  overflow: auto;
  max-height: 80vh;
}

.bitmap-canvas {
  cursor: crosshair;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cursor-overlay {
  transition: all 0.1s ease;
}

.performance-monitor {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
  z-index: 20;
}

.perf-stat {
  margin-bottom: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  width: 100%;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .canvas-wrapper {
    background: linear-gradient(135deg, 
      #1a1a1a 0%,
      #2d2d2d 100%);
  }
  
  .bitmap-canvas {
    background: #2d2d2d;
  }
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
  
  .canvas-wrapper {
    padding: 8px;
  }
}
</style> 