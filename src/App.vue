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
import { useGtfStore } from './composables/useGtfStore';

// --- Instantiate Store ---
const store = useGtfStore();

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
const isSimplePreviewMode = ref(true); // State for sidebar view mode (could move to display composable later)

// --- Character Sets Data (Could move later) ---
const commonLowercase = 'abcdefghijklmnopqrstuvwxyz';
const commonUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const commonDigits = '0123456789';
const commonPunctuation = '!"#$%&\'()*+,-./:;<=>?@[\]^_`{|}~ '; 
const allCommon = commonLowercase + commonUppercase + commonDigits + commonPunctuation;
const languageCharacterSets = {
  Czech: 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ' + allCommon,
  Slovak: 'áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ' + allCommon,
  Romanian: 'ăâîșțĂÂÎȘȚ' + allCommon,
  Hungarian: 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ' + allCommon,
  Estonian: 'äõöüšžÄÕÖÜŠŽ' + allCommon,
  "Basic Latin + Digits": allCommon
};

// --- Computed Properties (Derived from store or local state) ---

// selectedGlyphData now comes from store

// Process default palette once for passing down (Depends on store.gtfData)
const processedDefaultPalette = computed(() => {
    return store.gtfData.value?.header?.default_palette?.entries 
           ? Object.entries(store.gtfData.value.header.default_palette.entries).map(([char, color]) => ({char, color})) 
           : [];
});

// --- Sorting/Grouping Computed Properties (Could move later) ---
const sortedGlyphs = computed(() => {
  if (!store.gtfData.value || !store.gtfData.value.glyphs) return [];
  const parseUnicode = (unicodeStr) => {
    if (!unicodeStr || !unicodeStr.startsWith('U+')) return Infinity; 
    try { return parseInt(unicodeStr.substring(2), 16); } 
    catch (e) { console.warn(`Error parsing unicode: ${unicodeStr}`, e); return Infinity; }
  };
  return [...store.gtfData.value.glyphs].sort((a, b) => parseUnicode(a.unicode) - parseUnicode(b.unicode));
});

const groupedGlyphs = computed(() => {
  if (!store.gtfData.value || !store.gtfData.value.glyphs) return [];

  const groups = { Uppercase: [], Lowercase: [], Digits: [], PunctuationSymbols: [], LanguageSpecific: [], Other: [], Undefined: [] };
  const groupOrder = ['Uppercase', 'Lowercase', 'Digits', 'PunctuationSymbols', 'LanguageSpecific', 'Other', 'Undefined'];
  const languageCharsSet = new Set(Object.values(languageCharacterSets).filter(set => set !== allCommon).join('').replace(new RegExp(`[${allCommon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), ''));
  const parseUnicode = (unicodeStr) => {
    if (!unicodeStr || !unicodeStr.startsWith('U+')) return null;
    try { return parseInt(unicodeStr.substring(2), 16); } catch (e) { return null; }
  };

  for (const glyph of sortedGlyphs.value) {
    const codePoint = parseUnicode(glyph.unicode);
    const char = glyph.char_repr;
    if (codePoint === null) groups.Undefined.push(glyph);
    else if (codePoint >= 0x41 && codePoint <= 0x5A) groups.Uppercase.push(glyph);
    else if (codePoint >= 0x61 && codePoint <= 0x7A) groups.Lowercase.push(glyph);
    else if (codePoint >= 0x30 && codePoint <= 0x39) groups.Digits.push(glyph);
    else if ((codePoint >= 0x20 && codePoint <= 0x2F) || (codePoint >= 0x3A && codePoint <= 0x40) || (codePoint >= 0x5B && codePoint <= 0x60) || (codePoint >= 0x7B && codePoint <= 0x7E)) groups.PunctuationSymbols.push(glyph);
    else if (char && languageCharsSet.has(char)) groups.LanguageSpecific.push(glyph);
    else groups.Other.push(glyph);
  }
  return groupOrder.map(name => ({ name: name.replace(/([A-Z])/g, ' $1').trim(), glyphs: groups[name] })).filter(group => group.glyphs.length > 0);
});

// --- Watchers ---

// Scroll to editor when a new glyph is selected (especially after adding)
watch(store.selectedGlyphName, (newName, oldName) => {
  // Only scroll if the view is changing to 'glyph' or already is 'glyph' and name changes
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
function toggleSidebarView() {
  isSimplePreviewMode.value = !isSimplePreviewMode.value;
}

function navigateToUIDemoPage() {
  store.currentView.value = 'ui-demo'; // Update view via store state
  store.selectedGlyphName.value = null; // Deselect any glyph via store state
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
      <v-btn @click="navigateToUIDemoPage">
        UIDemoPage
      </v-btn>
    </v-app-bar>

    <AppSidebar
      :active-view="store.currentView.value"
      :gtf-data-available="!!store.gtfData.value"
      :selected-glyph-name="store.selectedGlyphName.value"
      :is-simple-preview-mode="isSimplePreviewMode"
      :grouped-glyphs="groupedGlyphs"
      :glyph-count="sortedGlyphs.length"
      :processed-default-palette="processedDefaultPalette"
      @select-header="store.selectHeader"
      @select-glyph="store.selectGlyph"
      @add-glyph="store.addGlyph"
      @remove-glyph="store.removeGlyph"
      @toggle-sidebar-view="toggleSidebarView"
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
      :character-sets="languageCharacterSets"
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
