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
  
  // Migration Sync (Optional helper)
  sync: (type, data) => fetchApi('/sync', { 
    method: 'POST', 
    body: JSON.stringify({ type, data }) 
  }),
};

export default api;
