import { ref, computed, readonly } from 'vue';
import { GTF_EDITOR } from '../constants/design.js';

/**
 * @typedef {Object} ErrorObject
 * @property {string|number} id
 * @property {string} timestamp
 * @property {string} type
 * @property {string} severity
 * @property {string} context
 * @property {any} originalError
 * @property {string} message
 * @property {string} technicalDetails
 * @property {boolean} showToUser
 * @property {boolean} dismissed
 * @property {Object} [metadata]
 */

// Global error state (singleton pattern)
/** @type {import('vue').Ref<ErrorObject[]>} */
const errors = ref(/** @type {ErrorObject[]} */ []);
const isLoading = ref(false);
/** @type {import('vue').Ref<ErrorObject|null>} */
const lastError = ref(/** @type {ErrorObject|null} */ (null));

// Error types for categorization
export const ERROR_TYPES = {
  FILE_OPERATION: 'file_operation',
  VALIDATION: 'validation',
  NETWORK: 'network',
  PARSING: 'parsing',
  RUNTIME: 'runtime',
  USER_INPUT: 'user_input',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Enhanced error handling composable with categorization and user feedback
 * @returns {Object} Error handling state and methods
 */
export function useErrorHandling() {
  // Error management
  function addError(error, options = {}) {
    const {
      type = ERROR_TYPES.RUNTIME,
      severity = ERROR_SEVERITY.MEDIUM,
      context = '',
      userMessage = null,
      showToUser = true,
      logToConsole = true,
      metadata = undefined,
    } = options;

    /** @type {ErrorObject} */
    const errorObj = {
      id: Date.now() + Math.random(), // Simple unique ID
      timestamp: new Date().toISOString(),
      type,
      severity,
      context,
      originalError: error,
      message: userMessage || extractUserFriendlyMessage(error),
      technicalDetails: error?.message || String(error),
      showToUser,
      dismissed: false,
      ...(metadata && { metadata }),
    };

    errors.value.push(errorObj);
    lastError.value = errorObj;

    // Console logging for development
    if (logToConsole) {
      logError(errorObj);
    }

    // Auto-dismiss low severity errors
    if (severity === ERROR_SEVERITY.LOW) {
      setTimeout(() => dismissError(errorObj.id), 5000);
    }

    return errorObj;
  }

  /**
   * @param {string|number} errorId
   */
  function dismissError(errorId) {
    const error = errors.value.find((e) => e.id === errorId);
    if (error) {
      error.dismissed = true;
    }
  }

  /**
   * @param {string|number} errorId
   */
  function clearError(errorId) {
    const index = errors.value.findIndex((e) => e.id === errorId);
    if (index > -1) {
      errors.value.splice(index, 1);
    }
  }

  function clearAllErrors() {
    errors.value = [];
    lastError.value = null;
  }

  // Computed properties for UI
  const activeErrors = computed(() =>
    errors.value.filter((e) => !e.dismissed && e.showToUser)
  );

  const hasErrors = computed(() => activeErrors.value.length > 0);

  const criticalErrors = computed(() =>
    activeErrors.value.filter((e) => e.severity === ERROR_SEVERITY.CRITICAL)
  );

  const hasCriticalErrors = computed(() => criticalErrors.value.length > 0);

  // Loading state management
  function setLoading(loading, context = '') {
    isLoading.value = loading;
    if (loading) {
      console.log(`Loading started: ${context}`);
    }
  }

  // Async operation wrapper with error handling
  async function withErrorHandling(operation, options = {}) {
    const {
      loadingMessage = 'Processing...',
      successMessage = null,
      errorType = ERROR_TYPES.RUNTIME,
      errorContext = 'Unknown operation',
    } = options;

    try {
      setLoading(true, loadingMessage);
      const result = await operation();

      if (successMessage) {
        console.log(successMessage);
      }

      return { success: true, data: result, error: null };
    } catch (error) {
      const errorObj = addError(error, {
        type: errorType,
        context: errorContext,
        severity: ERROR_SEVERITY.MEDIUM,
      });

      return { success: false, data: null, error: errorObj };
    } finally {
      setLoading(false);
    }
  }

  return {
    // State (read-only)
    errors: readonly(errors),
    activeErrors,
    hasErrors,
    criticalErrors,
    hasCriticalErrors,
    isLoading: readonly(isLoading),
    lastError: readonly(lastError),

    // Methods
    addError,
    dismissError,
    clearError,
    clearAllErrors,
    setLoading,
    withErrorHandling,
  };
}

/**
 * Specialized error handlers for common operations
 */
export function useFileErrorHandling() {
  const { addError, withErrorHandling } = useErrorHandling();

  async function handleFileOperation(operation, fileName = '') {
    return withErrorHandling(operation, {
      errorType: ERROR_TYPES.FILE_OPERATION,
      errorContext: `File operation: ${fileName}`,
      loadingMessage: `Processing file: ${fileName}`,
    });
  }

  function addFileError(error, fileName = '', operation = 'file operation') {
    return addError(error, {
      type: ERROR_TYPES.FILE_OPERATION,
      context: `${operation}: ${fileName}`,
      userMessage: `Failed to ${operation}${fileName ? ` "${fileName}"` : ''}. ${extractUserFriendlyMessage(error)}`,
      severity: ERROR_SEVERITY.HIGH,
    });
  }

  return {
    handleFileOperation,
    addFileError,
  };
}

export function useValidationErrorHandling() {
  const { addError } = useErrorHandling();

  function addValidationError(field, message, value = null) {
    return addError(new Error(message), {
      type: ERROR_TYPES.VALIDATION,
      context: `Field validation: ${field}`,
      userMessage: `Validation error in ${field}: ${message}`,
      severity: ERROR_SEVERITY.MEDIUM,
      metadata: { field, value },
    });
  }

  function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      addValidationError(fieldName, `${fieldName} is required`);
      return false;
    }
    return true;
  }

  function validateRange(value, min, max, fieldName) {
    if (value < min || value > max) {
      addValidationError(
        fieldName,
        `${fieldName} must be between ${min} and ${max}`,
        value
      );
      return false;
    }
    return true;
  }

  return {
    addValidationError,
    validateRequired,
    validateRange,
  };
}

// Utility functions
function extractUserFriendlyMessage(error) {
  if (typeof error === 'string') return error;

  // Common error patterns and their user-friendly messages
  const message = error?.message || String(error);

  if (message.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (message.includes('JSON')) {
    return 'Invalid file format. Please check if the file is corrupted.';
  }
  if (message.includes('permission')) {
    return 'Permission denied. Please check file permissions.';
  }
  if (message.includes('not found')) {
    return 'File not found. Please check if the file exists.';
  }
  if (message.includes('TAURI')) {
    return 'Desktop app feature not available in web browser. Please use the desktop application.';
  }

  // Return original message if no pattern matches
  return message.length > 100 ? `${message.substring(0, 100)}...` : message;
}

/**
 * @param {ErrorObject} errorObj
 */
function logError(errorObj) {
  const { type, severity, context, technicalDetails, timestamp } = errorObj;

  const logLevel =
    severity === ERROR_SEVERITY.CRITICAL
      ? 'error'
      : severity === ERROR_SEVERITY.HIGH
        ? 'error'
        : severity === ERROR_SEVERITY.MEDIUM
          ? 'warn'
          : 'log';

  console[logLevel](
    `[${timestamp}] ${type.toUpperCase()} in ${context}:`,
    technicalDetails
  );

  // In production, you might want to send critical errors to a logging service
  if (severity === ERROR_SEVERITY.CRITICAL) {
    // Example: sendToLoggingService(errorObj);
  }
}
