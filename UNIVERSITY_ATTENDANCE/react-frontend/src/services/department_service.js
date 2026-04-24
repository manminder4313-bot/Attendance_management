import { fetchApi } from './base_api';

export const departmentService = {
  getAll: () => fetchApi('/departments'),
  create: (data) => fetchApi('/departments', { method: 'POST', body: JSON.stringify(data) }),
  
  getCourses: (deptName) => {
    if (!deptName) return [];
    switch (deptName) {
      case 'Computer Science':
        return ['B.Tech Computer Science', 'BCA', 'MCA'];
      case 'B.Tech':
        return ['B.Tech'];
      case 'Mechanical Engineering':
        return ['B.Tech Mechanical'];
      case 'Civil Engineering':
        return ['B.Tech Civil'];
      case 'Electrical Engineering':
        return ['B.Tech Electrical'];
      default:
        return [];
    }
  }
};

export default departmentService;
