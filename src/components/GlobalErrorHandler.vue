<template>
  <div class="global-error-handler">
    <!-- Critical Error Overlay -->
    <v-overlay
      v-if="errorHandler.hasCriticalErrors.value"
      :model-value="true"
      class="critical-error-overlay"
      persistent
      :z-index="9999"
      role="alertdialog"
      aria-labelledby="critical-error-title"
      aria-describedby="critical-error-description"
    >
      <v-card class="critical-error-card" elevation="24" max-width="500">
        <v-card-title id="critical-error-title" class="d-flex align-center">
          <v-icon color="error" class="mr-2" aria-hidden="true">
            mdi-alert-circle
          </v-icon>
          Critical Error
        </v-card-title>

        <v-card-text id="critical-error-description">
          <div class="mb-3">
            The application encountered a critical error and may not function
            properly.
          </div>

          <div
            v-for="error in errorHandler.criticalErrors.value"
            :key="error.id"
            class="mb-2"
          >
            <strong>{{ error.message }}</strong>
            <div
              v-if="showDebugInfo"
              class="text-caption mt-1"
              style="font-family: monospace"
            >
              {{ error.technicalDetails }}
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-btn
            color="error"
            :aria-label="`Reload application to fix ${errorHandler.criticalErrors.value.length} critical error${errorHandler.criticalErrors.value.length > 1 ? 's' : ''}`"
            @click="errorHandler.clearAllErrors()"
          >
            <v-icon left aria-hidden="true">mdi-refresh</v-icon>
            Reload Application
          </v-btn>

          <v-spacer></v-spacer>

          <v-btn
            text
            :aria-label="
              showDebugInfo
                ? 'Hide debug information'
                : 'Show debug information'
            "
            :aria-expanded="showDebugInfo"
            @click="showDebugInfo = !showDebugInfo"
          >
            {{ showDebugInfo ? 'Hide' : 'Show' }} Debug Info
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-overlay>

    <!-- Regular Error Alerts -->
    <div
      class="error-alerts-container"
      role="region"
      aria-label="Error notifications"
      aria-live="polite"
    >
      <transition-group name="error-alert" tag="div">
        <v-alert
          v-for="error in displayableErrors"
          :key="error.id"
          :type="getAlertType(error.severity)"
          :variant="getAlertVariant(error.severity)"
          :icon="getAlertIcon(error.type)"
          closable
          class="error-alert mb-2"
          :role="error.severity === ERROR_SEVERITY.HIGH ? 'alert' : 'status'"
          :aria-label="`${error.severity} ${error.type} error: ${error.message}`"
          tabindex="0"
          @click:close="errorHandler.dismissError(error.id)"
          @keydown.escape="errorHandler.dismissError(error.id)"
          @keydown.enter="toggleErrorDetails(error.id)"
          @keydown.space.prevent="toggleErrorDetails(error.id)"
        >
          <template #title>
            <span class="sr-only">
              {{ error.severity }} {{ error.type }} error
            </span>
            {{ getErrorTitle(error.type, error.severity) }}
            <v-chip
              v-if="showDebugInfo"
              size="x-small"
              class="ml-2"
              aria-hidden="true"
            >
              {{ error.context }}
            </v-chip>
          </template>

          <div class="error-content">
            <p class="error-message">{{ error.message }}</p>

            <!-- Show technical details in development mode -->
            <details
              v-if="showDebugInfo && error.technicalDetails"
              class="technical-details-toggle mt-2"
              :open="error.showDetails"
              @toggle="handleDetailsToggle($event, error.id)"
            >
              <summary
                class="technical-summary"
                :aria-label="`${error.showDetails ? 'Hide' : 'Show'} technical details for this error`"
                tabindex="0"
              >
                Technical Details
              </summary>
              <code
                class="technical-details"
                role="region"
                aria-label="Technical error details"
              >
                {{ error.technicalDetails }}
              </code>
            </details>

            <!-- Timestamp for debugging -->
            <small
              v-if="showDebugInfo"
              class="error-timestamp"
              aria-label="Error occurred at"
            >
              {{ formatTimestamp(error.timestamp) }}
            </small>
          </div>
        </v-alert>
      </transition-group>
    </div>

    <!-- Loading Overlay -->
    <v-overlay
      v-if="errorHandler.isLoading.value"
      :model-value="true"
      class="loading-overlay"
      :z-index="9998"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          aria-hidden="true"
        ></v-progress-circular>
        <div id="loading-text" class="mt-3 text-h6">Loading...</div>
      </div>
    </v-overlay>

    <!-- Screen Reader Only Status -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      <span v-if="errorHandler.activeErrors.value.length > 0">
        {{ errorHandler.activeErrors.value.length }} error{{
          errorHandler.activeErrors.value.length > 1 ? 's' : ''
        }}
        present
      </span>
      <span v-if="errorHandler.hasCriticalErrors.value">
        Critical errors detected. Application functionality may be affected.
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps, ref } from 'vue';
import {
  useErrorHandling,
  ERROR_TYPES,
  ERROR_SEVERITY,
} from '../composables/useErrorHandling.js';

const props = defineProps({
  showDebugInfo: {
    type: Boolean,
    default: process.env.NODE_ENV === 'development',
  },
  maxDisplayErrors: {
    type: Number,
    default: 5,
  },
});

const errorHandler = useErrorHandling();
const errorDetailsState = ref(new Map());

// Filter and limit displayed errors
const displayableErrors = computed(() => {
  return errorHandler.activeErrors.value
    .filter((error) => error.severity !== ERROR_SEVERITY.CRITICAL)
    .slice(0, props.maxDisplayErrors)
    .map((error) => ({
      ...error,
      showDetails: errorDetailsState.value.get(error.id) || false,
    }));
});

// UI mapping functions
function getAlertType(severity) {
  switch (severity) {
    case ERROR_SEVERITY.HIGH:
      return 'error';
    case ERROR_SEVERITY.MEDIUM:
      return 'warning';
    case ERROR_SEVERITY.LOW:
      return 'info';
    default:
      return 'info';
  }
}

function getAlertVariant(severity) {
  switch (severity) {
    case ERROR_SEVERITY.HIGH:
      return 'tonal';
    case ERROR_SEVERITY.MEDIUM:
      return 'outlined';
    case ERROR_SEVERITY.LOW:
      return 'text';
    default:
      return 'outlined';
  }
}

function getAlertIcon(type) {
  switch (type) {
    case ERROR_TYPES.FILE_OPERATION:
      return 'mdi-file-alert';
    case ERROR_TYPES.VALIDATION:
      return 'mdi-alert-circle';
    case ERROR_TYPES.NETWORK:
      return 'mdi-wifi-off';
    case ERROR_TYPES.PARSING:
      return 'mdi-code-tags';
    case ERROR_TYPES.USER_INPUT:
      return 'mdi-account-alert';
    default:
      return 'mdi-alert';
  }
}

function getErrorTitle(type, severity) {
  const typeNames = {
    [ERROR_TYPES.FILE_OPERATION]: 'File Operation',
    [ERROR_TYPES.VALIDATION]: 'Validation',
    [ERROR_TYPES.NETWORK]: 'Network',
    [ERROR_TYPES.PARSING]: 'Parsing',
    [ERROR_TYPES.USER_INPUT]: 'Input',
    [ERROR_TYPES.RUNTIME]: 'Application',
  };

  const severityPrefix = severity === ERROR_SEVERITY.HIGH ? 'Critical ' : '';
  return `${severityPrefix}${typeNames[type] || 'Error'}`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

function reloadApplication() {
  window.location.reload();
}

function toggleErrorDetails(errorId) {
  const currentState = errorDetailsState.value.get(errorId) || false;
  errorDetailsState.value.set(errorId, !currentState);
}

function handleDetailsToggle(event, errorId) {
  if (event.target && 'open' in event.target) {
    errorDetailsState.value.set(errorId, event.target.open);
  }
}
</script>

<style scoped>
.global-error-handler {
  position: relative;
  z-index: 9999;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.critical-error-overlay {
  z-index: 10000;
}

.critical-error-card {
  margin: 20px;
}

.critical-error-title {
  background-color: rgb(var(--v-theme-error));
  color: white;
}

.error-alerts-container {
  position: fixed;
  top: 80px; /* Below app bar */
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  pointer-events: none;
}

.error-alert {
  pointer-events: auto;
  margin-bottom: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  outline: none;
  transition: all 0.2s ease;
}

/* Focus management for accessibility */
.error-alert:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  transform: scale(1.02);
}

.error-alert:focus-within {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Keyboard navigation feedback */
.technical-summary:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .error-alert {
    border: 2px solid;
  }

  .critical-error-card {
    border: 3px solid rgb(var(--v-theme-error));
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .error-alert-enter-active,
  .error-alert-leave-active,
  .error-alert:focus,
  .technical-summary:focus {
    transition: none;
  }

  .error-alert:focus {
    transform: none;
  }
}

.error-content {
  font-size: 0.9em;
}

.error-message {
  margin-bottom: 0;
  line-height: 1.4;
}

.technical-details-toggle {
  margin-top: 8px;
}

.technical-summary {
  cursor: pointer;
  font-size: 0.8em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.technical-details {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.75em;
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 4px;
  display: block;
}

.error-timestamp {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.7em;
  margin-top: 4px;
  display: block;
}

.loading-overlay {
  z-index: 9998;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-text {
  font-size: 1.1em;
  margin-top: 16px;
}

/* Transition animations */
.error-alert-enter-active,
.error-alert-leave-active {
  transition: all 0.3s ease;
}

.error-alert-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.error-alert-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.error-alert-move {
  transition: transform 0.3s ease;
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .technical-details {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
