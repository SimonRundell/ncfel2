/**
 * @fileoverview API authentication utilities for NCFE Level 2.
 *
 * This module manages JWT-based API access:
 * - Requests a short-lived API token from /api/authToken.php
 * - Stores token payload in localStorage
 * - Attaches Authorization: Bearer <token> to axios requests
 * - Refreshes tokens when 401 responses are detected
 */
import axios from 'axios';

/**
 * localStorage key for persisted API token payload.
 * @type {string}
 */
const TOKEN_STORAGE_KEY = 'ncfel2_api_token';

/**
 * Read the stored API token payload from localStorage.
 * @returns {{token: string, expiresAt: number}|null}
 */
const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Persist token payload to localStorage.
 * @param {{token: string, expiresAt: number}} payload
 */
const storeToken = (payload) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
};

/**
 * Clear stored API token payload.
 */
const clearToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

/**
 * Validate a token payload against expiry.
 * @param {{token: string, expiresAt: number}|null} tokenPayload
 * @returns {boolean}
 */
const isTokenValid = (tokenPayload) => {
  if (!tokenPayload || !tokenPayload.token || !tokenPayload.expiresAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return tokenPayload.expiresAt - 30 > nowSeconds;
};

/**
 * Request a new API token from the backend using service credentials.
 * @param {{api: string, apiAuthUser: string, apiAuthPassword: string}} config
 * @returns {Promise<{token: string, expiresAt: number}>}
 */
const requestToken = async (config) => {
  if (!config?.api) {
    throw new Error('API base URL is missing');
  }
  if (!config.apiAuthUser || !config.apiAuthPassword) {
    throw new Error('API auth credentials are missing');
  }

  const response = await axios.post(
    `${config.api}/authToken.php`,
    {
      username: config.apiAuthUser,
      password: config.apiAuthPassword,
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (response.data?.status_code !== 200) {
    throw new Error('Failed to obtain API token');
  }

  const token = response.data?.message?.token || response.data?.token;
  const expiresAt = response.data?.message?.expiresAt || response.data?.expiresAt;

  if (!token || !expiresAt) {
    throw new Error('Invalid token response');
  }

  return { token, expiresAt };
};

let hasInterceptor = false;

/**
 * Ensure a valid API token exists, storing it and setting axios defaults.
 * @param {{api: string, apiAuthUser: string, apiAuthPassword: string}} config
 * @param {boolean} [forceRefresh=false] When true, clears cache and fetches a new token
 * @returns {Promise<{token: string, expiresAt: number}>}
 */
export const initApiAuth = async (config, forceRefresh = false) => {
  const stored = forceRefresh ? null : getStoredToken();
  if (isTokenValid(stored)) {
    axios.defaults.headers.common.Authorization = `Bearer ${stored.token}`;
    return stored;
  }

  if (forceRefresh) {
    clearToken();
  }

  const tokenPayload = await requestToken(config);
  storeToken(tokenPayload);
  axios.defaults.headers.common.Authorization = `Bearer ${tokenPayload.token}`;
  return tokenPayload;
};

/**
 * Attach axios interceptors for API auth.
 * - Request interceptor injects Authorization header if missing
 * - Response interceptor refreshes token on 401 and retries once
 * @param {{api: string, apiAuthUser: string, apiAuthPassword: string}} config
 */
export const attachApiAuthInterceptor = (config) => {
  if (hasInterceptor) return;
  hasInterceptor = true;

  axios.interceptors.request.use((request) => {
    const stored = getStoredToken();
    if (isTokenValid(stored)) {
      request.headers = request.headers || {};
      if (!request.headers.Authorization) {
        request.headers.Authorization = `Bearer ${stored.token}`;
      }
    }
    return request;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error?.config;
      const status = error?.response?.status;
      const isAuthTokenRequest = originalRequest?.url?.includes('/authToken.php');

      if (status !== 401 || !originalRequest || originalRequest._retry || isAuthTokenRequest) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const tokenPayload = await initApiAuth(config, true);
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${tokenPayload.token}`,
        };
        return axios(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
  );
};

/**
 * Clear API auth state and remove default Authorization header.
 */
export const clearApiAuth = () => {
  clearToken();
  delete axios.defaults.headers.common.Authorization;
};
