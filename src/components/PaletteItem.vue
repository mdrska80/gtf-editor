<template>
  <v-list-item class="palette-item">
    <template #prepend>
      <div class="color-swatch" :style="{ backgroundColor: color }"></div>
    </template>

    <v-list-item-title>
      <code class="char-code">{{ char }}</code>
      : {{ color }}
    </v-list-item-title>

    <template #append>
      <!-- Edit Button (emits 'edit' event) -->
      <v-btn
        icon="mdi-pencil"
        variant="text"
        size="small"
        title="Edit Color"
        class="mr-1"
        @click="$emit('edit', { char, color })"
      ></v-btn>
      <!-- Remove Button (emits 'remove' event) -->
      <v-btn
        icon="mdi-delete"
        variant="text"
        size="small"
        title="Remove Color"
        color="error"
        @click="$emit('remove', char)"
      ></v-btn>
    </template>
  </v-list-item>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  char: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
});

defineEmits(['remove', 'edit']);
</script>

<style scoped>
.palette-item .v-list-item-title {
  display: flex;
  align-items: center;
}
.color-swatch {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  margin-right: 10px;
  display: inline-block;
}
.char-code {
  font-family: monospace;
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
  margin-right: 5px;
}
</style>
