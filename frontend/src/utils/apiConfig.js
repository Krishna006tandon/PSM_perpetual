/**
 * Dynamic API URL resolver
 * Automatically switches to http://localhost:5000 when running on localhost / dev
 */
export const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }

  // Automatic localhost detection
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return 'http://localhost:5000';
    }
  }

  return 'https://api.perpetualsolutions.co.in';
};

/**
 * Safe fetch helper that handles HTML 404 / 500 error pages gracefully
 */
export const safeFetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} (${res.statusText || 'Error'}). Please ensure your local backend is running on port 5000.`);
    }
    throw new Error(`Unexpected non-JSON response from server: ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with HTTP ${res.status}`);
  }

  return data;
};
