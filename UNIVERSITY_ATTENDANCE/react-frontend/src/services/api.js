import adminService from './admin_service';
import teacherService from './teacher_service';
import departmentService from './department_service';
import studentService from './student_service';
import attendanceService from './attendance_service';
import { fetchApi } from './base_api';

const api = {
  login: adminService.login,
  admins: adminService,
  teachers: teacherService,
  departments: departmentService,
  students: studentService,
  attendance: attendanceService,
  
  attendanceDays: {
    getAll: (dept) => fetchApi(`/attendance-days${dept ? `?department=${encodeURIComponent(dept)}` : ''}`),
    create: (data) => fetchApi('/attendance-days', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetchApi(`/attendance-days/${id}`, { method: 'DELETE' }),
  },
  
  // Migration Sync (Optional helper)
  sync: (type, data) => fetchApi('/sync', { 
    method: 'POST', 
    body: JSON.stringify({ type, data }) 
  }),
};

export default api;
