import { fetchApi } from './base_api';

export const studentService = {
  getAll: () => fetchApi('/students'),
  create: (data) => fetchApi('/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export default studentService;
