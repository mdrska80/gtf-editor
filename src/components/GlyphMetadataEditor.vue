<template>
  <v-col cols="12" md="6">
    <h3>Metadata</h3>
    <v-form @submit.prevent>
      <v-text-field
        v-show="false"
        label="Glyph Name"
        :model-value="glyphData.name"
        @update:model-value="
          $emit('update:glyphField', { field: 'name', value: $event })
        "
      ></v-text-field>

      <v-text-field
        label="Character"
        :model-value="glyphData.char_repr || ''"
        placeholder="Single character"
        counter
        class="prominent-char-input"
        @update:model-value="handleCharReprInput"
      ></v-text-field>

      <v-text-field
        v-show="true"
        label="Unicode"
        :model-value="glyphData.unicode || ''"
        placeholder="U+XXXX"
        hint="Format: U+XXXX"
        @update:model-value="
          $emit('update:glyphField', { field: 'unicode', value: $event })
        "
      >
        <template #append-inner>
          <span class="text-caption text-grey">
            (ALT+{{ unicodeDecimalValue }})
          </span>
        </template>
      </v-text-field>

      <v-text-field
        v-model="sizeInput"
        label="Size (WxH)"
        :error-messages="sizeError"
        placeholder="e.g., 5x7"
        hint="Enter width x height"
        @change="handleSizeChange"
      ></v-text-field>
    </v-form>
  </v-col>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  glyphData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:glyphField']);

// Local state for the size input field
const sizeInput = ref('');
const sizeError = ref('');

// Computed property for Decimal Unicode
const unicodeDecimalValue = computed(() => {
  const unicodeStr = props.glyphData?.unicode;
  if (!unicodeStr || !unicodeStr.startsWith('U+')) {
    return ''; // Return empty if format is wrong or missing
  }
  try {
    const hexPart = unicodeStr.substring(2);
    const decimalValue = parseInt(hexPart, 16);
    // Check if parsing resulted in a valid number
    if (isNaN(decimalValue)) {
      return '';
    }
    return decimalValue.toString(); // Return decimal value as string
  } catch (e) {
    return ''; // Return empty on error
  }
});

// Watcher for the Size Prop to update the local text input
watch(
  () => props.glyphData?.size,
  (newSize) => {
    if (
      newSize &&
      newSize.width !== undefined &&
      newSize.height !== undefined
    ) {
      // Update the local text input field when the prop changes
      sizeInput.value = `${newSize.width}x${newSize.height}`;
      sizeError.value = ''; // Clear error if size becomes valid
    } else {
      // Clear the input if the size prop becomes null or invalid
      sizeInput.value = '';
    }
  },
  { deep: true, immediate: true }
);

function handleCharReprInput(newValue) {
  emit('update:glyphField', { field: 'char_repr', value: newValue });

  // Update the Unicode value when the character changes
  if (newValue && newValue.length > 0) {
    try {
      // Get the Unicode code point of the first character
      const codePoint = newValue.codePointAt(0);
      if (codePoint !== undefined) {
        // Format as U+XXXX (ensure at least 4 hex digits, pad with leading zeros if needed)
        const unicodeValue = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
        emit('update:glyphField', { field: 'unicode', value: unicodeValue });
      } else {
        // Handle cases where codePointAt might return undefined (shouldn't happen for non-empty strings)
        emit('update:glyphField', { field: 'unicode', value: '' });
      }
    } catch (error) {
      console.error('Error calculating Unicode:', error);
      emit('update:glyphField', { field: 'unicode', value: '' }); // Clear on error
    }
  } else {
    // Clear Unicode field if character input is empty
    emit('update:glyphField', { field: 'unicode', value: '' });
  }
}

function handleSizeChange() {
  sizeError.value = ''; // Clear previous error
  const value = sizeInput.value.trim();
  if (!value) {
    // Allow clearing the size - emit null
    emit('update:glyphField', { field: 'size', value: null });
    return;
  }

  const sizeRegex = /^(\d+)x(\d+)$/;
  const match = value.match(sizeRegex);

  if (match) {
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      sizeError.value = 'Width and height must be positive numbers.';
    } else {
      // Emit the structured size object
      emit('update:glyphField', { field: 'size', value: { width, height } });
    }
  } else {
    sizeError.value = 'Invalid format. Use WxH (e.g., 5x7).';
  }
}
</script>

<style scoped>
.prominent-char-input :deep(input) {
  font-size: 2.5em; /* Increase font size further */
  text-align: center; /* Center the character */
}

.prominent-char-input :deep(.v-field__input) {
  padding-top: 8px; /* Adjust padding for larger font */
  padding-bottom: 8px;
}

/* Optional: Add a subtle background or border */
/*
.prominent-char-input :deep(.v-field) {
  background-color: #f0f0f0;
}
*/
</style>
