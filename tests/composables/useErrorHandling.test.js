import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { 
  useErrorHandling, 
  useFileErrorHandling, 
  useValidationErrorHandling,
  ERROR_TYPES, 
  ERROR_SEVERITY 
} from '@/composables/useErrorHandling';
import { createTestEnvironment, createSampleError } from '../setup';

describe('useErrorHandling', () => {
  let errorHandler;

  beforeEach(() => {
    createTestEnvironment();
    errorHandler = useErrorHandling();
    errorHandler.clearAllErrors();
  });

  describe('Error Management', () => {
    it('should add errors correctly', () => {
      const testError = createSampleError('file_operation', 'high');
      
      const errorObj = errorHandler.addError(testError, {
        type: ERROR_TYPES.FILE_OPERATION,
        severity: ERROR_SEVERITY.HIGH,
        context: 'test context'
      });

      expect(errorObj).toBeDefined();
      expect(errorObj.type).toBe(ERROR_TYPES.FILE_OPERATION);
      expect(errorObj.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(errorObj.context).toBe('test context');
      expect(errorHandler.hasErrors.value).toBe(true);
      expect(errorHandler.errors.value).toHaveLength(1);
    });

    it('should generate unique error IDs', () => {
      const error1 = errorHandler.addError(new Error('Error 1'));
      const error2 = errorHandler.addError(new Error('Error 2'));

      expect(error1.id).not.toBe(error2.id);
    });

    it('should extract user-friendly messages', () => {
      const fetchError = new Error('fetch failed');
      const jsonError = new Error('JSON parse error');
      const tauriError = new Error('TAURI_INTERNALS undefined');

      const error1 = errorHandler.addError(fetchError);
      const error2 = errorHandler.addError(jsonError);
      const error3 = errorHandler.addError(tauriError);

      expect(error1.message).toContain('Network connection failed');
      expect(error2.message).toContain('Invalid file format');
      expect(error3.message).toContain('Desktop app feature not available');
    });

    it('should dismiss errors', () => {
      const errorObj = errorHandler.addError(new Error('test'));
      
      expect(errorHandler.activeErrors.value).toHaveLength(1);
      
      errorHandler.dismissError(errorObj.id);
      
      expect(errorHandler.activeErrors.value).toHaveLength(0);
      expect(errorHandler.errors.value[0].dismissed).toBe(true);
    });

    it('should clear specific errors', () => {
      const error1 = errorHandler.addError(new Error('Error 1'));
      const error2 = errorHandler.addError(new Error('Error 2'));

      expect(errorHandler.errors.value).toHaveLength(2);

      errorHandler.clearError(error1.id);

      expect(errorHandler.errors.value).toHaveLength(1);
      expect(errorHandler.errors.value[0].id).toBe(error2.id);
    });

    it('should clear all errors', () => {
      errorHandler.addError(new Error('Error 1'));
      errorHandler.addError(new Error('Error 2'));

      expect(errorHandler.errors.value).toHaveLength(2);

      errorHandler.clearAllErrors();

      expect(errorHandler.errors.value).toHaveLength(0);
      expect(errorHandler.hasErrors.value).toBe(false);
      expect(errorHandler.lastError.value).toBe(null);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize critical errors correctly', () => {
      const criticalError = errorHandler.addError(new Error('Critical issue'), {
        severity: ERROR_SEVERITY.CRITICAL
      });

      expect(errorHandler.criticalErrors.value).toHaveLength(1);
      expect(errorHandler.hasCriticalErrors.value).toBe(true);
      expect(errorHandler.criticalErrors.value[0].id).toBe(criticalError.id);
    });

    it('should filter active errors correctly', () => {
      const error1 = errorHandler.addError(new Error('Active error'));
      const error2 = errorHandler.addError(new Error('Hidden error'), { showToUser: false });
      const error3 = errorHandler.addError(new Error('Dismissed error'));
      
      errorHandler.dismissError(error3.id);

      expect(errorHandler.activeErrors.value).toHaveLength(1);
      expect(errorHandler.activeErrors.value[0].id).toBe(error1.id);
    });

    it('should auto-dismiss low severity errors', async () => {
      vi.useFakeTimers();
      
      errorHandler.addError(new Error('Low severity'), {
        severity: ERROR_SEVERITY.LOW
      });

      expect(errorHandler.activeErrors.value).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(5000);
      await nextTick();

      expect(errorHandler.activeErrors.value).toHaveLength(0);
      
      vi.useRealTimers();
    });
  });

  describe('Loading State Management', () => {
    it('should manage loading state', () => {
      expect(errorHandler.isLoading.value).toBe(false);

      errorHandler.setLoading(true, 'test operation');

      expect(errorHandler.isLoading.value).toBe(true);

      errorHandler.setLoading(false);

      expect(errorHandler.isLoading.value).toBe(false);
    });
  });

  describe('Async Operation Wrapper', () => {
    it('should handle successful operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success data');

      const result = await errorHandler.withErrorHandling(mockOperation, {
        successMessage: 'Operation completed'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success data');
      expect(result.error).toBe(null);
      expect(errorHandler.isLoading.value).toBe(false);
    });

    it('should handle failed operations', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      const result = await errorHandler.withErrorHandling(mockOperation, {
        errorType: ERROR_TYPES.NETWORK,
        errorContext: 'test operation'
      });

      expect(result.success).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe(ERROR_TYPES.NETWORK);
      expect(errorHandler.isLoading.value).toBe(false);
    });
  });
});

describe('useFileErrorHandling', () => {
  let fileHandler;

  beforeEach(() => {
    createTestEnvironment();
    fileHandler = useFileErrorHandling();
    // Clear errors from base handler
    const errorHandler = useErrorHandling();
    errorHandler.clearAllErrors();
  });

  it('should handle file operations with proper context', async () => {
    const mockOperation = vi.fn().mockResolvedValue('file data');

    const result = await fileHandler.handleFileOperation(mockOperation, 'test.gtf');

    expect(result.success).toBe(true);
    expect(result.data).toBe('file data');
  });

  it('should add file-specific errors', () => {
    const fileError = new Error('File not found');
    
    const errorObj = fileHandler.addFileError(fileError, 'test.gtf', 'open');

    expect(errorObj.type).toBe(ERROR_TYPES.FILE_OPERATION);
    expect(errorObj.severity).toBe(ERROR_SEVERITY.HIGH);
    expect(errorObj.context).toContain('open: test.gtf');
    expect(errorObj.message).toContain('Failed to open');
    expect(errorObj.message).toContain('test.gtf');
  });
});

describe('useValidationErrorHandling', () => {
  let validationHandler;

  beforeEach(() => {
    createTestEnvironment();
    validationHandler = useValidationErrorHandling();
    // Clear errors from base handler
    const errorHandler = useErrorHandling();
    errorHandler.clearAllErrors();
  });

  it('should add validation errors with proper metadata', () => {
    const errorObj = validationHandler.addValidationError(
      'width', 
      'Width must be positive', 
      -5
    );

    expect(errorObj.type).toBe(ERROR_TYPES.VALIDATION);
    expect(errorObj.severity).toBe(ERROR_SEVERITY.MEDIUM);
    expect(errorObj.context).toContain('Field validation: width');
    expect(errorObj.metadata).toEqual({ field: 'width', value: -5 });
  });

  it('should validate required fields', () => {
    expect(validationHandler.validateRequired('', 'name')).toBe(false);
    expect(validationHandler.validateRequired('  ', 'name')).toBe(false);
    expect(validationHandler.validateRequired('valid', 'name')).toBe(true);
    expect(validationHandler.validateRequired(null, 'name')).toBe(false);
  });

  it('should validate ranges', () => {
    expect(validationHandler.validateRange(5, 1, 10, 'width')).toBe(true);
    expect(validationHandler.validateRange(0, 1, 10, 'width')).toBe(false);
    expect(validationHandler.validateRange(15, 1, 10, 'width')).toBe(false);
  });
}); 