<template>
  <v-navigation-drawer permanent theme="dark">
    <v-list density="compact">
      <!-- === NAVIGATION SECTION === -->
      <v-list-item
        title="Font Header"
        :active="activeView === 'header'"
        :disabled="!gtfDataAvailable"
        prepend-icon="mdi-information-outline"
        @click="$emit('select-header')"
      ></v-list-item>

      <v-divider class="my-2"></v-divider>

      <!-- === GLYPH MANAGEMENT SECTION === -->
      <v-list-subheader class="section-header">
        <div class="d-flex align-center justify-space-between w-100">
          <span>GLYPHS ({{ filteredGlyphCount }})</span>
          <div class="d-flex gap-1">
            <v-chip
              v-if="shouldUseVirtualScrolling"
              size="x-small"
              color="primary"
            >
              Virtual
            </v-chip>
            <v-chip
              v-if="searchQuery"
              size="x-small"
              color="secondary"
            >
              Filtered
            </v-chip>
          </div>
        </div>
      </v-list-subheader>

      <!-- Quick Search -->
      <v-list-item v-if="gtfDataAvailable && glyphCount > 0" class="search-container">
        <v-text-field
          v-model="searchQuery"
          density="compact"
          variant="outlined"
          placeholder="Search glyphs..."
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          class="search-field"
          :class="{ 'search-active': searchQuery }"
        ></v-text-field>
      </v-list-item>

      <!-- Management Controls -->
      <v-list-item v-if="gtfDataAvailable" class="controls-container">
        <div class="controls-grid">
          <!-- Add/Remove buttons -->
          <div class="button-group">
            <v-btn
              size="small"
              variant="elevated"
              color="success"
              prepend-icon="mdi-plus"
              class="action-btn"
              @click="$emit('add-glyph')"
            >
              Add
            </v-btn>
            <v-btn
              size="small"
              variant="elevated"
              color="error"
              prepend-icon="mdi-minus"
              class="action-btn"
              :disabled="!selectedGlyphName"
              @click="$emit('remove-glyph')"
            >
              Remove
            </v-btn>
          </div>
        </div>
      </v-list-item>

      <v-divider class="my-2"></v-divider>

      <!-- === GLYPH GRID DISPLAY === -->

      <!-- Large list: Use Virtual Scrolling with Grid Layout -->
      <div v-if="shouldUseVirtualScrolling" class="virtual-scroll-wrapper">
        <VirtualScrollList
          ref="virtualScrollRef"
          :grouped-items="filteredGroupedGlyphs"
          :container-height="virtualScrollHeight"
          :item-height="isSimplePreviewMode ? 50 : 70"
          :group-header-height="32"
          item-key="name"
          @item-click="handleGlyphClick"
        >
          <template #group-header="{ group, count }">
            <v-list-subheader class="group-header">
              {{ group }} ({{ count }})
            </v-list-subheader>
          </template>

          <template #item="{ item }">
            <div class="virtual-group-row">
              <div 
                class="virtual-glyph-card"
                :class="{ selected: selectedGlyphName === item.name }"
                @click="handleGlyphClick(item)"
              >
                <GlyphPreview
                  :glyph="item"
                  :default-palette="processedDefaultPalette"
                  :target-height="isSimplePreviewMode ? 32 : 40"
                  class="glyph-preview"
                />
                <span v-if="!isSimplePreviewMode" class="glyph-label">
                  {{ item.char_repr || item.name }}
                </span>
              </div>
            </div>
          </template>
        </VirtualScrollList>
      </div>

      <!-- Small list: Compact Grid Layout (Preferred View) -->
      <div v-else class="glyph-container pa-1">
        <template v-for="group in filteredGroupedGlyphs" :key="group.name">
          <v-list-subheader class="group-header">
            {{ group.name }} ({{ group.glyphs?.length || 0 }})
          </v-list-subheader>
          
          <!-- Compact Grid (Default - More Glyphs Per Row) -->
          <div v-if="isSimplePreviewMode" class="compact-glyph-grid mb-3">
            <div
              v-for="glyph in group.glyphs || []"
              :key="glyph.name"
              class="compact-glyph-item"
              :class="{ selected: selectedGlyphName === glyph.name }"
              :title="`${glyph.char_repr || glyph.name} (${glyph.name})`"
              @click="$emit('select-glyph', glyph.name)"
            >
              <GlyphPreview
                :glyph="glyph"
                :default-palette="processedDefaultPalette"
                :target-height="32"
                class="glyph-preview"
              />
            </div>
          </div>

          <!-- Large Cards (Alternative View) -->
          <div v-else class="large-glyph-grid mb-3">
            <v-card
              v-for="glyph in group.glyphs || []"
              :key="glyph.name"
              :variant="selectedGlyphName === glyph.name ? 'outlined' : 'flat'"
              density="compact"
              flat
              class="large-glyph-card"
              :title="`${glyph.char_repr || glyph.name} (${glyph.name})`"
              @click="$emit('select-glyph', glyph.name)"
            >
              <div class="card-content">
                <GlyphPreview
                  :glyph="glyph"
                  :default-palette="processedDefaultPalette"
                  :target-height="36"
                  class="glyph-preview"
                />
                <div class="card-label">{{ glyph.char_repr || glyph.name }}</div>
              </div>
            </v-card>
          </div>
        </template>
        
        <p v-if="!gtfDataAvailable" class="text-caption pa-2">
          (No file loaded)
        </p>
        <p v-else-if="searchQuery && filteredGlyphCount === 0" class="text-caption pa-2 search-no-results">
          <v-icon size="small" class="mr-1">mdi-magnify-remove-outline</v-icon>
          No glyphs match "{{ searchQuery }}"
        </p>
        <p v-else-if="(filteredGroupedGlyphs || []).length === 0" class="text-caption pa-2">
          (No glyphs in file)
        </p>
      </div>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch, nextTick } from 'vue';
import GlyphPreview from './GlyphPreview.vue';
import VirtualScrollList from './VirtualScrollList.vue';

const props = defineProps({
  activeView: String, // 'header', 'glyph', or null
  gtfDataAvailable: Boolean,
  selectedGlyphName: String,
  isSimplePreviewMode: Boolean,
  groupedGlyphs: {
    type: Array,
    default: () => []
  }, // Array of { name, glyphs: [] }
  glyphCount: {
    type: Number,
    default: 0
  }, // Total number of glyphs
  processedDefaultPalette: {
    type: Array,
    default: () => []
  }, // Array of { char, color }
});

const emit = defineEmits([
  'select-header',
  'select-glyph', // payload: glyphName
  'add-glyph',
  'remove-glyph',
  'toggle-sidebar-view',
]);

const virtualScrollRef = ref(null);

// Search functionality
const searchQuery = ref('');

// Filter glyphs based on search query
const filteredGroupedGlyphs = computed(() => {
  if (!searchQuery.value) {
    return props.groupedGlyphs;
  }

  const query = searchQuery.value.toLowerCase().trim();
  if (!query) {
    return props.groupedGlyphs;
  }

  return props.groupedGlyphs
    .map(group => ({
      ...group,
      glyphs: (group.glyphs || []).filter(glyph => {
        // Search in multiple fields
        const searchFields = [
          glyph.name || '',
          glyph.char_repr || '',
          glyph.unicode || '',
        ].join(' ').toLowerCase();
        
        return searchFields.includes(query);
      })
    }))
    .filter(group => group.glyphs.length > 0); // Only show groups with matching glyphs
});

// Count filtered glyphs
const filteredGlyphCount = computed(() => {
  return filteredGroupedGlyphs.value.reduce((total, group) => total + group.glyphs.length, 0);
});

// Virtual scrolling threshold - use virtual scrolling for large lists
const VIRTUAL_SCROLL_THRESHOLD = 200;

const shouldUseVirtualScrolling = computed(() => {
  return filteredGlyphCount.value > VIRTUAL_SCROLL_THRESHOLD;
});

const virtualScrollHeight = computed(() => {
  // Calculate available height for virtual scroll container
  // Account for header, buttons, and other UI elements
  return Math.max(300, window.innerHeight - 400);
});

// Handle glyph selection in virtual scroll mode
function handleGlyphClick(glyph) {
  emit('select-glyph', glyph.name);
}

// Watch for selected glyph changes and scroll to it in virtual mode
watch(
  () => props.selectedGlyphName,
  (newGlyphName) => {
    if (
      newGlyphName &&
      shouldUseVirtualScrolling.value &&
      virtualScrollRef.value
    ) {
      nextTick(() => {
        if (virtualScrollRef.value) {
          virtualScrollRef.value.scrollToItem(newGlyphName, 'name');
        }
      });
    }
  }
);
</script>

<style scoped>
/* Container styles */
.glyph-container {
  /* Container for all glyph groups */
}

.group-header {
  font-weight: bold;
  margin-top: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Compact Grid Layout (Primary View) */
.compact-glyph-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  padding: 4px;
}

.compact-glyph-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px;
  flex-shrink: 0;
}

.compact-glyph-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.compact-glyph-item.selected {
  background: rgba(25, 118, 210, 0.2);
  border-color: #1976d2;
  box-shadow: 0 0 8px rgba(25, 118, 210, 0.4);
}

/* Large Cards Layout (Alternative View) */
.large-glyph-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  padding: 4px;
}

.large-glyph-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
}

.large-glyph-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.large-glyph-card.v-card--variant-outlined {
  border-color: #1976d2;
  background-color: rgba(25, 118, 210, 0.1);
  box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  min-height: 70px;
}

.card-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* Glyph Preview Styles */
.glyph-preview {
  margin: 0 !important;
  display: block;
  max-width: 100%;
  max-height: 100%;
}

/* Virtual Scrolling Styles */
.virtual-scroll-wrapper {
  padding: 8px 0;
}

.virtual-group-row {
  padding: 2px 8px;
}

.virtual-glyph-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
}

.virtual-glyph-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
}

.virtual-glyph-card.selected {
  background: rgba(25, 118, 210, 0.2);
  border-color: #1976d2;
  border-left: 3px solid #1976d2;
  padding-left: 6px;
}

.glyph-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* Responsive adjustments */
@media (max-width: 300px) {
  .compact-glyph-grid {
    grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
    gap: 3px;
  }
  
  .large-glyph-grid {
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  }
}

@media (min-width: 350px) {
  .compact-glyph-grid {
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 5px;
  }
}

/* Search functionality styles */
.search-container {
  padding: 8px 16px 4px 16px !important;
  min-height: auto !important;
}

.search-field {
  font-size: 0.875rem;
}

.search-field.search-active {
  /* Subtle highlight when search is active */
}

.search-no-results {
  color: rgba(255, 255, 255, 0.6) !important;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Organized Header Styles */
.section-header {
  font-weight: 600;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9) !important;
  margin: 8px 0 4px 0;
  padding: 0 16px;
}

.controls-container {
  padding: 4px 16px 8px 16px !important;
  min-height: auto !important;
}

.controls-grid {
  display: flex;
  align-items: center;
  width: 100%;
}

.button-group {
  display: flex;
  gap: 6px;
  flex: 1;
}

.action-btn {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  font-weight: 500;
}
</style>
