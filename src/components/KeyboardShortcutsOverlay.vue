<template>
  <v-dialog v-model="dialogVisible" fullscreen transition="fade-transition" class="shortcuts-overlay">
    <v-card class="overlay-content bg-transparent" flat>
      <v-container class="fill-height align-center justify-center">
        <div class="w-100" style="max-width: 1200px">
          <div class="text-center mb-12 pb-4 border-b">
            <h1 class="text-h3 font-weight-light text-uppercase tracking-wide text-white">Keyboard Shortcuts</h1>
          </div>
          
          <v-row>
            <v-col cols="12" md="4">
              <h3 class="text-h5 mb-6 text-disabled border-b pb-2 d-inline-block">File Operations</h3>
              <div class="custom-list">
                <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">{{ cmdKey }}</kbd> <span class="plus">+</span> <kbd class="key">N</kbd>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">New File</div>
                </div>
                <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">{{ cmdKey }}</kbd> <span class="plus">+</span> <kbd class="key">O</kbd>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">Open File</div>
                </div>
                <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">{{ cmdKey }}</kbd> <span class="plus">+</span> <kbd class="key">S</kbd>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">Save File</div>
                </div>
                <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">{{ cmdKey }}</kbd> <span class="plus">+</span> <kbd class="key">Shift</kbd> <span class="plus">+</span> <kbd class="key">S</kbd>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">Save File As</div>
                </div>
                <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">{{ cmdKey }}</kbd> <span class="plus">+</span> <kbd class="key">I</kbd>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">Import File</div>
                </div>
              </div>
            </v-col>
    
            <v-col cols="12" md="4">
              <h3 class="text-h5 mb-6 text-disabled border-b pb-2 d-inline-block">General</h3>
               <div class="custom-list">
                 <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">{{ cmdKey }}</kbd> <span class="text-caption text-disabled font-italic ml-2">(hold)</span>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">Show this cheat sheet</div>
                </div>
               </div>
            </v-col>
    
            <v-col cols="12" md="4">
               <h3 class="text-h5 mb-6 text-disabled border-b pb-2 d-inline-block">Editor</h3>
               <div class="custom-list">
                 <div class="d-flex align-center justify-space-between mb-4 py-2">
                  <div class="d-flex align-center gap-2">
                    <kbd class="key">Shift</kbd> <span class="plus">+</span> <kbd class="key">Arrows</kbd>
                  </div>
                  <div class="description text-right flex-grow-1 ml-4 text-high-emphasis text-body-1">Nudge Glyph</div>
                </div>
               </div>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const cmdKey = computed(() => isMac ? 'CMD' : 'CTRL');
</script>

<style scoped>
.shortcuts-overlay :deep(.v-overlay__content) {
  background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(40, 20, 40, 0.95) 100%) !important;
  backdrop-filter: blur(8px);
}

.tracking-wide {
  letter-spacing: 2px;
}

.gap-2 {
  gap: 8px;
}

.key {
  background: rgba(255,255,255,0.15);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 0 rgba(0,0,0,0.2);
  color: white;
  display: inline-block;
}

.plus {
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
}
</style>
