import { watch, ref, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export function useGlyphBitmapResize(glyphData, emit) {
  const isUpdatingFromTextArea = ref(false);

  // Watch for changes in glyph size to resize the bitmap
  watch(
    () => glyphData.value?.size,
    async (newSize, oldSize) => {
      if (!glyphData.value || !glyphData.value.bitmap || !newSize || !oldSize) {
        return; // Exit if essential data is missing
      }

      // Ensure width/height are numbers
      const newWidth = Number(newSize.width) || 0;
      const newHeight = Number(newSize.height) || 0;
      const oldWidth = Number(oldSize.width) || 0;
      const oldHeight = Number(oldSize.height) || 0;

      // Basic validation
      if (newWidth <= 0 || newHeight <= 0) {
        console.warn('Invalid new dimensions, skipping resize.');
        return;
      }

      // Skip if dimensions haven't changed
      if (newWidth === oldWidth && newHeight === oldHeight) {
        return;
      }

      const currentBitmap = glyphData.value.bitmap;

      try {
        // Call Rust backend to resize the bitmap
        const resizedBitmap = await invoke('resize_bitmap', {
          bitmap: currentBitmap,
          oldSize: {
            width: oldWidth,
            height: oldHeight,
          },
          newSize: {
            width: newWidth,
            height: newHeight,
          },
        });

        // Check if bitmap actually changed before emitting
        let changed = resizedBitmap.length !== currentBitmap.length;
        if (!changed) {
          for (let i = 0; i < resizedBitmap.length; i++) {
            if (resizedBitmap[i] !== currentBitmap[i]) {
              changed = true;
              break;
            }
          }
        }

        if (changed) {
          emit('update:glyphField', { field: 'bitmap', value: resizedBitmap });
        }
      } catch (error) {
        console.error('Error resizing bitmap via Rust:', error);
        // Fallback: show error but don't crash
        // Could emit an error event here if needed
      }
    },
    { deep: true }
  );

  // Handler for bitmap text updates with simplified logic
  function handleBitmapTextUpdate(newBitmapArrayFromSplit) {
    isUpdatingFromTextArea.value = true;

    // Calculate dimensions: Width from first line, Height from total lines
    const newHeight = newBitmapArrayFromSplit.length;
    const newWidth = String(newBitmapArrayFromSplit[0] || '').length;

    // Get current dimensions for comparison
    const currentSize = glyphData.value?.size;
    const currentWidth = currentSize?.width ?? 0;
    const currentHeight = currentSize?.height ?? 0;

    // Emit the raw bitmap array directly from text area split
    emit('update:glyphField', {
      field: 'bitmap',
      value: newBitmapArrayFromSplit,
    });

    // Check if dimensions actually changed and emit size update if needed
    if (newWidth !== currentWidth || newHeight !== currentHeight) {
      emit('update:glyphField', {
        field: 'size',
        value: { width: newWidth, height: newHeight },
      });
    }

    // Reset flag after Vue processes updates
    nextTick(() => {
      isUpdatingFromTextArea.value = false;
    });
  }

  return {
    isUpdatingFromTextArea,
    handleBitmapTextUpdate,
  };
}
