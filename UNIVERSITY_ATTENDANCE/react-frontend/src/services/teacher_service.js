import { fetchApi } from './base_api';

export const teacherService = {
  getAll: () => fetchApi('/teachers'),
  create: (data) => fetchApi('/teachers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/teachers/${id}`, { method: 'DELETE' }),
};

export default teacherService;
