import { computed, ref, readonly, shallowRef, triggerRef } from 'vue';

/**
 * Memoized computed property with dependency tracking
 * Prevents unnecessary re-computations by caching results
 * @param {Function} computeFn - The computation function
 * @param {Array} deps - Optional dependency array for manual invalidation
 * @param {Object} options - Configuration options
 * @returns {ComputedRef} Memoized computed property
 */
export function useMemoizedComputed(computeFn, deps = [], options = {}) {
  const { maxCacheSize = 10, deepEqual = false } = options;

  const cache = new Map();
  const lastDeps = ref(deps);

  return computed(() => {
    // Create cache key from dependencies
    const depsKey = JSON.stringify(deps);

    // Check if dependencies changed
    const depsChanged = !deepEqual
      ? depsKey !== JSON.stringify(lastDeps.value)
      : !areDeepEqual(deps, lastDeps.value);

    if (depsChanged) {
      // Clear cache when dependencies change
      cache.clear();
      lastDeps.value = [...deps];
    }

    // Check cache first
    if (cache.has(depsKey)) {
      return cache.get(depsKey);
    }

    // Compute new value
    const result = computeFn();

    // Manage cache size
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    // Store in cache
    cache.set(depsKey, result);
    return result;
  });
}

/**
 * Debounced computed property for expensive operations
 * @param {Function} computeFn - The computation function
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {ComputedRef} Debounced computed property
 */
export function useDebouncedComputed(computeFn, delay = 300) {
  const result = ref(computeFn());
  const timeoutId = ref(null);

  return computed({
    get() {
      return result.value;
    },
    set() {
      if (timeoutId.value) {
        clearTimeout(timeoutId.value);
      }

      timeoutId.value = setTimeout(() => {
        result.value = computeFn();
        timeoutId.value = null;
      }, delay);
    },
  });
}

/**
 * Lazy computed property that only computes when first accessed
 * @param {Function} computeFn - The computation function
 * @returns {Object} Lazy computed property with getter
 */
export function useLazyComputed(computeFn) {
  let computed = false;
  let cachedValue = null;

  return {
    get value() {
      if (!computed) {
        cachedValue = computeFn();
        computed = true;
      }
      return cachedValue;
    },
    invalidate() {
      computed = false;
      cachedValue = null;
    },
  };
}

/**
 * Optimized palette processing with memoization
 * Specifically for the frequently used processedDefaultPalette
 * @param {Ref} gtfData - Reactive GTF data
 * @returns {ComputedRef} Optimized processed palette
 */
export function useOptimizedPalette(gtfData) {
  const paletteCache = new Map();

  return computed(() => {
    const paletteEntries = gtfData.value?.header?.default_palette?.entries;

    if (!paletteEntries) {
      return [];
    }

    // Create cache key based on palette data
    const cacheKey = JSON.stringify(paletteEntries);

    if (paletteCache.has(cacheKey)) {
      return paletteCache.get(cacheKey);
    }

    // Process palette entries
    const processed = Object.entries(paletteEntries).map(([char, color]) => ({
      char,
      color,
    }));

    // Manage cache size (keep last 5 palettes)
    if (paletteCache.size >= 5) {
      const firstKey = paletteCache.keys().next().value;
      paletteCache.delete(firstKey);
    }

    paletteCache.set(cacheKey, processed);
    return processed;
  });
}

/**
 * Optimized glyph map for character lookups
 * Uses WeakMap for memory efficiency
 * @param {Ref} glyphs - Reactive glyph array
 * @returns {ComputedRef} Optimized glyph map
 */
export function useOptimizedGlyphMap(glyphs) {
  const mapCache = new Map();

  return computed(() => {
    if (!glyphs.value || !Array.isArray(glyphs.value)) {
      return {};
    }

    // Create cache key based on glyph array length and first/last glyph names
    const cacheKey = `${glyphs.value.length}-${glyphs.value[0]?.name || ''}-${glyphs.value[glyphs.value.length - 1]?.name || ''}`;

    if (mapCache.has(cacheKey)) {
      return mapCache.get(cacheKey);
    }

    // Build glyph map
    const map = {};
    for (const glyph of glyphs.value) {
      if (glyph.char_repr) {
        map[glyph.char_repr] = glyph;
      }
    }

    // Manage cache size
    if (mapCache.size >= 3) {
      const firstKey = mapCache.keys().next().value;
      mapCache.delete(firstKey);
    }

    mapCache.set(cacheKey, map);
    return map;
  });
}

/**
 * Shallow reactive wrapper for large objects to prevent deep reactivity overhead
 * @param {any} value - Value to make shallow reactive
 * @returns {ShallowRef} Shallow reactive reference
 */
export function useShallowReactive(value) {
  const shallowValue = shallowRef(value);

  return {
    value: readonly(shallowValue),
    update(newValue) {
      shallowValue.value = newValue;
      triggerRef(shallowValue);
    },
  };
}

/**
 * Batched updates to prevent multiple re-renders
 * @param {Function} updateFn - Function that performs updates
 * @param {number} delay - Batch delay in milliseconds
 * @returns {Function} Batched update function
 */
export function useBatchedUpdates(updateFn, delay = 16) {
  // 16ms = ~60fps
  let timeoutId = null;
  let pendingUpdates = [];

  return function (...args) {
    pendingUpdates.push(args);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const updates = [...pendingUpdates];
      pendingUpdates = [];

      // Execute all pending updates in batch
      updates.forEach((updateArgs) => updateFn(...updateArgs));

      timeoutId = null;
    }, delay);
  };
}

// Utility functions
function areDeepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !areDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}
