import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Logger configuration
const Logger = {
  level: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.PROD ? 'warn' : 'debug'), // 'debug', 'info', 'warn', 'error'
  
  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  error(message, ...args) {
    console.error(`[ERROR] ${message}`, ...args);
  },
  
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }
};

// Make logger available globally
window.Logger = Logger;

// Log app initialization
Logger.info('Initializing Olivine V4 application...');

// Error tracking
const trackError = (error) => {
  Logger.error('Unhandled error:', error);
  
  // In production, you might want to send to error tracking service
  if (import.meta.env.PROD) {
    // Example: errorTrackingService.report(error);
  }
};

// Global error handlers
window.addEventListener('error', (event) => {
  trackError(event.error || event);
});

window.addEventListener('unhandledrejection', (event) => {
  trackError(event.reason || 'Promise rejection');
});

// Create Pinia store
const pinia = createPinia();

// Create Vue app
const app = createApp(App);

// Use plugins
app.use(pinia);
app.use(router);

// Global error handler for Vue
app.config.errorHandler = (error, instance, info) => {
  trackError(error);
  Logger.error(`Vue Error (${info}):`, error);
};

// Log version info
Logger.info(`Olivine V4 v${import.meta.env.VITE_APP_VERSION || '1.0.0'}`);
Logger.info(`Environment: ${import.meta.env.MODE}`);

// Mount app
app.mount('#app');

// Log successful mounting
Logger.info('Application successfully mounted');
