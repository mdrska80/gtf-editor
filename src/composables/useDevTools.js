/**
 * @fileoverview Development tools and debugging utilities for GTF Editor
 * Provides comprehensive debugging, performance monitoring, and development assistance
 */

import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue';

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} startTime - Application start timestamp
 * @property {number} currentTime - Current timestamp
 * @property {number} uptime - Application uptime in milliseconds
 * @property {Object|string} memory - Memory usage information
 */

/**
 * @typedef {Object} DevToolsAPI
 * @property {boolean} enabled - Whether dev tools are enabled
 * @property {PerformanceMetrics} performance - Performance metrics
 * @property {Function} log - Enhanced logging function
 * @property {Function} benchmark - Performance benchmarking
 * @property {Function} inspectComponent - Component inspection
 * @property {Function} trackStateChanges - State change tracking
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const startTime = performance.now();

// Development state
const isEnabled = ref(isDevelopment);
const performanceMetrics = ref({
  startTime,
  renderCount: 0,
  stateChanges: 0,
  errorCount: 0,
});

// Performance tracking
const performanceLog = ref([]);
const componentMetrics = ref(new Map());

/**
 * Enhanced logging with context and filtering
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} component - Component name or context
 * @param {string} message - Log message
 * @param {...any} data - Additional data to log
 */
function enhancedLog(level, component, message, ...data) {
  if (!isEnabled.value) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    component,
    message,
    data,
  };
  
  const emoji = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '🚨',
    debug: '🔍',
    performance: '⏱️',
  };
  
  console.group(`${emoji[level] || '📝'} [${component}] ${message}`);
  if (data.length > 0) {
    data.forEach((item, index) => {
      console.log(`Data ${index + 1}:`, item);
    });
  }
  console.log('Timestamp:', timestamp);
  console.groupEnd();
  
  // Store in performance log for analysis
  if (Array.isArray(performanceLog.value)) {
    performanceLog.value.push(logEntry);
  }
  
  // Keep log size manageable
  if (performanceLog.value.length > 1000) {
    performanceLog.value = performanceLog.value.slice(-500);
  }
}

/**
 * Performance benchmarking utility
 * @param {string} name - Benchmark name
 * @param {Function} fn - Function to benchmark
 * @returns {any} Function result
 */
function benchmark(name, fn) {
  if (!isEnabled.value) return fn();
  
  const start = performance.now();
  let result;
  
  try {
    result = fn();
    
    // Handle async functions
    if (result && typeof result.then === 'function') {
      return result.then((asyncResult) => {
        const end = performance.now();
        const duration = end - start;
        
        enhancedLog('performance', 'Benchmark', `Async "${name}"`, {
          duration: `${duration.toFixed(2)}ms`,
          result: asyncResult,
        });
        
        return asyncResult;
      });
    }
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    
    enhancedLog('error', 'Benchmark', `Failed "${name}"`, {
      duration: `${duration.toFixed(2)}ms`,
      error,
    });
    
    throw error;
  }
  
  const end = performance.now();
  const duration = end - start;
  
  enhancedLog('performance', 'Benchmark', `"${name}"`, {
    duration: `${duration.toFixed(2)}ms`,
    result,
  });
  
  return result;
}

/**
 * Component inspection and debugging
 * @param {string} componentName - Name of component to inspect
 * @returns {Array} Array of component instances
 */
function inspectComponent(componentName) {
  if (!isEnabled.value) return [];
  
  const instance = getCurrentInstance();
  if (!instance) {
    enhancedLog('warn', 'DevTools', 'Cannot inspect component outside of Vue context');
    return [];
  }
  
  enhancedLog('debug', 'DevTools', `Inspecting component: ${componentName}`, {
    currentInstance: instance,
    componentName,
  });
  
  return [];
}

/**
 * Memory usage tracking
 * @returns {Object|string} Memory usage information
 */
function getMemoryUsage() {
  if (!isEnabled.value) return 'DevTools disabled';
  
  // Check if performance.memory is available
  const nav = window.navigator;
  if (nav && 'memory' in nav) {
    const memory = nav.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
    };
  }
  
  return 'Memory API not available';
}

/**
 * State change tracking for debugging
 * @param {string} stateName - Name of the state being tracked
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 */
function trackStateChange(stateName, oldValue, newValue) {
  if (!isEnabled.value) return;
  
  performanceMetrics.value.stateChanges++;
  
  enhancedLog('debug', 'StateTracker', `State change: ${stateName}`, {
    oldValue,
    newValue,
    changeCount: performanceMetrics.value.stateChanges,
  });
}

/**
 * Component performance tracking
 * @param {string} componentName - Component name
 * @param {string} operation - Operation being tracked
 * @param {number} duration - Operation duration
 */
function trackComponentPerformance(componentName, operation, duration) {
  if (!isEnabled.value) return;
  
  if (!componentMetrics.value.has(componentName)) {
    componentMetrics.value.set(componentName, {
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      operations: {},
    });
  }
  
  const metrics = componentMetrics.value.get(componentName);
  
  if (operation === 'render') {
    metrics.renderCount++;
    metrics.totalRenderTime += duration;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
  }
  
  if (!metrics.operations[operation]) {
    metrics.operations[operation] = { count: 0, totalTime: 0, averageTime: 0 };
  }
  
  const opMetrics = metrics.operations[operation];
  opMetrics.count++;
  opMetrics.totalTime += duration;
  opMetrics.averageTime = opMetrics.totalTime / opMetrics.count;
  
  performanceMetrics.value.renderCount++;
}

/**
 * Get performance summary
 * @returns {Object} Performance summary
 */
function getPerformanceSummary() {
  if (!isEnabled.value) return null;
  
  const currentTime = performance.now();
  const uptime = currentTime - startTime;
  
  return {
    uptime: `${(uptime / 1000).toFixed(2)}s`,
    startTime,
    currentTime,
    metrics: performanceMetrics.value,
    memory: getMemoryUsage(),
    componentMetrics: Object.fromEntries(componentMetrics.value),
    logEntries: performanceLog.value.length,
  };
}

/**
 * Export logs for analysis
 * @returns {string} JSON string of logs
 */
function exportLogs() {
  if (!isEnabled.value) return '{}';
  
  const exportData = {
    summary: getPerformanceSummary(),
    logs: performanceLog.value,
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Main development tools composable
 * @returns {DevToolsAPI} Development tools API
 */
export function useDevTools() {
  const performanceSummary = computed(() => getPerformanceSummary());
  
  // Watch for component mounting in development
  onMounted(() => {
    if (isEnabled.value) {
      enhancedLog('info', 'DevTools', 'Component mounted', {
        component: getCurrentInstance()?.type?.name || 'Unknown',
      });
    }
  });
  
  return {
    // State
    enabled: isEnabled,
    performance: performanceSummary,
    
    // Logging
    log: enhancedLog,
    
    // Performance
    benchmark,
    trackStateChange,
    trackComponentPerformance,
    getMemoryUsage,
    
    // Component inspection
    inspectComponent,
    
    // Analysis
    getPerformanceSummary,
    exportLogs,
    
    // Utils
    clearLogs: () => {
      performanceLog.value = [];
      enhancedLog('info', 'DevTools', 'Logs cleared');
    },
    
    // Component-specific helpers
    trackRender: (componentName) => {
      const start = performance.now();
      return () => {
        const end = performance.now();
        trackComponentPerformance(componentName, 'render', end - start);
      };
    },
  };
}

// Global development utilities (available in browser console during development)
if (isDevelopment && typeof window !== 'undefined') {
  window.GTF_DEV_TOOLS = {
    getPerformanceSummary,
    exportLogs,
    getMemoryUsage,
    benchmark,
    log: enhancedLog,
  };
  
  enhancedLog('info', 'DevTools', 'Development utilities loaded', {
    available: 'window.GTF_DEV_TOOLS',
    methods: ['getPerformanceSummary', 'exportLogs', 'getMemoryUsage', 'benchmark', 'log'],
  });
} 