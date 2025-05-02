import { createApp } from "vue";
import App from "./App.vue";

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'; // Import Material Design Icons

// Define custom themes
const customLightTheme = {
  dark: false,
  colors: {
    primary: '#2e4a80', // Medium Blue
    secondary: '#60a5fa', // Light Blue
    accent: '#d94680', // Pink/Magenta
    background: '#f8fafc', // Off-white
    surface: '#ffffff', // White
    warning: '#facc15', // Gold/Amber
    error: '#B00020', // Standard Vuetify Error
    info: '#2196F3', // Standard Vuetify Info
    success: '#4CAF50', // Standard Vuetify Success
  }
};

const customDarkTheme = {
  dark: true,
  colors: {
    primary: '#60a5fa', // Light Blue
    secondary: '#f4a27f', // Peach/Salmon
    accent: '#d94680', // Pink/Magenta
    background: '#0f172a', // Very Dark Blue
    surface: '#1a2a4d', // Dark Blue
    warning: '#facc15', // Gold/Amber
    // Using lighter defaults for dark mode might be needed, adjust if necessary
    error: '#CF6679', // Material Dark Error
    info: '#2196F3', // Keep same Info? Or adjust?
    success: '#4CAF50', // Keep same Success? Or adjust?
  }
};


const vuetify = createVuetify(
{
  components,
  directives,
  icons:
  {
    defaultSet: 'mdi', // Use Material Design Icons as default
  },
  // Add theme configuration
  theme: {
    defaultTheme: 'light', // Start with light theme
    themes: {
      light: customLightTheme,
      dark: customDarkTheme,
    },
  },
});

createApp(App)
  .use(vuetify) // Use Vuetify
  .mount("#app");
