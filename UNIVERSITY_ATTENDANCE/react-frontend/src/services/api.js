const API_BASE_URL = 'https://attendance-management-backend-do1l.onrender.com';

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
      const error = await response.json();
      throw new Error(error.message || 'API Error');
    }
    return response.json();
  },

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
