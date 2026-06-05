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

  notices: {
    getAll: (dept) => fetchApi(`/notices${dept ? `?department=${encodeURIComponent(dept)}` : ''}`),
    create: (data) => fetchApi('/notices', { method: 'POST', body: JSON.stringify(data) }),
  },

  courses: {
    getAll: (dept) => fetchApi(`/courses${dept ? `?department=${encodeURIComponent(dept)}` : ''}`),
    create: (data) => fetchApi('/courses', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetchApi(`/courses/${id}`, { method: 'DELETE' }),
  },

  attendanceEditRequests: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/attendance-edit-requests${query ? `?${query}` : ''}`);
    },
    create: (data) => fetchApi('/attendance-edit-requests', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id, hodName) => fetchApi(`/attendance-edit-requests/${id}/approve`, { method: 'PUT', body: JSON.stringify({ hodName }) }),
    reject: (id, hodName) => fetchApi(`/attendance-edit-requests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ hodName }) }),
  },

  uploadHolidayPdf: (pdfData) => fetchApi('/upload-holiday-pdf', {
    method: 'POST',
    body: JSON.stringify({ pdfData })
  }),
  
  // Migration Sync (Optional helper)
  sync: (type, data) => fetchApi('/sync', { 
    method: 'POST', 
    body: JSON.stringify({ type, data }) 
  }),
};

export default api;
