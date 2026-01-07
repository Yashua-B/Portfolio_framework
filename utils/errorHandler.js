/**
 * Centralized error handling utilities
 * Provides consistent error logging patterns across the application
 */

const ErrorHandler = {
    /**
     * Log an informational message
     * @param {string} message - Message to log
     * @param {*} context - Optional context object
     */
    log: (message, context) => {
        if (context !== undefined) {
            console.log(`[Info] ${message}`, context);
        } else {
            console.log(`[Info] ${message}`);
        }
    },

    /**
     * Log a warning message
     * @param {string} message - Warning message
     * @param {*} context - Optional context object
     */
    warn: (message, context) => {
        if (context !== undefined) {
            console.warn(`[Warning] ${message}`, context);
        } else {
            console.warn(`[Warning] ${message}`);
        }
    },

    /**
     * Log an error message
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {*} context - Optional context object
     */
    error: (message, error, context) => {
        if (context !== undefined) {
            console.error(`[Error] ${message}`, error, context);
        } else {
            console.error(`[Error] ${message}`, error);
        }
    }
};

