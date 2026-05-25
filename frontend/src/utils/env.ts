// frontend/src/utils/env.ts

/**
 * Resolves the base API URL dynamically.
 * For local development (localhost/127.0.0.1), it forces an empty string (relative paths)
 * to ensure that all requests route through the Vite same-origin proxy. This is critical
 * for browser Cookie security (HttpOnly, SameSite) which is blocked on cross-origin/cross-port HTTP.
 */
export const getBaseApiUrl = (): string => {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]')
  ) {
    return '';
  }
  return import.meta.env.VITE_API_URL || '';
};
