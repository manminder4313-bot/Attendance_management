import { fetchApi } from './base_api';

export const teacherService = {
  getAll: () => fetchApi('/teachers'),
  create: (data) => fetchApi('/teachers', { method: 'POST', body: JSON.stringify(data) }),
};

export default teacherService;
