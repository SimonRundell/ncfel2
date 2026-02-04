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
      } catch (e) {
        // Swallow parse errors and fall through
      }
    }
  }

  return [];
};

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
