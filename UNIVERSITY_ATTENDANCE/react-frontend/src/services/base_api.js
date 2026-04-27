const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:5000/api`
  : `${window.location.origin}/api`;

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`📡 Fetching: ${url}`, options);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.warn(`⚠️ Received non-JSON response from ${url}:`, text);
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} ${response.statusText}`);
      }
      return text; // Return as text if not JSON but OK
    }

    if (!response.ok) {
      throw new Error(data?.message || `API Error (${response.status})`);
    }

    return data;
  } catch (err) {
    console.error(`💥 Fetch error for ${url}:`, err);
    throw err;
  }
};
