<template>
  <v-container fluid>
    <v-sheet rounded="lg" elevation="1" class="pa-4">
      <h1>UI Element Demo Page</h1>
      <p>This page will showcase the new UI components and styles using the "Moon & Star" theme.</p>
      
      <v-divider class="my-4"></v-divider>

      <h2>Basic HTML Elements</h2>
      <p>This is a paragraph of text. It should inherit the default body font and color.</p>
      <p>Here is <a href="#">a link</a>.</p>
      <blockquote>This is a blockquote. Lorem ipsum dolor sit amet consectetur adipisicing elit.</blockquote>
      <code>This is inline code.</code>
      <pre><code>This is a preformatted code block.
line 2
line 3</code></pre>

      <v-divider class="my-4"></v-divider>

      <h2>Vuetify Components (Examples)</h2>
      
      <section class="my-4">
        <h3>Buttons</h3>
        <v-btn color="primary" class="mr-2">Primary</v-btn>
        <v-btn color="secondary" class="mr-2">Secondary</v-btn>
        <v-btn color="accent" class="mr-2">Accent</v-btn>
        <v-btn disabled class="mr-2">Disabled</v-btn>
        <v-btn variant="outlined" class="mr-2">Outlined</v-btn>
        <v-btn variant="text">Text</v-btn>
      </section>

      <section class="my-4">
        <h3>Alerts</h3>
        <v-alert type="success" title="Success" text="This is a success message." class="mb-2"></v-alert>
        <v-alert type="info" title="Info" text="This is an info message." class="mb-2"></v-alert>
        <v-alert type="warning" title="Warning" text="This is a warning message." class="mb-2"></v-alert>
        <v-alert type="error" title="Error" text="This is an error message."></v-alert>
      </section>

       <section class="my-4">
        <h3>Inputs</h3>
        <v-text-field label="Text Field" variant="outlined" density="compact"></v-text-field>
        <v-textarea label="Text Area" variant="outlined" density="compact"></v-textarea>
        <v-select label="Select" :items="['Option 1', 'Option 2', 'Option 3']" variant="outlined" density="compact"></v-select>
        <v-checkbox label="Checkbox"></v-checkbox>
         <v-switch label="Switch"></v-switch>
      </section>

      <v-divider class="my-4"></v-divider>
       <v-btn @click="$emit('close-demo')" color="primary" variant="tonal">Close Demo</v-btn>

    </v-sheet>
  </v-container>
</template>

<script setup>
// No specific script needed for this basic demo yet
</script>

<style scoped>
/* Add any demo-specific styles here if needed */
h2 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}
h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
section {
  padding-left: 1rem;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.2);
}
</style> 