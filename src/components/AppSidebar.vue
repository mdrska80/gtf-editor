<template>
  <v-navigation-drawer permanent theme="dark">
    <v-list density="compact">
       <v-list-item 
         title="Font Header" 
         :active="activeView === 'header'" 
         @click="$emit('select-header')" 
         :disabled="!gtfDataAvailable"
         prepend-icon="mdi-information-outline"
       ></v-list-item>

       <!-- View Toggle Button -->
       <v-list-item @click="$emit('toggle-sidebar-view')">
         <template v-slot:prepend>
            <v-icon :icon="isSimplePreviewMode ? 'mdi-view-list' : 'mdi-view-grid'"></v-icon>
         </template>
         <v-list-item-title>{{ isSimplePreviewMode ? 'Show Grouped List' : 'Show Preview Grid' }}</v-list-item-title>
       </v-list-item>

       <v-divider></v-divider>
       <v-list-subheader>GLYPHS ({{ glyphCount }})</v-list-subheader>
       
       <!-- Add/Remove Buttons -->
       <v-list-item v-if="gtfDataAvailable">
           <v-btn 
             @click="$emit('add-glyph')" 
             block 
             prepend-icon="mdi-plus-box-outline" 
             variant="text" 
             size="small"
             class="mb-1"
           >
               Add New
           </v-btn>
           <v-btn 
             @click="$emit('remove-glyph')" 
             block 
             prepend-icon="mdi-minus-box-outline" 
             variant="text" 
             size="small"
             color="error" 
             :disabled="!selectedGlyphName" 
           >
               Remove Selected
           </v-btn>
       </v-list-item>
       <v-divider v-if="gtfDataAvailable"></v-divider>

       <!-- === CONDITIONAL SIDEBAR CONTENT === -->

       <!-- View 1: Grouped List with Cards -->
       <div v-if="!isSimplePreviewMode" class="glyph-group-container pa-1">
         <template v-for="group in groupedGlyphs" :key="group.name">
           <v-list-subheader class="group-header">{{ group.name }} ({{ group.glyphs.length }})</v-list-subheader>
           <div class="glyph-card-grid mb-2">
             <v-card 
               v-for="glyph in group.glyphs" 
               :key="glyph.name" 
               @click="$emit('select-glyph', glyph.name)" 
               :variant="selectedGlyphName === glyph.name ? 'outlined' : 'flat'"
               density="compact" 
               flat 
               class="glyph-card" 
               :title="glyph.char_repr ? glyph.char_repr : glyph.name"
             >
               <div class="d-flex align-center justify-center fill-height">
                 <GlyphPreview 
                   :glyph="glyph" 
                   :default-palette="processedDefaultPalette" 
                   :target-height="32" 
                   class="list-preview"
                 />
               </div>
             </v-card>
           </div>
         </template>
         <p v-if="!gtfDataAvailable" class="text-caption pa-2">(No file loaded)</p>
         <p v-else-if="groupedGlyphs.length === 0" class="text-caption pa-2">(No glyphs in file)</p>
       </div>

       <!-- View 2: Simple Preview Grid -->
       <div v-else class="pa-1"> 
          <template v-for="group in groupedGlyphs" :key="group.name + '-simple'">
            <v-list-subheader class="group-header">{{ group.name }} ({{ group.glyphs.length }})</v-list-subheader>
            <div class="simple-preview-grid mb-2"> 
              <div
                v-for="glyph in group.glyphs" 
                :key="glyph.name + '-preview'" 
                class="simple-preview-item"
                :class="{ 'selected': selectedGlyphName === glyph.name }"
                @click="$emit('select-glyph', glyph.name)"
                :title="glyph.char_repr ? glyph.char_repr : glyph.name"
              >
                  <GlyphPreview
                      :glyph="glyph"
                      :default-palette="processedDefaultPalette"
                      :target-height="36" 
                      class="list-preview"
                  />
              </div>
            </div>
          </template>
          <p v-if="!gtfDataAvailable" class="text-caption pa-2">(No file loaded)</p>
          <p v-else-if="groupedGlyphs.length === 0" class="text-caption pa-2">(No glyphs in file)</p>
       </div>
       
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import GlyphPreview from './GlyphPreview.vue'; // Import needed child component

const props = defineProps({
  activeView: String, // 'header', 'glyph', or null
  gtfDataAvailable: Boolean,
  selectedGlyphName: String,
  isSimplePreviewMode: Boolean,
  groupedGlyphs: Array, // Array of { name, glyphs: [] }
  glyphCount: Number, // Total number of glyphs
  processedDefaultPalette: Array, // Array of { char, color }
});

defineEmits([
  'select-header',
  'select-glyph', // payload: glyphName
  'add-glyph',
  'remove-glyph',
  'toggle-sidebar-view',
]);

</script>

<style scoped>
/* Copy relevant styles from App.vue */
.glyph-group-container {
  /* Add styling if needed */
}
.group-header {
  font-weight: bold;
  margin-top: 8px;
}
.glyph-card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px; 
}
.list-preview {
  margin: 0 !important;
  display: block;
}
.glyph-card {
  cursor: pointer;
  transition: background-color 0.1s ease-in-out;
  width: 52px;
  height: 52px;
  padding: 2px;
}
.glyph-card.v-card--variant-outlined {
    border-color: #1976D2;
    background-color: rgba(25, 118, 210, 0.1);
}
.simple-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px; 
}
.simple-preview-item {
  cursor: pointer;
  padding: 2px;
  border: 1px solid transparent;
  transition: border-color 0.1s ease-in-out;
}
.simple-preview-item.selected {
  border-color: #1976D2;
  background-color: rgba(25, 118, 210, 0.1);
}
.simple-preview-item .list-preview {
  display: block;
  margin: 0 !important;
}
</style> 