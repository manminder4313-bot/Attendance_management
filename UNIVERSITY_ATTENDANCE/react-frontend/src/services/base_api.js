const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

export const fetchApi = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    let errorMsg = 'API Error';
    try {
      const error = await response.json();
      errorMsg = error.message || errorMsg;
    } catch (e) {
      // Fallback if response is not JSON
    }
    throw new Error(errorMsg);
  }
  return response.json();
};
