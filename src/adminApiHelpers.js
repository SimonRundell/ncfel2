/**
 * Normalize API list responses that may be nested in different shapes.
 *
 * Accepts payloads like `{ message: [...] }`, `{ message: '{"data": [...]}' }`,
 * or raw arrays and always returns an array. Returns empty array on failure.
 *
 * @param {unknown} payload API response payload
 * @returns {Array} Normalized array of rows (or empty array)
 */
export const normalizeListResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.message)) {
      return payload.message;
    }

    if (typeof payload.message === 'string') {
      try {
        const parsed = JSON.parse(payload.message);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
          return parsed.data;
        }
      } catch {
        // Swallow parse errors and fall through
      }
    }
  }

  return [];
};

/**
 * Extract a user-facing message from a mixed API response shape.
 * Falls back to status_code or a supplied default string.
 *
 * @param {unknown} payload API response payload
 * @param {string} [fallback='Done'] Default message when none found
 * @returns {string} Message text suitable for UI display
 */
export const getMessageFromResponse = (payload, fallback = 'Done') => {
  if (payload && typeof payload === 'object') {
    if (payload.message) {
      return payload.message;
    }
    if (payload.status_code) {
      return `Status ${payload.status_code}`;
    }
  }
  if (typeof payload === 'string') {
    return payload;
  }
  return fallback;
};
