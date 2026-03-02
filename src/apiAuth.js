import axios from 'axios';

const TOKEN_STORAGE_KEY = 'ncfel2_api_token';

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const storeToken = (payload) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
};

const clearToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

const isTokenValid = (tokenPayload) => {
  if (!tokenPayload || !tokenPayload.token || !tokenPayload.expiresAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return tokenPayload.expiresAt - 30 > nowSeconds;
};

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

export const initApiAuth = async (config) => {
  const stored = getStoredToken();
  if (isTokenValid(stored)) {
    axios.defaults.headers.common.Authorization = `Bearer ${stored.token}`;
    return stored;
  }

  const tokenPayload = await requestToken(config);
  storeToken(tokenPayload);
  axios.defaults.headers.common.Authorization = `Bearer ${tokenPayload.token}`;
  return tokenPayload;
};

export const clearApiAuth = () => {
  clearToken();
  delete axios.defaults.headers.common.Authorization;
};
