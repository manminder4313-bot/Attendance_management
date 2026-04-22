const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://attendance-management-backend-do1l.onrender.com/api';

const api = {
  // Generic fetch wrapper
  async fetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    if (!response.ok) {
      // Try to get error message from response
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
  },

  // Auth
  login: (id, password) => api.fetch('/login', { 
    method: 'POST', 
    body: JSON.stringify({ id, password }) 
  }),

  // Admins
  admins: {
    getAll: () => api.fetch('/admins'),
    create: (data) => api.fetch('/admins', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Teachers
  teachers: {
    getAll: () => api.fetch('/teachers'),
    create: (data) => api.fetch('/teachers', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Students
  students: {
    getAll: () => api.fetch('/students'),
    create: (data) => api.fetch('/students', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api.fetch(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Departments
  departments: {
    getAll: () => api.fetch('/departments'),
    create: (data) => api.fetch('/departments', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Attendance
  attendance: {
    getAll: () => api.fetch('/attendance'),
    create: (data) => api.fetch('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Migration Sync
  sync: (type, data) => api.fetch('/sync', { method: 'POST', body: JSON.stringify({ type, data }) }),
};

export default api;
