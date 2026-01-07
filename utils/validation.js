/**
 * Validation utilities for data validation
 * Provides reusable validation functions
 */

const Validation = {
    /**
     * Validate a number is within a range
     * @param {number} value - Value to validate
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @returns {boolean} True if valid
     */
    validateNumber: (value, min, max) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return !isNaN(num) && num >= min && num <= max;
    },

    /**
     * Validate a percentage value (0-100)
     * @param {number|string} value - Percentage value to validate
     * @returns {boolean} True if valid percentage
     */
    validatePercentage: (value) => {
        return Validation.validateNumber(value, 0, 100);
    },

    /**
     * Validate a positive number with optional max
     * @param {number|string} value - Value to validate
     * @param {number} max - Optional maximum value
     * @returns {boolean} True if valid
     */
    validatePositiveNumber: (value, max = Infinity) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return !isNaN(num) && num > 0 && num <= max;
    },

    /**
     * Validate a page number (integer >= 1)
     * @param {number|string} value - Page number to validate
     * @returns {boolean} True if valid page number
     */
    validatePageNumber: (value) => {
        const num = typeof value === 'string' ? parseInt(value, 10) : value;
        return Number.isInteger(num) && num >= 1;
    },

    /**
     * Validate that a value is not empty
     * @param {*} value - Value to validate
     * @returns {boolean} True if not empty
     */
    validateNotEmpty: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }
};

