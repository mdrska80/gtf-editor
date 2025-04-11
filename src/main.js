import { createApp } from "vue";
import App from "./App.vue";

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'; // Import Material Design Icons

const vuetify = createVuetify(
{
  components,
  directives,
  icons:
  {
    defaultSet: 'mdi', // Use Material Design Icons as default
  },
});

createApp(App)
  .use(vuetify) // Use Vuetify
  .mount("#app");
