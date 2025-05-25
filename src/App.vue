<script setup>
import { ref, computed, watch, nextTick, defineAsyncComponent } from 'vue';
import HeaderEditor from './components/HeaderEditor.vue';
import FileOperations from './components/FileOperations.vue';
import AppSidebar from './components/AppSidebar.vue';
import GlobalErrorHandler from './components/GlobalErrorHandler.vue';
import { useGtfStore } from './composables/useGtfStore';
import { useGlyphDisplay } from './composables/useGlyphDisplay';
import { useTheme } from './composables/useTheme';
import { useOptimizedPalette } from './composables/usePerformanceOptimization';
import { useErrorHandling } from './composables/useErrorHandling';

// Dynamic imports for heavy components (code splitting)
const GlyphEditor = defineAsyncComponent(
  () => import('./components/GlyphEditor.vue')
);
const LanguageCheckDialog = defineAsyncComponent(
  () => import('./components/LanguageCheckDialog.vue')
);
const FontPreviewPage = defineAsyncComponent(
  () => import('./components/FontPreviewPage.vue')
);
const UIDemoPage = defineAsyncComponent(
  () => import('./components/UIDemoPage.vue')
);

// Initialize composables
const store = useGtfStore();
const display = useGlyphDisplay(computed(() => store.gtfData.value?.glyphs));
const theme = useTheme();
const errorHandler = useErrorHandling();

// Local UI state
const languageDialogVisible = ref(false);
const glyphEditorRef = ref(null);

// Optimized computed properties
const processedDefaultPalette = useOptimizedPalette(store.gtfData);

// Cached computed properties for template expressions
const appTitle = computed(() => {
  const baseTitle = 'GTF Editor';
  const fontName = store.gtfData.value?.header?.font_name;
  const filePath = store.currentFilePath.value;
  const fileName = filePath
    ? filePath.split('/').pop() || filePath.split('\\').pop() || '(New File)'
    : '(New File)';

  return fontName
    ? `${baseTitle} - ${fontName} (${fileName})`
    : `${baseTitle} ${fileName}`;
});

const hasGtfData = computed(() => !!store.gtfData.value);
const isHeaderView = computed(() => store.currentView.value === 'header');
const isGlyphView = computed(() => store.currentView.value === 'glyph');
const isUIDemoView = computed(() => store.currentView.value === 'ui-demo');
const isFontPreviewView = computed(
  () => store.currentView.value === 'font-preview'
);
const hasSelectedGlyph = computed(() => !!store.selectedGlyphData.value);

// Optimized glyph palette computation (memoized to prevent re-computation)
const selectedGlyphPalette = computed(() => {
  const glyphData = store.selectedGlyphData.value;
  if (!glyphData || !glyphData.palette) return [];

  const entries = glyphData.palette.entries;
  return entries
    ? Object.entries(entries).map(([char, color]) => ({ char, color }))
    : [];
});

// Watchers
watch(store.selectedGlyphName, (newName) => {
  if (newName && store.currentView.value === 'font-preview') {
    store.currentView.value = 'glyph';
  }

  if (newName && store.currentView.value === 'glyph') {
    nextTick(() => {
      const glyphEditor = glyphEditorRef.value;
      if (
        glyphEditor &&
        typeof glyphEditor === 'object' &&
        '$el' in glyphEditor
      ) {
        const element = glyphEditor.$el;
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }
});

// Navigation functions
function navigateToUIDemoPage() {
  store.currentView.value = 'ui-demo';
  store.selectedGlyphName.value = null;
}

function navigateToFontPreview() {
  store.currentView.value = 'font-preview';
}

// Event handlers with error handling
async function handleFileLoadUpdate(updates) {
  try {
    const {
      gtfData: newData,
      currentFilePath: newPath,
      currentView: newView,
      selectedGlyphName: newGlyphName,
    } = updates;
    if (newData !== undefined) {
      store.setGtfData(newData, newPath, newView || 'header', newGlyphName);
    } else if (newView !== undefined) {
      store.currentView.value = newView;
    } else if (newGlyphName !== undefined) {
      store.selectedGlyphName.value = newGlyphName;
    }
  } catch (error) {
    errorHandler.addError(error, {
      type: 'file_operation',
      context: 'File load update',
      userMessage: 'Failed to update file data. Please try again.',
    });
  }
}

function handleFilePathUpdate(newPath) {
  try {
    store.currentFilePath.value = newPath;
  } catch (error) {
    errorHandler.addError(error, {
      type: 'file_operation',
      context: 'File path update',
      userMessage: 'Failed to update file path.',
    });
  }
}

// Accessibility function for skip link
function skipToMainContent() {
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.focus();
    mainContent.scrollIntoView({ behavior: 'smooth' });
  }
}
</script>

<template>
  <v-app id="inspire" :theme="theme.currentTheme.value">
    <!-- Skip to main content link for keyboard users -->
    <a
      href="#main-content"
      class="skip-link"
      @click.prevent="skipToMainContent"
    >
      Skip to main content
    </a>

    <!-- Global Error Handler -->
    <GlobalErrorHandler />

    <v-app-bar
      :theme="theme.currentTheme.value"
      role="banner"
      aria-label="Main navigation"
    >
      <v-app-bar-title role="heading" aria-level="1">
        {{ appTitle }}
      </v-app-bar-title>

      <v-btn
        prepend-icon="mdi-file-outline"
        aria-label="Create a new GTF file"
        @click="store.newFile"
      >
        New File
      </v-btn>

      <FileOperations
        :gtf-data="store.gtfData.value"
        :current-file-path="store.currentFilePath.value || undefined"
        @update:gtfData="handleFileLoadUpdate({ gtfData: $event })"
        @update:currentFilePath="handleFilePathUpdate"
        @update:currentView="handleFileLoadUpdate({ currentView: $event })"
        @update:selectedGlyphName="
          handleFileLoadUpdate({ selectedGlyphName: $event })
        "
        @file-load-success="handleFileLoadUpdate"
      />

      <v-btn
        prepend-icon="mdi-translate"
        :disabled="!hasGtfData"
        :aria-label="
          hasGtfData
            ? 'Open language check dialog'
            : 'Language check disabled - no font loaded'
        "
        title="Language Check"
        @click="languageDialogVisible = true"
      />

      <v-btn
        prepend-icon="mdi-format-text-variant-outline"
        :disabled="!hasGtfData"
        :aria-label="
          hasGtfData ? 'Preview font' : 'Font preview disabled - no font loaded'
        "
        title="Preview Font"
        @click="navigateToFontPreview"
      />

      <v-btn
        :prepend-icon="theme.themeIcon.value"
        :title="theme.themeToggleTitle.value"
        :aria-label="theme.themeToggleTitle.value"
        @click="theme.toggleTheme"
      />
    </v-app-bar>

    <AppSidebar
      :active-view="store.currentView.value || undefined"
      :gtf-data-available="hasGtfData"
      :selected-glyph-name="store.selectedGlyphName.value || undefined"
      :is-simple-preview-mode="display.isSimplePreviewMode.value"
      :grouped-glyphs="display.groupedGlyphs.value"
      :glyph-count="display.sortedGlyphs.value.length"
      :processed-default-palette="processedDefaultPalette"
      role="navigation"
      aria-label="Font structure navigation"
      @select-header="store.selectHeader"
      @select-glyph="store.selectGlyph"
      @add-glyph="store.addGlyph"
      @remove-glyph="store.removeGlyph"
      @toggle-sidebar-view="display.toggleSidebarView"
    />

    <v-main
      id="main-content"
      role="main"
      aria-label="Main content area"
      tabindex="-1"
    >
      <HeaderEditor
        v-if="isHeaderView && hasGtfData"
        :header-data="store.gtfData.value.header"
        role="region"
        aria-label="Font header editor"
        @update:header-field="store.updateHeaderData"
      />

      <!-- Suspense wrapper for async GlyphEditor -->
      <Suspense v-if="isGlyphView && hasSelectedGlyph">
        <template #default>
          <GlyphEditor
            ref="glyphEditorRef"
            :key="store.selectedGlyphName.value || 'default'"
            :glyph-data="store.selectedGlyphData.value || {}"
            :palette="selectedGlyphPalette"
            :header-default-palette="processedDefaultPalette"
            role="region"
            :aria-label="`Glyph editor for ${store.selectedGlyphName.value || 'selected glyph'}`"
            @update:glyph-field="store.updateGlyphData"
          />
        </template>
        <template #fallback>
          <v-container>
            <v-row justify="center">
              <v-col cols="auto">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  aria-label="Loading glyph editor"
                ></v-progress-circular>
                <span class="ml-3" aria-live="polite">
                  Loading Glyph Editor...
                </span>
              </v-col>
            </v-row>
          </v-container>
        </template>
      </Suspense>

      <!-- Suspense wrapper for async UIDemoPage -->
      <Suspense v-if="isUIDemoView">
        <template #default>
          <UIDemoPage role="region" aria-label="UI demonstration page" />
        </template>
        <template #fallback>
          <v-container>
            <v-row justify="center">
              <v-col cols="auto">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  aria-label="Loading UI demo"
                ></v-progress-circular>
                <span class="ml-3" aria-live="polite">Loading UI Demo...</span>
              </v-col>
            </v-row>
          </v-container>
        </template>
      </Suspense>

      <!-- Suspense wrapper for async FontPreviewPage -->
      <Suspense v-if="isFontPreviewView">
        <template #default>
          <FontPreviewPage role="region" aria-label="Font preview page" />
        </template>
        <template #fallback>
          <v-container>
            <v-row justify="center">
              <v-col cols="auto">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  aria-label="Loading font preview"
                ></v-progress-circular>
                <span class="ml-3" aria-live="polite">
                  Loading Font Preview...
                </span>
              </v-col>
            </v-row>
          </v-container>
        </template>
      </Suspense>

      <v-container v-if="!store.currentView.value && hasGtfData">
        <div role="status" aria-live="polite">
          <p>
            Select the Font Header or a Glyph from the list to start editing.
          </p>
        </div>
      </v-container>

      <v-container v-if="!hasGtfData">
        <div role="status" aria-live="polite">
          <p>Open a .gtf file to begin.</p>
        </div>
      </v-container>
    </v-main>

    <!-- Suspense wrapper for async LanguageCheckDialog -->
    <Suspense>
      <template #default>
        <LanguageCheckDialog
          v-model="languageDialogVisible"
          :glyphs="store.gtfData.value?.glyphs || []"
          :character-sets="display.languageCharacterSets"
          role="dialog"
          aria-label="Language character check dialog"
          @add-glyph-for-char="store.addGlyphForChar"
          @edit-glyph="store.selectGlyph"
        />
      </template>
      <template #fallback>
        <!-- Silent fallback for dialog - no loading indicator needed -->
      </template>
    </Suspense>
  </v-app>
</template>

<style scoped>
/* Skip link for keyboard navigation */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 10001;
  font-weight: bold;
  transition: top 0.3s ease;
}

.skip-link:focus {
  top: 6px;
  outline: 2px solid rgb(var(--v-theme-on-primary));
  outline-offset: 2px;
}

/* Focus management for main content */
#main-content:focus {
  outline: none;
}

/* Enhanced focus indicators for better accessibility */
:deep(.v-btn:focus) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .skip-link {
    border: 2px solid;
  }

  :deep(.v-app-bar) {
    border-bottom: 2px solid;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .skip-link {
    transition: none;
  }

  :deep(.v-progress-circular) {
    animation: none;
  }
}

/* Screen reader improvements */
:deep([aria-hidden='true']) {
  speak: none;
}

/* Ensure proper focus order */
:deep(.v-app-bar .v-btn) {
  order: unset;
}

/* Loading states accessibility */
:deep(.v-progress-circular[aria-label]) {
  /* Ensure progress indicators are announced properly */
  speak: always;
}
</style>
