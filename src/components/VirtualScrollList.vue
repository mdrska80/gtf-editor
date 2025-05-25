<template>
  <div
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: `${containerHeight}px` }"
    @scroll="handleScroll"
  >
    <!-- Total height spacer -->
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <!-- Visible items rendered with absolute positioning -->
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item)"
        :style="{
          position: 'absolute',
          top: `${item.offsetY}px`,
          width: '100%',
          height: `${item.height}px`,
        }"
        class="virtual-item"
      >
        <!-- Group header -->
        <div v-if="item.type === 'header'" class="virtual-group-header">
          <slot name="group-header" :group="item.group" :count="item.count">
            <v-list-subheader class="group-header">
              {{ item.group }} ({{ item.count }})
            </v-list-subheader>
          </slot>
        </div>

        <!-- Regular item -->
        <div
          v-else-if="item.type === 'item'"
          class="virtual-list-item"
          @click="$emit('item-click', item.data)"
        >
          <slot name="item" :item="item.data" :group="item.group">
            <div class="default-item">{{ getItemLabel(item.data) }}</div>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useGroupedVirtualScrolling } from '../composables/useVirtualScrolling.js';
import { SIZING } from '../constants/design.js';

const props = defineProps({
  groupedItems: {
    type: Array,
    required: true,
  },
  itemHeight: {
    type: Number,
    default: SIZING.GLYPH_PREVIEW_HEIGHT_DEFAULT + SIZING.SPACING_SMALL,
  },
  groupHeaderHeight: {
    type: Number,
    default: 32,
  },
  containerHeight: {
    type: Number,
    default: 400,
  },
  itemKey: {
    type: String,
    default: 'name',
  },
  itemLabel: {
    type: String,
    default: 'name',
  },
});

const emit = defineEmits(['item-click', 'group-click']);

// Virtual scrolling
const {
  containerRef,
  visibleItems,
  totalHeight,
  handleScroll,
  scrollToGroup,
  scrollToItem,
} = useGroupedVirtualScrolling({
  groupedItems: computed(() => props.groupedItems),
  itemHeight: props.itemHeight,
  groupHeaderHeight: props.groupHeaderHeight,
  containerHeight: props.containerHeight,
});

// Helper functions
function getItemKey(item) {
  if (item.type === 'header') {
    return `header-${item.group}`;
  }
  return `item-${item.data[props.itemKey]}`;
}

function getItemLabel(item) {
  return item[props.itemLabel] || item.name || 'Unnamed';
}

// Expose methods for parent components
defineExpose({
  scrollToGroup,
  scrollToItem,
});
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
}

.virtual-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.virtual-group-header {
  width: 100%;
  display: flex;
  align-items: center;
  font-weight: bold;
  padding: 8px 0;
}

.virtual-list-item {
  width: 100%;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  padding: 4px 8px;
}

.virtual-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.default-item {
  padding: 8px 12px;
  width: 100%;
}

.group-header {
  font-weight: bold;
  margin: 0;
  padding-left: 16px;
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .virtual-list-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}
</style>
