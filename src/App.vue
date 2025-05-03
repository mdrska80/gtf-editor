<script setup>
import { ref, computed, watch, nextTick } from "vue";
import HeaderEditor from './components/HeaderEditor.vue';
import GlyphEditor from './components/GlyphEditor.vue';
import GlyphPreviewBar from './components/GlyphPreviewBar.vue';
import GlyphPreview from './components/GlyphPreview.vue';
import LanguageCheckDialog from './components/LanguageCheckDialog.vue';
import FileOperations from './components/FileOperations.vue';
import UIDemoPage from './components/UIDemoPage.vue';
import AppSidebar from './components/AppSidebar.vue';
import FontPreviewPage from './components/FontPreviewPage.vue';
import { useGtfStore } from './composables/useGtfStore';
import { useGlyphDisplay } from './composables/useGlyphDisplay';

// --- Instantiate Store ---
const store = useGtfStore();

// --- Instantiate Display Logic ---
const display = useGlyphDisplay(computed(() => store.gtfData.value?.glyphs));

// --- Local UI State / Refs --- 
// State that App.vue still needs to manage directly
// const currentView = ref(null); // Moved to store
// const gtfData = ref(null); // Moved to store
// const currentError = ref(null); // Moved to store
// const selectedGlyphName = ref(null); // Moved to store
// const currentFilePath = ref(null); // Moved to store
const languageDialogVisible = ref(false); // State for dialog visibility
const isDarkMode = ref(true); // Theme state
const glyphEditorRef = ref(null); // Ref for GlyphEditor component instance (for scrolling)
// const isSimplePreviewMode = ref(true); // Moved to display composable

// --- Character Sets Data (Moved to display composable) ---
// const commonLowercase = ...
// const languageCharacterSets = ...

// --- Computed Properties (Derived from store or local state) ---

// selectedGlyphData now comes from store

// Process default palette once for passing down (Depends on store.gtfData)
const processedDefaultPalette = computed(() => {
    return store.gtfData.value?.header?.default_palette?.entries 
           ? Object.entries(store.gtfData.value.header.default_palette.entries).map(([char, color]) => ({char, color})) 
           : [];
});

// --- Sorting/Grouping Computed Properties (Moved to display composable) ---
// const sortedGlyphs = computed(() => { ... });
// const groupedGlyphs = computed(() => { ... });

// --- Watchers ---

// Scroll to editor when a new glyph is selected (especially after adding)
watch(store.selectedGlyphName, (newName, oldName) => {
  // Check if view should change implicitly (e.g., from Font Preview)
  if (newName && store.currentView.value === 'font-preview') {
    store.currentView.value = 'glyph'; // Switch back to editor
  }
  // Scroll to editor
  if (newName && store.currentView.value === 'glyph') { 
    console.log("App.vue Watcher: selectedGlyphName changed to", newName, "Scrolling into view.");
    nextTick(() => {
        if (glyphEditorRef.value?.$el) {
            glyphEditorRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
  }
});

// --- Functions (UI related or bridging to store) ---

// These functions are now primarily in the store
// function newFile() { ... }
// function selectGlyph(glyphName) { ... }
// function selectHeader() { ... }
// function addGlyph() { ... }
// function removeGlyph() { ... }
// function updateHeaderData({ field, value }) { ... }
// function updateGlyphData({ field, value, action }) { ... }
// function addGlyphForChar(char) { ... } 
// function handleEditGlyph(glyphName) { ... } // Combined into store.selectGlyph

// Functions still needed in App.vue
function navigateToUIDemoPage() {
  store.currentView.value = 'ui-demo'; // Update view via store state
  store.selectedGlyphName.value = null; // Deselect any glyph via store state
}

function navigateToFontPreview() {
  store.currentView.value = 'font-preview'; // Set new view
  // Keep selected glyph name if user wants to jump back? Or clear it?
  // store.selectedGlyphName.value = null; 
}

// --- Event Handlers (Bridging UI events to store actions) ---

// Handler for FileOperations updates (Needs adjustment to use store.setGtfData)
function handleFileLoadUpdate({ gtfData: newData, currentFilePath: newPath, currentView: newView, selectedGlyphName: newGlyphName }) {
    console.log("App.vue: handleFileLoadUpdate received", { newData, newPath, newView, newGlyphName });
    store.setGtfData(newData, newPath, newView || 'header', newGlyphName); 
}

// Update the store when FileOperations saves and gets a new path
function handleFilePathUpdate(newPath) {
    store.currentFilePath.value = newPath;
}

</script>

<template>
  <v-app id="inspire" :theme="isDarkMode ? 'dark' : 'light'">
    <v-app-bar :theme="isDarkMode ? 'dark' : 'light'">
      <v-app-bar-title>
        GTF Editor 
        {{ store.gtfData.value?.header?.font_name ? `- ${store.gtfData.value.header.font_name}` : '' }}
        {{ store.currentFilePath.value ? ` (${store.currentFilePath.value.split('/').pop().split('\\').pop()})` : '(New File)' }}
      </v-app-bar-title>

      <v-btn prepend-icon="mdi-file-outline" @click="store.newFile">
        New File
      </v-btn>
      <FileOperations
        :gtf-data="store.gtfData.value"
        :current-file-path="store.currentFilePath.value"
        @update:gtfData="handleFileLoadUpdate({ gtfData: $event })"
        @update:currentFilePath="handleFilePathUpdate"
        @update:currentView="handleFileLoadUpdate({ currentView: $event })"
        @update:selectedGlyphName="handleFileLoadUpdate({ selectedGlyphName: $event })"
        @file-load-success="handleFileLoadUpdate"
      />
      <v-btn 
        prepend-icon="mdi-translate" 
        @click="languageDialogVisible = true"
        :disabled="!store.gtfData.value"
      >
        Check Characters
      </v-btn>
      <v-btn 
        :prepend-icon="isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="isDarkMode = !isDarkMode"
        :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
      </v-btn>
      <v-btn 
        prepend-icon="mdi-format-text-variant-outline" 
        @click="navigateToFontPreview" 
        :disabled="!store.gtfData.value" 
        title="Preview Font"
      >
        Preview
      </v-btn>
      <v-btn @click="navigateToUIDemoPage">
        UIDemoPage
      </v-btn>
    </v-app-bar>

    <AppSidebar
      :active-view="store.currentView.value"
      :gtf-data-available="!!store.gtfData.value"
      :selected-glyph-name="store.selectedGlyphName.value"
      :is-simple-preview-mode="display.isSimplePreviewMode.value"
      :grouped-glyphs="display.groupedGlyphs.value"
      :glyph-count="display.sortedGlyphs.value.length"
      :processed-default-palette="processedDefaultPalette"
      @select-header="store.selectHeader"
      @select-glyph="store.selectGlyph"
      @add-glyph="store.addGlyph"
      @remove-glyph="store.removeGlyph"
      @toggle-sidebar-view="display.toggleSidebarView"
    />

    <v-main>
      <v-container v-if="store.currentError.value">
        <v-alert type="error" variant="tonal" prominent border="start" closable @click:close="store.clearError">
          {{ store.currentError.value }}
        </v-alert>
      </v-container>
      
      <HeaderEditor 
        v-if="store.currentView.value === 'header' && store.gtfData.value"
        :header-data="store.gtfData.value.header"
        @update:header-field="store.updateHeaderData"
      />
      
      <GlyphEditor
        v-if="store.currentView.value === 'glyph' && store.selectedGlyphData.value"
        ref="glyphEditorRef"
        :key="store.selectedGlyphName.value"
        :glyph-data="store.selectedGlyphData.value"
        :palette="store.selectedGlyphData.value.palette?.entries ? Object.entries(store.selectedGlyphData.value.palette.entries).map(([char, color]) => ({ char, color })) : []"
        :header-default-palette="processedDefaultPalette"
        @update:glyph-field="store.updateGlyphData"
      />

      <UIDemoPage v-if="store.currentView.value === 'ui-demo'"/>

      <FontPreviewPage v-if="store.currentView.value === 'font-preview'"/>

      <v-container v-if="!store.currentView.value && store.gtfData.value">
        <p>Select the Font Header or a Glyph from the list to start editing.</p>
      </v-container>
       <v-container v-if="!store.gtfData.value">
        <p>Open a .gtf file to begin.</p>
        <p v-if="store.currentError.value" class="error--text">{{ store.currentError.value }}</p>
      </v-container>

    </v-main>

    <LanguageCheckDialog 
      v-model="languageDialogVisible"
      :glyphs="store.gtfData.value?.glyphs || []"
      :character-sets="display.languageCharacterSets"
      @add-glyph-for-char="store.addGlyphForChar"
      @edit-glyph="store.selectGlyph"
    />

  </v-app>
</template>

<style scoped>
/* Styles removed */
</style>
<style>
/* Global styles if needed */
</style>
