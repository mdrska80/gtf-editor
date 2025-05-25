import { createApp } from 'vue';
import App from './App.vue';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// Material Design Icons
import '@mdi/font/css/materialdesignicons.css';

// Development tools
const isDevelopment = process.env.NODE_ENV === 'development';

// Enhanced Vuetify configuration with better defaults
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#FAFAFA',
          surface: '#FFFFFF',
        },
      },
      dark: {
        colors: {
          primary: '#2196F3',
          secondary: '#424242',
          accent: '#FF4081',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      style: 'text-transform: none;',
    },
    VCard: {
      elevation: 2,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
});

const app = createApp(App);

// Enhanced error handling for development and production
if (isDevelopment) {
  // Development error handler with detailed logging
  app.config.errorHandler = (err, instance, info) => {
    console.group('🚨 Vue Application Error');
    console.error('Error:', err);
    console.log('Component:', instance?.$options?.name || 'Unknown');
    console.log('Error Info:', info);
    console.log('Instance:', instance);
    console.groupEnd();
  };

  // Development warning handler
  app.config.warnHandler = (msg, instance, trace) => {
    console.group('⚠️ Vue Warning');
    console.warn('Message:', msg);
    console.log('Component:', instance?.$options?.name || 'Unknown');
    console.log('Trace:', trace);
    console.groupEnd();
  };

  // Enable performance tracking
  app.config.performance = true;

  console.group('🔧 GTF Editor Development Mode');
  console.log('✅ Enhanced error handling enabled');
  console.log('✅ Performance tracking enabled');
  console.log('✅ Development warnings enabled');
  console.log('✅ Enhanced Vuetify defaults configured');
  console.log('🛠️ Development tools available via useDevTools() composable');
  console.groupEnd();
} else {
  // Production error handler - minimal and user-friendly
  app.config.errorHandler = (err) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Application error:', errorMessage);
  };

  // Disable performance tracking in production
  app.config.performance = false;
}

// Apply Vuetify plugin
app.use(vuetify);

// Mount the application
app.mount('#app');
