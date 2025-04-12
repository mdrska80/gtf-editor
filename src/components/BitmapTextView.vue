<template>
  <div class="bitmap-text-view">
    <h4>Raw Bitmap Data (Editable):</h4>
    <textarea
      v-if="bitmap"
      ref="bitmapTextAreaRef"
      :value="formattedBitmap"
      @input="handleInput"
      rows="10" 
      class="editable-bitmap-area"
    ></textarea>
    <p v-else>(No bitmap data)</p>
  </div>
</template>

<script setup>
import { defineProps, computed, defineEmits, ref, nextTick } from 'vue';

const props = defineProps({
  bitmap: {
    type: Array, // Array of strings
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['update:bitmap']);

// Ref for the textarea element
const bitmapTextAreaRef = ref(null);

// Join the array of strings into a single string with newlines for display
const formattedBitmap = computed(() => {
  return props.bitmap.join('\n');
});

// Handle input events on the textarea
function handleInput(event) {
  // Get current cursor position
  const textarea = event.target; // Use event.target for immediate access
  const cursorStart = textarea.selectionStart;
  const cursorEnd = textarea.selectionEnd;
  
  const newText = textarea.value; // Get the full current text
  const newBitmapArray = newText.split('\n');
  
  // Emit the updated array upwards
  emit('update:bitmap', newBitmapArray);

  // Use nextTick to restore cursor after Vue updates the component
  nextTick(() => {
    // Ensure the textarea element still exists
    if (bitmapTextAreaRef.value) {
      // The :value binding should have updated the text content already.
      // We just need to restore the cursor.
      bitmapTextAreaRef.value.selectionStart = cursorStart;
      bitmapTextAreaRef.value.selectionEnd = cursorEnd;
      // console.log(`Cursor restored to ${cursorStart}`); // Optional debug log
    }
  });
}

</script>

<style scoped>
.bitmap-text-view {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

/* Style the textarea */
.editable-bitmap-area {
  width: 100%; 
  background-color: #eee;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre; 
  overflow-x: auto;
  box-sizing: border-box; /* Include padding and border in the element's total width and height */
  resize: vertical; /* Allow vertical resize */
}

h4 {
    margin-bottom: 8px;
}
</style> 