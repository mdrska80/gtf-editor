import { ref, computed, onMounted, onUnmounted, nextTick, readonly } from 'vue';
import { SIZING } from '../constants/design.js';

/**
 * Virtual scrolling composable for efficient rendering of large lists
 * @param {Object} options - Configuration options
 * @param {Ref} options.items - Reactive array of items to virtualize
 * @param {number} options.itemHeight - Height of each item in pixels
 * @param {number} options.containerHeight - Height of the scrollable container
 * @param {number} options.overscan - Number of items to render outside visible area
 * @returns {Object} Virtual scrolling state and methods
 */
export function useVirtualScrolling(options = {}) {
  const {
    items,
    itemHeight = SIZING.GLYPH_PREVIEW_HEIGHT_DEFAULT + SIZING.SPACING_SMALL,
    containerHeight = 400,
    overscan = 5,
  } = options;

  // Scroll state
  const scrollTop = ref(0);
  const containerRef = ref(null);

  // Virtual scrolling calculations
  const visibleRange = computed(() => {
    if (!items.value || items.value.length === 0) {
      return { start: 0, end: 0 };
    }

    const totalItems = items.value.length;
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const start = Math.floor(scrollTop.value / itemHeight);
    const end = Math.min(start + visibleCount + overscan, totalItems);

    return {
      start: Math.max(0, start - overscan),
      end,
    };
  });

  const visibleItems = computed(() => {
    if (!items.value) return [];
    const { start, end } = visibleRange.value;
    return items.value.slice(start, end).map((item, index) => ({
      ...item,
      virtualIndex: start + index,
      offsetY: (start + index) * itemHeight,
    }));
  });

  const totalHeight = computed(() => {
    return items.value ? items.value.length * itemHeight : 0;
  });

  const offsetY = computed(() => {
    return visibleRange.value.start * itemHeight;
  });

  // Scroll handler
  function handleScroll(event) {
    scrollTop.value = event.target.scrollTop;
  }

  // Scroll to specific item
  function scrollToItem(index) {
    if (containerRef.value && index >= 0) {
      const targetScrollTop = index * itemHeight;
      containerRef.value.scrollTop = targetScrollTop;
      scrollTop.value = targetScrollTop;
    }
  }

  // Scroll to item smoothly
  function scrollToItemSmooth(index) {
    if (containerRef.value && index >= 0) {
      const targetScrollTop = index * itemHeight;
      containerRef.value.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    }
  }

  // Reset scroll position
  function resetScroll() {
    scrollTop.value = 0;
    if (containerRef.value) {
      containerRef.value.scrollTop = 0;
    }
  }

  // Find item index by ID or name
  function findItemIndex(identifier, key = 'id') {
    if (!items.value) return -1;
    return items.value.findIndex((item) => item[key] === identifier);
  }

  return {
    // Refs
    containerRef,

    // State
    scrollTop: readonly(scrollTop),
    visibleRange,
    visibleItems,
    totalHeight,
    offsetY,

    // Methods
    handleScroll,
    scrollToItem,
    scrollToItemSmooth,
    resetScroll,
    findItemIndex,

    // Config
    itemHeight,
    containerHeight,
  };
}

/**
 * Grouped virtual scrolling for items with group headers
 * @param {Object} options - Configuration options
 * @param {Ref} options.groupedItems - Array of {name, items: []} or {name, glyphs: []}
 * @param {number} options.itemHeight - Height of each item
 * @param {number} options.groupHeaderHeight - Height of group headers
 * @param {number} options.containerHeight - Container height
 * @returns {Object} Grouped virtual scrolling state
 */
export function useGroupedVirtualScrolling(options = {}) {
  const {
    groupedItems,
    itemHeight = SIZING.GLYPH_PREVIEW_HEIGHT_DEFAULT + SIZING.SPACING_SMALL,
    groupHeaderHeight = 32,
    containerHeight = 400,
    overscan = 5,
  } = options;

  const scrollTop = ref(0);
  const containerRef = ref(null);

  // Flatten groups for virtual scrolling
  const flattenedItems = computed(() => {
    if (!groupedItems.value) return [];

    const flattened = [];
    let currentOffset = 0;

    groupedItems.value.forEach((group) => {
      // Add group header
      flattened.push({
        type: 'header',
        group: group.name,
        count: group.items?.length || group.glyphs?.length || 0,
        offsetY: currentOffset,
        height: groupHeaderHeight,
      });
      currentOffset += groupHeaderHeight;

      // Add group items
      const items = group.items || group.glyphs || [];
      items.forEach((item) => {
        flattened.push({
          type: 'item',
          data: item,
          group: group.name,
          offsetY: currentOffset,
          height: itemHeight,
        });
        currentOffset += itemHeight;
      });
    });

    return flattened;
  });

  const totalHeight = computed(() => {
    return flattenedItems.value.reduce((sum, item) => sum + item.height, 0);
  });

  const visibleItems = computed(() => {
    if (!flattenedItems.value.length) return [];

    const visible = [];
    const viewportStart = scrollTop.value;
    const viewportEnd = scrollTop.value + containerHeight;

    for (const item of flattenedItems.value) {
      const itemStart = item.offsetY;
      const itemEnd = item.offsetY + item.height;

      // Check if item intersects with viewport (with overscan)
      if (
        itemEnd >= viewportStart - overscan * itemHeight &&
        itemStart <= viewportEnd + overscan * itemHeight
      ) {
        visible.push(item);
      }
    }

    return visible;
  });

  function handleScroll(event) {
    scrollTop.value = event.target.scrollTop;
  }

  function scrollToGroup(groupName) {
    const groupItem = flattenedItems.value.find(
      (item) => item.type === 'header' && item.group === groupName
    );
    if (groupItem && containerRef.value) {
      containerRef.value.scrollTo({
        top: groupItem.offsetY,
        behavior: 'smooth',
      });
    }
  }

  function scrollToItem(itemIdentifier, key = 'name') {
    const item = flattenedItems.value.find(
      (item) => item.type === 'item' && item.data[key] === itemIdentifier
    );
    if (item && containerRef.value) {
      containerRef.value.scrollTo({
        top: item.offsetY - 50, // Offset to show some context
        behavior: 'smooth',
      });
    }
  }

  return {
    containerRef,
    scrollTop: readonly(scrollTop),
    visibleItems,
    totalHeight,
    flattenedItems,
    handleScroll,
    scrollToGroup,
    scrollToItem,
  };
}
