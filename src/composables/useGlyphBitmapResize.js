import { watch, ref, nextTick } from 'vue';

export function useGlyphBitmapResize(glyphData, emit) {
  const isUpdatingFromTextArea = ref(false);

  // Watch for changes in glyph size to resize the bitmap
  watch(
    () => glyphData.value?.size,
    (newSize, oldSize) => {
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

      const currentBitmap = glyphData.value.bitmap;
      let newBitmap = [...currentBitmap]; // Start with a copy

      // Determine the character to use for padding - always use '.'
      const defaultChar = '.';

      // 1. Adjust Height
      if (newHeight > oldHeight) {
        // Add rows
        const rowToAdd = defaultChar.repeat(newWidth);
        for (let i = oldHeight; i < newHeight; i++) {
          newBitmap.push(rowToAdd);
        }
      } else if (newHeight < oldHeight) {
        // Remove rows
        newBitmap = newBitmap.slice(0, newHeight);
      }

      // 2. Adjust Width (applied to the potentially height-adjusted bitmap)
      if (newWidth !== oldWidth) {
        newBitmap = newBitmap.map((row) => {
          const currentRow = String(row || '');
          if (newWidth > oldWidth) {
            // Add padding
            return currentRow.padEnd(newWidth, defaultChar);
          } else {
            // Truncate
            return currentRow.slice(0, newWidth);
          }
        });
      }

      // Check if bitmap actually changed before emitting
      let changed = newBitmap.length !== currentBitmap.length;
      if (!changed) {
        for (let i = 0; i < newBitmap.length; i++) {
          if (newBitmap[i] !== currentBitmap[i]) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        emit('update:glyphField', { field: 'bitmap', value: newBitmap });
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
