<template>
  <div class="departure-preview-page">
    <!-- ============================================================ -->
    <!-- TOP: Sticky preview panel - always visible                    -->
    <!-- ============================================================ -->
    <div class="preview-sticky-panel">
      <div class="preview-panel-inner">
        <!-- Display bezel -->
        <div class="display-bezel">
          <canvas
            ref="displayCanvas"
            class="display-canvas"
            :width="canvasWidth"
            :height="canvasHeight"
          ></canvas>
        </div>

        <!-- Toolbar next to display -->
        <div class="preview-sidebar">
          <div class="display-info">
            <v-chip size="small" variant="tonal" color="primary" label>
              {{ displayWidth }}×{{ displayHeight }}px
            </v-chip>
            <v-chip size="small" variant="tonal" label>
              {{ pixelScale }}× zoom
            </v-chip>
            <v-chip size="small" variant="tonal" label>
              {{ hasGlyphs ? glyphCount + ' glyphs' : 'No font' }}
            </v-chip>
          </div>
          <div class="preview-controls">
            <div class="d-flex align-center gap-1">
              <v-text-field
                v-model.number="displayWidth"
                label="Width"
                variant="outlined"
                density="compact"
                type="number"
                :min="32"
                :max="1024"
                hide-details
                class="size-field"
              />
              <span class="text-caption font-weight-bold">×</span>
              <v-text-field
                v-model.number="displayHeight"
                label="Height"
                variant="outlined"
                density="compact"
                type="number"
                :min="8"
                :max="512"
                hide-details
                class="size-field"
              />
              <v-text-field
                v-model.number="pixelScale"
                label="Zoom"
                variant="outlined"
                density="compact"
                type="number"
                :min="1"
                :max="8"
                hide-details
                style="max-width: 65px"
              />
            </div>
            <v-switch
              v-model="showGrid"
              label="Grid"
              density="compact"
              color="primary"
              hide-details
              class="mt-1"
            />
          </div>
          <div class="export-actions">
            <v-btn
              prepend-icon="mdi-content-copy"
              variant="elevated"
              size="small"
              color="secondary"
              :disabled="!hasGlyphs"
              block
              @click="copyToClipboard"
            >
              Copy Image
            </v-btn>
            <v-btn
              prepend-icon="mdi-file-image-outline"
              variant="elevated"
              size="small"
              color="primary"
              :disabled="!hasGlyphs"
              block
              @click="exportAsPng"
            >
              Save PNG
            </v-btn>
          </div>
          <!-- Export status -->
          <v-alert
            v-if="exportStatus"
            :type="exportStatus.type"
            variant="tonal"
            density="compact"
            closable
            class="mt-2"
            @click:close="exportStatus = null"
          >
            {{ exportStatus.message }}
          </v-alert>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- BOTTOM: Scrollable configuration                              -->
    <!-- ============================================================ -->
    <div class="config-area">
      <v-row dense>
        <!-- Row 1: Header + Footer side by side -->
        <v-col cols="12">
          <div class="hf-row">
            <!-- Header -->
            <div class="hf-section hf-header">
              <div class="hf-label">
                <v-switch
                  v-model="showHeader"
                  label="Header"
                  density="compact"
                  color="primary"
                  hide-details
                  class="mt-0 compact-switch"
                />
                <v-btn
                  v-if="showHeader"
                  icon="mdi-plus"
                  size="x-small"
                  variant="tonal"
                  @click="headerLines.push({ text: '', color: '#FFFFFF' })"
                />
              </div>
              <template v-if="showHeader">
                <div
                  v-for="(line, idx) in headerLines"
                  :key="'h' + idx"
                  class="hf-line"
                >
                  <v-text-field
                    v-model="headerLines[idx].text"
                    :placeholder="'Line ' + (idx + 1)"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="flex-grow-1"
                  />
                  <v-text-field
                    v-model="headerLines[idx].color"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="max-width: 120px"
                  >
                    <template #prepend-inner>
                      <div class="color-dot" :style="{ backgroundColor: headerLines[idx].color }"></div>
                    </template>
                  </v-text-field>
                  <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="headerLines.splice(idx, 1)" />
                </div>
              </template>
            </div>
            <!-- Footer -->
            <div class="hf-section hf-footer">
              <div class="hf-label">
                <v-switch
                  v-model="showFooter"
                  label="Footer"
                  density="compact"
                  color="primary"
                  hide-details
                  class="mt-0 compact-switch"
                />
              </div>
              <div v-if="showFooter" class="hf-line">
                <v-text-field
                  v-model="footerText"
                  placeholder="Footer text"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-grow-1"
                />
              </div>
            </div>
          </div>
        </v-col>

        <!-- Row 2: Column definitions - compact table -->
        <v-col cols="12">
          <div class="cols-section">
            <div class="cols-bar">
              <span class="cols-title">Columns</span>
              <v-btn size="x-small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="addColumn">
                Add
              </v-btn>
            </div>
            <div class="cols-table" v-if="columns.length > 0">
              <div class="cols-thead">
                <span class="ct-name">Name</span>
                <span class="ct-x">X</span>
                <span class="ct-w">Width</span>
                <span class="ct-align">Align</span>
                <span class="ct-color">Color</span>
                <span class="ct-del"></span>
              </div>
              <div
                v-for="(col, idx) in columns"
                :key="'c' + idx"
                class="cols-row"
              >
                <v-text-field
                  v-model="col.label"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="ct-name"
                  placeholder="Name"
                />
                <v-text-field
                  v-model.number="col.x"
                  variant="outlined"
                  density="compact"
                  hide-details
                  type="number"
                  class="ct-x"
                />
                <v-text-field
                  v-model.number="col.width"
                  variant="outlined"
                  density="compact"
                  hide-details
                  type="number"
                  class="ct-w"
                />
                <v-btn-toggle
                  v-model="col.align"
                  density="compact"
                  mandatory
                  divided
                  class="ct-align align-toggle"
                >
                  <v-btn value="left" size="x-small" icon="mdi-format-align-left" />
                  <v-btn value="center" size="x-small" icon="mdi-format-align-center" />
                  <v-btn value="right" size="x-small" icon="mdi-format-align-right" />
                </v-btn-toggle>
                <v-text-field
                  v-model="col.color"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="ct-color"
                >
                  <template #prepend-inner>
                    <div class="color-dot" :style="{ backgroundColor: col.color }"></div>
                  </template>
                </v-text-field>
                <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="removeColumn(idx)" />
              </div>
            </div>
          </div>
        </v-col>

        <!-- Departure Data - Full Width -->
        <v-col cols="12">
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="config-title">
              <span>Departure Rows</span>
              <v-spacer />
              <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="addRow">
                Add
              </v-btn>
            </v-card-title>
            <v-card-text class="pa-2">
              <!-- Data table header -->
              <div class="data-table-header" v-if="columns.length > 0">
                <span class="data-row-num">#</span>
                <span
                  v-for="(col, ci) in columns"
                  :key="'dh' + ci"
                  class="data-col-header"
                  :style="{ flex: col.width }"
                >
                  {{ col.label }}
                </span>
                <span class="data-row-del"></span>
              </div>
              <!-- Data rows -->
              <div
                v-for="(row, ri) in rows"
                :key="'r' + ri"
                class="data-row"
              >
                <span class="data-row-num text-caption text-medium-emphasis">{{ ri + 1 }}</span>
                <v-text-field
                  v-for="(col, ci) in columns"
                  :key="'d' + ri + '-' + ci"
                  v-model="row.cells[ci]"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="data-cell"
                  :style="{ flex: col.width }"
                  :placeholder="col.label"
                />
                <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="rows.splice(ri, 1)" />
              </div>
              <p v-if="columns.length === 0" class="text-caption text-medium-emphasis pa-2">
                Add columns first.
              </p>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- XML Output/Input -->
        <v-col cols="12">
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="config-title">
              <v-icon size="small" class="mr-2">mdi-xml</v-icon>
              <span>XML Output</span>
              <v-spacer />
              <v-chip
                v-if="xmlParseError"
                size="small"
                color="error"
                variant="tonal"
                class="mr-2"
              >
                {{ xmlParseError }}
              </v-chip>
              <v-btn
                size="small"
                variant="tonal"
                prepend-icon="mdi-content-copy"
                @click="copyXmlToClipboard"
              >
                Copy XML
              </v-btn>
            </v-card-title>
            <v-card-text class="pa-2">
              <textarea
                ref="xmlTextarea"
                v-model="xmlContent"
                class="xml-editor"
                spellcheck="false"
                @input="onXmlInput"
              ></textarea>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useGtfStore } from '../composables/useGtfStore';
import { useOptimizedPalette, useOptimizedGlyphMap } from '../composables/usePerformanceOptimization';
import { useDepartureRenderer } from '../composables/useDepartureRenderer';
import { useDepartureXml } from '../composables/useDepartureXml';

const gtfStore = useGtfStore();

// =====================================================================
// CONFIGURATION STATE
// =====================================================================

// Display resolution (free input)
const displayWidth = ref(256);
const displayHeight = ref(64);
const pixelScale = ref(3);
const showGrid = ref(false);

// Header
const showHeader = ref(true);
const headerLines = ref([
  { text: 'Main Station', color: '#FFFFFF' },
]);

// Footer
const showFooter = ref(true);
const footerText = ref(formatCurrentDateTime());

// Columns definition
const columns = ref([
  { label: 'Line', x: 0, width: 25, align: 'left', color: '#FFE707' },
  { label: 'Destination', x: 30, width: 120, align: 'left', color: '#FFFFFF' },
  { label: 'Departure', x: 155, width: 30, align: 'right', color: '#FFFFFF' },
]);

// Departure rows - each row has cells matching columns
const rows = ref([
  { cells: ['7', 'Airport', ''] },
  { cells: ['10', 'Central Park', '5'] },
  { cells: ['9', 'University', ''] },
  { cells: ['16', 'Industrial Zone', ''] },
  { cells: ['15', 'City Hospital', ''] },
  { cells: ['5', 'Bus Depot', '23'] },
]);

// Export status
const exportStatus = ref(null);

// =====================================================================
// CANVAS & FONT DATA
// =====================================================================

const displayCanvas = ref(null);

const processedDefaultPalette = useOptimizedPalette(gtfStore.gtfData);
const glyphMap = useOptimizedGlyphMap(computed(() => gtfStore.gtfData.value?.glyphs));

const hasGlyphs = computed(() => gtfStore.gtfData.value?.glyphs?.length > 0);
const glyphCount = computed(() => gtfStore.gtfData.value?.glyphs?.length || 0);

const canvasWidth = computed(() => displayWidth.value * pixelScale.value);
const canvasHeight = computed(() => displayHeight.value * pixelScale.value);

// =====================================================================
// COMPOSABLES
// =====================================================================

const { renderDisplay, getGlyphHeight } = useDepartureRenderer({
  displayCanvas,
  displayWidth,
  displayHeight,
  pixelScale,
  showGrid,
  showHeader,
  headerLines,
  showFooter,
  footerText,
  columns,
  rows,
  processedDefaultPalette,
  glyphMap,
  hasGlyphs,
});

const { xmlContent, xmlParseError, onXmlInput, updateXmlFromState } = useDepartureXml({
  displayWidth,
  displayHeight,
  showHeader,
  headerLines,
  showFooter,
  footerText,
  columns,
  rows,
  getGlyphHeight,
});

// =====================================================================
// COLUMN / ROW MANAGEMENT
// =====================================================================

function addColumn()
{
  let nextX = 0;
  if (columns.value.length > 0)
  {
    const last = columns.value[columns.value.length - 1];
    nextX = last.x + last.width + 5;
  }
  columns.value.push({ label: '', x: nextX, width: 40, align: 'left', color: '#FFFFFF' });
  for (const row of rows.value)
  {
    row.cells.push('');
  }
}

function removeColumn(index)
{
  columns.value.splice(index, 1);
  for (const row of rows.value)
  {
    row.cells.splice(index, 1);
  }
}

function addRow()
{
  const cells = columns.value.map(() => '');
  rows.value.push({ cells });
}

// =====================================================================
// HELPERS
// =====================================================================

function formatCurrentDateTime()
{
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  return `${dayName} ${day}.${month}.${year}  ${hours}:${mins}`;
}

// =====================================================================
// EXPORT: PNG + CLIPBOARD
// =====================================================================

function getCanvasBase64()
{
  const canvas = displayCanvas.value;
  if (!canvas) return null;
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  return dataUrl.split(',')[1] || null;
}

async function exportAsPng()
{
  const base64Data = getCanvasBase64();
  if (!base64Data) return;

  try
  {
    const savePath = await save({
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
      defaultPath: `display_${displayWidth.value}x${displayHeight.value}.png`,
    });
    if (!savePath) return;

    await invoke('save_png_file', { path: savePath, base64Data });
    exportStatus.value = { type: 'success', message: `PNG saved to ${savePath}` };
  }
  catch (err)
  {
    exportStatus.value = { type: 'error', message: `Export failed: ${String(err)}` };
  }
}

async function copyToClipboard()
{
  const base64Data = getCanvasBase64();
  if (!base64Data) return;

  try
  {
    await invoke('copy_image_to_clipboard', { base64Data });
    exportStatus.value = { type: 'success', message: 'Image copied to clipboard.' };
  }
  catch (err)
  {
    exportStatus.value = { type: 'error', message: `Copy failed: ${String(err)}` };
  }
}

async function copyXmlToClipboard()
{
  try
  {
    await invoke('copy_text_to_clipboard', { text: xmlContent.value });
    exportStatus.value = { type: 'success', message: 'XML copied to clipboard.' };
  }
  catch (err)
  {
    exportStatus.value = { type: 'error', message: `Copy failed: ${String(err)}` };
  }
}

// =====================================================================
// WATCHERS
// =====================================================================

watch(
  [
    displayWidth, displayHeight, pixelScale, showGrid,
    showHeader, headerLines, showFooter, footerText,
    columns, rows,
    () => gtfStore.gtfData.value,
  ],
  () =>
  {
    nextTick(renderDisplay);
    updateXmlFromState();
  },
  { deep: true }
);

onMounted(() =>
{
  nextTick(() =>
  {
    renderDisplay();
    updateXmlFromState();
  });
});
</script>

<style scoped>
/* ============================================================ */
/* Page layout: sticky preview top, scrollable config bottom     */
/* ============================================================ */

.departure-preview-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Sticky preview panel at top */
.preview-sticky-panel {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.15);
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.preview-panel-inner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  max-width: 1600px;
  margin: 0 auto;
}

/* Display bezel */
.display-bezel {
  background: #111;
  border-radius: 6px;
  padding: 5px;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 0 1.5px #2a2a2a;
  flex-shrink: 1;
  overflow: auto;
  max-height: 260px;
}

.display-canvas {
  display: block;
  border-radius: 3px;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* Sidebar next to display */
.preview-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
  flex-shrink: 0;
}

.display-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.size-field {
  max-width: 90px;
}

.export-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ============================================================ */
/* Scrollable configuration area                                 */
/* ============================================================ */

.config-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* ============================================================ */
/* Header + Footer row                                          */
/* ============================================================ */

.hf-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 0 0 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.hf-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hf-header {
  flex: 2;
}

.hf-footer {
  flex: 1;
}

.hf-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.compact-switch {
  flex: 0 0 auto;
}

.hf-line {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* ============================================================ */
/* Columns section                                               */
/* ============================================================ */

.cols-section {
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.cols-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.cols-title {
  font-size: 0.85rem;
  font-weight: 600;
}

.cols-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cols-thead {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 4px;
}

.cols-thead span {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cols-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.ct-name { flex: 2; min-width: 0; }
.ct-x { width: 80px; flex: 0 0 80px; }
.ct-w { width: 80px; flex: 0 0 80px; }
.ct-align { width: 84px; flex: 0 0 84px; }
.ct-color { width: 120px; flex: 0 0 120px; }
.ct-del { width: 24px; flex: 0 0 24px; }

.align-toggle {
  height: 28px !important;
}

.align-toggle .v-btn {
  height: 28px !important;
  min-width: 26px !important;
  padding: 0 4px !important;
}

.config-title {
  font-size: 0.9rem !important;
  font-weight: 600;
  padding: 8px 16px !important;
  min-height: auto !important;
  display: flex;
  align-items: center;
}

/* Data table */
.data-table-header {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.15);
  margin-bottom: 4px;
}
.data-table-header span {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.data-row-num {
  width: 20px;
  flex: 0 0 20px;
  text-align: center;
}
.data-col-header {
  min-width: 0;
}
.data-row-del {
  width: 28px;
  flex: 0 0 28px;
}

.data-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 2px;
}
.data-cell {
  min-width: 0;
}

/* Shared */
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  flex-shrink: 0;
}

.gap-1 { gap: 4px; }

/* XML editor */
.xml-editor {
  width: 100%;
  min-height: 200px;
  max-height: 500px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.25);
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 4px;
  padding: 8px 12px;
  resize: vertical;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

.xml-editor:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

/* Responsive */
@media (max-width: 960px) {
  .preview-panel-inner {
    flex-direction: column;
    align-items: center;
  }
  .preview-sidebar {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    justify-content: center;
  }
  .display-info {
    flex-direction: row;
  }
  .export-actions {
    flex-direction: row;
  }
  .hf-row {
    flex-direction: column;
  }
  .cols-row {
    flex-wrap: wrap;
  }
  .ct-x, .ct-w, .ct-align, .ct-color {
    flex: 1 !important;
    width: auto !important;
  }
}
</style>
