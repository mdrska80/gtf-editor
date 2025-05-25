import { ref, computed, readonly, watch } from 'vue';
import { GTF_EDITOR } from '../constants/design.js';

// Global theme state (singleton pattern)
const isDarkMode = ref(true);

// Initialize theme from localStorage on module load
function initializeThemeFromStorage() {
  try {
    const savedTheme = localStorage.getItem(GTF_EDITOR.STORAGE_KEYS.THEME);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      isDarkMode.value = savedTheme === 'dark';
    }
  } catch (error) {
    console.warn('Could not load theme from localStorage:', error);
  }
}

// Initialize on module load
initializeThemeFromStorage();

export function useTheme() {
  // Computed properties for theme values
  const currentTheme = computed(() => (isDarkMode.value ? 'dark' : 'light'));

  const themeIcon = computed(() =>
    isDarkMode.value ? 'mdi-weather-sunny' : 'mdi-weather-night'
  );

  const themeToggleTitle = computed(() =>
    isDarkMode.value ? 'Switch to Light Mode' : 'Switch to Dark Mode'
  );

  // Theme switching function with auto-save
  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value;
  }

  // Set specific theme with auto-save
  function setTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      isDarkMode.value = theme === 'dark';
    } else {
      console.warn(`Invalid theme "${theme}". Use "dark" or "light".`);
    }
  }

  // Watch for theme changes and auto-save to localStorage
  watch(currentTheme, (newTheme) => {
    try {
      localStorage.setItem(GTF_EDITOR.STORAGE_KEYS.THEME, newTheme);
    } catch (error) {
      console.warn('Could not save theme to localStorage:', error);
    }
  });

  return {
    // State (read-only outside composable)
    isDarkMode: readonly(isDarkMode),
    currentTheme,

    // Computed UI helpers
    themeIcon,
    themeToggleTitle,

    // Actions
    toggleTheme,
    setTheme,
  };
}
