import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import { departments } from '../utils/departments';

const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? dateVal : parsed.toLocaleDateString('en-GB');
};

const matchSemester = (semVal, filterSem) => {
  if (!filterSem) return true;
  if (!semVal) return false;
  const fStr = String(filterSem).toLowerCase();
  const vStr = String(semVal).toLowerCase();
  if (fStr === 'odd semester' || fStr === 'odd') {
    const num = parseInt(vStr.replace(/\D/g, ''), 10);
    return !isNaN(num) && num % 2 !== 0;
  }
  if (fStr === 'even semester' || fStr === 'even') {
    const num = parseInt(vStr.replace(/\D/g, ''), 10);
    return !isNaN(num) && num % 2 === 0;
  }
  const fDigits = fStr.replace(/\D/g, '');
  const vDigits = vStr.replace(/\D/g, '');
  if (fDigits && vDigits) return fDigits === vDigits;
  return fStr === vStr;
};

function Admin() {
  const [submissions, setSubmissions] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [departmentSubmissions, setDepartmentSubmissions] = useState([]);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [attendanceDaysList, setAttendanceDaysList] = useState([]);
  const [newDayDate, setNewDayDate] = useState('');
  const [newDayStatus, setNewDayStatus] = useState('off');
  const [newDayNotice, setNewDayNotice] = useState('');
  const [newDayDept, setNewDayDept] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dayAlertPopup, setDayAlertPopup] = useState(null); // { day } for 6-sec popup

  // Notice board and dynamic courses states
  const [noticesList, setNoticesList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [editRequestsList, setEditRequestsList] = useState([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Edit attendance state
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState(null);
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Profile update states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const fileInputRef = useRef(null);
  const memberPhotoInputRef = useRef(null);
  const [editingMember, setEditingMember] = useState(null); // { id, type }
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [includeCredentials, setIncludeCredentials] = useState(false);

  // Attendance Stats specific filters
  const [statsCourseFilter, setStatsCourseFilter] = useState('');
  const [statsSemesterFilter, setStatsSemesterFilter] = useState('');
  const [statsSubjectFilter, setStatsSubjectFilter] = useState('All');

  // Teacher detail modal
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Student detail modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const viewStudentDetails = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  // Dept detail modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  const viewDeptDetails = (dept) => {
    setSelectedDept(dept);
    setShowDeptModal(true);
  };

  // Admin detail modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const viewAdminDetails = (admin) => {
    setSelectedAdmin(admin);
    setShowAdminModal(true);
  };

  const handleShare = (user, role) => {
    const text = `*University Portal Credentials*\n\n` +
      `*Name:* ${user.fullName || user.headName || user.department}\n` +
      `*Role:* ${role.charAt(0).toUpperCase() + role.slice(1)}\n` +
      `*User ID:* ${user.username}\n` +
      `*Password:* ${user.password}\n\n` +
      `Login at: ${window.location.origin}/login\n\n` +
      `Please keep these details secure.`;

    if (navigator.share) {
      navigator.share({
        title: 'Portal Credentials',
        text: text,
      }).catch(() => {
        // Fallback to clipboard if sharing is cancelled or fails
        navigator.clipboard.writeText(text);
        alert("Credentials copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("Details copied! Opening WhatsApp...");
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };



  const navigate = useNavigate();
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const handleUpdateDetails = async (type) => {
    try {
      const data = type === 'teacher' ? selectedTeacher : selectedStudent;
      const updatedData = { ...data, ...editFormData };

      // If it's a student and enrollment number changed, update username too
      if (type === 'student' && editFormData.enrollmentNumber) {
        updatedData.username = editFormData.enrollmentNumber;
      }

      if (type === 'teacher') {
        await api.teachers.update(updatedData.id, updatedData);
        setSelectedTeacher(updatedData);
      } else {
        await api.students.update(updatedData.id, updatedData);
        setSelectedStudent(updatedData);
      }

      setIsEditingDetails(false);
      setEditFormData({});
      alert("Details updated successfully!");
      loadSubmissions();
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update record.");
    }
  };
  const normalizeSemesters = async () => {
    if (!window.confirm("This will automatically recalculate semesters AND reset all passwords to 'Mrsptu@12345' for ALL students and teachers. Continue?")) return;

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const DEFAULT_PWD = "Mrsptu@12345";

      console.log(`🚀 Starting Normalization... Current Date: ${now.toLocaleDateString()}`);

      let studentUpdates = 0;
      let teacherUpdates = 0;

      // 1. Normalize Students
      const updatedStudents = await Promise.all(studentSubmissions.map(async (s) => {
        try {
          const bYear = parseInt(s.batchYear);
          if (!bYear) return s;

          let yearsPassed = currentYear - bYear;
          let semester = yearsPassed * 2;
          if (currentMonth >= 6) semester += 1;

          const getMaxSem = (course) => {
            if (!course) return 8;
            if (course === 'MCA') return 4;
            if (course === 'BCA-MCA Integrated') return 10;
            if (course.includes('B.Tech') || course.includes('B.Pharmacy')) return 8;
            if (course.includes('B.Arch')) return 10;
            if (course.includes('BCA') || course.includes('BBA') || course.includes('B.Sc')) return 6;
            return 8;
          };

          const maxSem = getMaxSem(s.course);
          if (semester > maxSem) semester = maxSem;
          if (semester <= 0) semester = 1;

          const newSem = semester.toString();
          const newUsername = s.enrollmentNumber || s.username;

          if (s.semester !== newSem || s.username !== newUsername || s.password !== DEFAULT_PWD) {
            const updated = { ...s, semester: newSem, username: newUsername, password: DEFAULT_PWD };
            const id = s._id || s.id;
            if (!id) return s;

            await api.students.update(id, updated);
            studentUpdates++;
            return { ...updated, id };
          }
          return s;
        } catch (e) {
          console.error(`Failed to normalize student ${s.fullName}:`, e);
          return s;
        }
      }));

      // 2. Normalize Teachers
      const updatedTeachers = await Promise.all(submissions.map(async (t) => {
        try {
          if (t.password !== DEFAULT_PWD) {
            const updated = { ...t, password: DEFAULT_PWD };
            const id = t._id || t.id;
            if (!id) return t;

            await api.teachers.update(id, updated);
            teacherUpdates++;
            return { ...updated, id };
          }
          return t;
        } catch (e) {
          console.error(`Failed to normalize teacher ${t.fullName}:`, e);
          return t;
        }
      }));

      console.log(`✅ Normalization Finished: ${studentUpdates} Students updated, ${teacherUpdates} Teachers updated.`);

      setStudentSubmissions(updatedStudents);
      setSubmissions(updatedTeachers);

      alert(`Success!\n\n- ${studentUpdates} Students normalized\n- ${teacherUpdates} Teachers normalized\n\nAll records now use 'Mrsptu@12345' as password.`);

      loadSubmissions();
    } catch (err) {
      console.error("Normalization CRASHED:", err);
      alert("Normalization failed. Check console for details.");
    }
  };

  const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
  const isClerkLoggedIn = sessionStorage.getItem('isClerkLoggedIn') === 'true';
  const isDepartmentLoggedIn = sessionStorage.getItem('isDepartmentLoggedIn') === 'true' || isClerkLoggedIn;
  const roleDepartmentData = isDepartmentLoggedIn ? (JSON.parse(sessionStorage.getItem('loggedInDepartment')) || JSON.parse(sessionStorage.getItem('loggedInClerk'))) : null;
  const adminCreds = isAdminLoggedIn ? JSON.parse(sessionStorage.getItem('loggedInAdmin')) : null;

  useEffect(() => {
    if (!isAdminLoggedIn && !isDepartmentLoggedIn) {
      navigate('/login');
    }
    // Handle tab visibility for Master Admin vs Department
    if (isAdminLoggedIn && activeTab === 'attendance_stats') {
      setActiveTab('students');
    }
    // Autofill student department filter for HOD
    if (isDepartmentLoggedIn && roleDepartmentData?.department && !studentDeptFilter) {
      setStudentDeptFilter(roleDepartmentData.department);
    }

    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setIsLoading(true);
    try {
      const [teachers, students, depts, admins, recs, attDays] = await Promise.all([
        api.teachers.getAll(),
        api.students.getAll(),
        api.departments.getAll(),
        api.admins.getAll(),
        api.attendance.getAll(),
        api.attendanceDays.getAll(isDepartmentLoggedIn ? roleDepartmentData?.department : null)
      ]);

      setSubmissions(teachers.map(t => ({ ...t, id: t._id || t.id })));
      setStudentSubmissions(students.map(s => ({ ...s, id: s._id || s.id })));
      setDepartmentSubmissions(depts.map(d => ({ ...d, id: d._id || d.id })));
      setAdminSubmissions(admins.map(a => ({ ...a, id: a._id })));
      setAttendanceRecords(recs.map(r => ({
        ...r,
        id: r._id || r.id,
        dateDisplay: r.date ? formatDate(r.date) : 'N/A'
      })));
      setAttendanceDaysList(attDays || []);

      // Load notices, courses, and edit requests
      let notices = [];
      let courses = [];
      let editRequests = [];
      try {
        notices = await api.notices.getAll(isDepartmentLoggedIn ? roleDepartmentData?.department : null);
        courses = await api.courses.getAll(isDepartmentLoggedIn ? roleDepartmentData?.department : null);
        editRequests = await api.attendanceEditRequests.getAll({
          department: isDepartmentLoggedIn ? roleDepartmentData?.department : null
        });
      } catch (err) {
        console.error("Error loading secondary tables:", err);
      }
      setNoticesList(notices || []);
      setCoursesList(courses || []);
      setEditRequestsList(editRequests || []);

      console.log(`📊 Data Loaded: ${teachers.length} Teachers, ${students.length} Students, ${depts.length} Departments`);
    } catch (err) {
      console.error('Error loading data from MongoDB:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddAttendanceDay = async (e) => {
    e.preventDefault();
    if (!newDayDate || !newDayNotice) {
      alert("Please select a date and enter a notice.");
      return;
    }
    const payload = {
      date: newDayDate,
      status: newDayStatus,
      notice: newDayNotice,
      department: isDepartmentLoggedIn ? roleDepartmentData.department : newDayDept,
      createdBy: isDepartmentLoggedIn ? roleDepartmentData.headName : adminCreds?.fullName || 'Admin',
      role: isAdminLoggedIn ? 'admin' : (isClerkLoggedIn ? 'clerk' : 'hod')
    };

    try {
      const saved = await api.attendanceDays.create(payload);

      // ── Post to Notice Board ──────────────────────────────────────
      const dateLabel = new Date(payload.date + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      const statusLabel = payload.status === 'off' ? 'OFF (Holiday)' : 'ON (Working Day)';
      const noticeMsg = `${dateLabel}: Set as ${statusLabel} (Notice: ${payload.notice}) for department ${payload.department} (Updated by ${payload.createdBy})`;
      try {
        await api.notices.create({
          title: `📅 Day ${statusLabel} — ${dateLabel}`,
          message: noticeMsg,
          category: 'calendar',
          department: payload.department,
        });
      } catch (ne) { console.warn('Notice post failed:', ne.message); }

      // ── Trigger 6-second popup ────────────────────────────────────
      const popupDay = saved || payload;
      setDayAlertPopup({ ...popupDay, _label: noticeMsg });
      setTimeout(() => setDayAlertPopup(null), 6000);

      setNewDayDate('');
      setNewDayNotice('');
      const updatedDays = await api.attendanceDays.getAll(isDepartmentLoggedIn ? roleDepartmentData?.department : null);
      setAttendanceDaysList(updatedDays);
    } catch (err) {
      console.error("Failed to add attendance day:", err);
      alert("Error saving day configuration: " + err.message);
    }
  };

  const handleDeleteAttendanceDay = async (id) => {
    if (!window.confirm("Are you sure you want to delete this configuration?")) return;
    try {
      await api.attendanceDays.delete(id);
      alert("Day configuration deleted.");
      
      const updatedDays = await api.attendanceDays.getAll(isDepartmentLoggedIn ? roleDepartmentData?.department : null);
      setAttendanceDaysList(updatedDays);
    } catch (err) {
      console.error("Failed to delete attendance day:", err);
      alert("Error deleting day configuration.");
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await api.uploadHolidayPdf(base64);
          alert(`Successfully parsed academic calendar!\n${res.message}`);
          loadSubmissions();
        } catch (err) {
          alert('Failed to process calendar PDF: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Error loading file: ' + err.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleProofFileChange = (studentId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAttendanceChanges(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          proofFile: reader.result
        }
      }));
    };
  };

  const handleSaveAttendanceEdits = async () => {
    setSavingEdit(true);
    try {
      const changedStudentIds = Object.keys(attendanceChanges);
      if (changedStudentIds.length === 0) {
        alert("No changes made.");
        setShowEditAttendanceModal(false);
        return;
      }

      for (const studentId of changedStudentIds) {
        const change = attendanceChanges[studentId];
        const student = studentSubmissions.find(s => s._id === studentId || s.enrollmentNumber === studentId);
        const studentName = student ? student.fullName : studentId;

        if (isClerkLoggedIn) {
          // Clerk submits request
          const payload = {
            attendanceId: selectedAttendanceRecord._id,
            studentId,
            studentName,
            date: selectedAttendanceRecord.date,
            subject: selectedAttendanceRecord.subject,
            semester: selectedAttendanceRecord.semester,
            course: selectedAttendanceRecord.course,
            department: selectedAttendanceRecord.department,
            previousStatus: selectedAttendanceRecord.attendance[studentId] || 'Absent',
            requestedStatus: change.status,
            proofType: change.proofType || 'Other',
            proofDescription: change.reason || 'No explanation provided',
            proofDocument: change.proofFile || '',
            requestedBy: roleDepartmentData?.headName || 'Clerk',
            requestedByRole: 'clerk'
          };
          await api.attendanceEditRequests.create(payload);
        } else {
          // HOD updates directly
          const payload = {
            studentId,
            studentName,
            newStatus: change.status,
            hodName: roleDepartmentData?.headName || 'HOD',
            proofType: change.proofType || 'Other',
            proofDescription: change.reason || 'HOD Direct Modification',
            proofDocument: change.proofFile || ''
          };
          await api.attendance.update(selectedAttendanceRecord._id, payload);
        }
      }

      alert(isClerkLoggedIn ? "Attendance correction requests submitted for HOD approval!" : "Attendance corrected successfully!");
      setShowEditAttendanceModal(false);
      setAttendanceChanges({});
      loadSubmissions();
    } catch (err) {
      console.error(err);
      alert("Error saving edits: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const renderNoticeBoard = () => {
    return (
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 25px rgba(0,0,0,0.05)' }}>
        <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📢 SYSTEM NOTICE BOARD & NOTIFICATIONS
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
          {noticesList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontStyle: 'italic' }}>No recent notifications on the notice board.</p>
          ) : (
            noticesList.map(notice => (
              <div key={notice._id} style={{
                padding: '20px',
                borderRadius: '12px',
                borderLeft: `5px solid ${
                  notice.category === 'attendance' ? '#3498db' :
                  notice.category === 'course' ? '#2ecc71' :
                  notice.category === 'calendar' ? '#8b4513' : '#999'
                }`,
                background: '#fcfcfc',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '15px',
                    color: notice.category === 'calendar' ? '#8b4513' : 'var(--primary)'
                  }}>{notice.title}</span>
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{new Date(notice.date || notice.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#555', lineHeight: '1.5' }}>{notice.message}</p>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                  Category: <strong style={{ textTransform: 'uppercase' }}>{notice.category}</strong> | Department: {notice.department}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderCoursesManagement = () => {
    return (
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 25px rgba(0,0,0,0.05)' }}>
        <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px', color: 'var(--primary)' }}>
          📚 Course Directory Management
        </h3>
        
        {/* Add Course Form */}
        <div style={{ background: '#fcfcfc', border: '1px solid #eee', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Add New Academic Course</h4>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="e.g. B.Tech AI & Data Science"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={async () => {
                if (!newCourseName.trim()) return alert("Course name cannot be empty");
                try {
                  const dept = isDepartmentLoggedIn ? roleDepartmentData.department : 'Department of Computer Science & Engineering';
                  await api.courses.create({ name: newCourseName.trim(), department: dept });
                  alert("Course added successfully!");
                  setNewCourseName('');
                  loadSubmissions();
                } catch (err) {
                  alert(err.message);
                }
              }}
              style={{ padding: '10px 25px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ➕ Add Course
            </button>
          </div>
        </div>

        {/* Courses List */}
        <div>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Existing Courses in Department</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {coursesList.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No courses configured for this department yet.</p>
            ) : (
              coursesList.map(course => (
                <div key={course._id} style={{ padding: '15px 20px', background: '#fafafa', border: '1px solid #eee', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>{course.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{course.department}</div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to remove the course '${course.name}'?`)) return;
                      try {
                        await api.courses.delete(course._id);
                        alert("Course removed successfully!");
                        loadSubmissions();
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '18px' }}
                    title="Delete Course"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEditRequests = () => {
    return (
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 25px rgba(0,0,0,0.05)' }}>
        <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px', color: 'var(--primary)' }}>
          📋 Clerk Attendance Edit Requests Workflow
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {editRequestsList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontStyle: 'italic' }}>No attendance edit requests submitted yet.</p>
          ) : (
            editRequestsList.map(req => (
              <div key={req._id} style={{
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #eee',
                background: '#fafafa',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>{req.studentName} ({req.course})</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                      Subject: <strong>{req.subject}</strong> | Sem: {req.semester} | Class Date: {req.date}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                      Requested by clerk: <strong>{req.requestedBy}</strong> | Status: <strong style={{
                        color: req.status === 'approved' ? '#27ae60' : req.status === 'rejected' ? '#e74c3c' : '#f39c12'
                      }}>{req.status.toUpperCase()}</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#888' }}>
                      Status Change: <strong style={{ color: '#e74c3c' }}>{req.previousStatus}</strong> ➡️ <strong style={{ color: '#27ae60' }}>{req.requestedStatus}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '8px', fontSize: '13px', color: '#555', marginBottom: '15px' }}>
                  <strong>Proof Type:</strong> {req.proofType} <br/>
                  <strong>Explanation:</strong> {req.proofDescription}
                  {req.proofDocument && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Supporting Attachment:</strong> <br/>
                      <img
                        src={req.proofDocument}
                        alt="Proof Document"
                        style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '5px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>

                {req.status === 'pending' && !isClerkLoggedIn && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Approve this correction and apply to database?")) return;
                        try {
                          await api.attendanceEditRequests.approve(req._id, roleDepartmentData?.headName || 'HOD');
                          alert("Correction approved and attendance database updated!");
                          loadSubmissions();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                      style={{ padding: '8px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Approve ✅
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Reject this correction request?")) return;
                        try {
                          await api.attendanceEditRequests.reject(req._id, roleDepartmentData?.headName || 'HOD');
                          alert("Correction request rejected!");
                          loadSubmissions();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                      style={{ padding: '8px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Reject ❌
                    </button>
                  </div>
                )}

                {req.status !== 'pending' && (
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>
                    Processed by HOD: <strong>{req.processedBy}</strong> on {new Date(req.processedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, (compressedData) => {
        if (isDepartmentLoggedIn) {
          const updated = { ...roleDepartmentData, profilePhoto: compressedData };
          saveProfileUpdate(updated, 'department');
        } else if (isAdminLoggedIn) {
          const updated = { ...adminCreds, profilePhoto: compressedData };
          saveProfileUpdate(updated, 'admin');
        }
      });
    }
  };

  const handleMemberPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file && editingMember) {
      compressImage(file, async (compressedData) => {
        const { id, type } = editingMember;
        try {
          if (type === 'teacher') {
            const member = submissions.find(t => t.id === id);
            if (member) {
              const updated = { ...member, profilePhoto: compressedData };
              await api.teachers.update(id, updated);
              setSubmissions(submissions.map(item => item.id === id ? updated : item));
            }
          } else if (type === 'student') {
            const member = studentSubmissions.find(s => s.id === id);
            if (member) {
              const updated = { ...member, profilePhoto: compressedData };
              await api.students.update(id, updated);
              setStudentSubmissions(studentSubmissions.map(item => item.id === id ? updated : item));
            }
          } else if (type === 'department') {
            const member = departmentSubmissions.find(d => d.id === id);
            if (member) {
              const updated = { ...member, profilePhoto: compressedData };
              await api.departments.update(id, updated);
              setDepartmentSubmissions(departmentSubmissions.map(item => item.id === id ? updated : item));
            }
          }
          alert("Profile photo updated successfully!");
        } catch (err) {
          console.error("Failed to update photo:", err);
          alert("Failed to save photo to database.");
        }
        setEditingMember(null);
      });
    }
  };

  const triggerMemberPhotoEdit = (id, type) => {
    setEditingMember({ id, type });
    setTimeout(() => memberPhotoInputRef.current.click(), 0);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      alert("Passwords do not match!");
      return;
    }
    if (newPwd.length < 4) {
      alert("Password must be at least 4 characters long.");
      return;
    }

    if (isDepartmentLoggedIn) {
      const updated = { ...roleDepartmentData, password: newPwd };
      await saveProfileUpdate(updated, 'department');
    } else if (isAdminLoggedIn) {
      const updated = { ...adminCreds, password: newPwd };
      await saveProfileUpdate(updated, 'admin');
    }

    setShowPwdModal(false);
    setNewPwd('');
    setConfirmPwd('');
  };

  const saveProfileUpdate = async (updatedUser, role) => {
    try {
      const id = updatedUser._id || updatedUser.id || updatedUser.uuid;
      if (role === 'department') {
        await api.departments.update(id, updatedUser);
        sessionStorage.setItem('loggedInDepartment', JSON.stringify(updatedUser));
        setDepartmentSubmissions(prev => prev.map(d => (d._id === id || d.id === id) ? updatedUser : d));
      } else {
        await api.admins.update(id, updatedUser);
        sessionStorage.setItem('loggedInAdmin', JSON.stringify(updatedUser));
        setAdminSubmissions(prev => prev.map(a => (a._id === id || a.id === id || a.uuid === id) ? updatedUser : a));
      }
      alert("Password updated successfully in database!");
    } catch (err) {
      console.error('Failed to update profile in database:', err);
      alert(`Failed to update password: ${err.message || 'Server error'}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('isDepartmentLoggedIn');
    sessionStorage.removeItem('isClerkLoggedIn');
    sessionStorage.removeItem('loggedInDepartment');
    sessionStorage.removeItem('loggedInClerk');
    sessionStorage.removeItem('loggedInAdmin');
    navigate('/');
  };

  const handleAddTeacher = () => {
    navigate('/form');
  };

  const handleAddStudent = () => {
    navigate('/student-form');
  };

  const handleAddDepartment = () => {
    navigate('/department-form');
  };

  const handleAddClerk = () => {
    navigate('/clerk-form');
  };

  const handleClearData = async () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setIsDeleteMode(false);
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected records? This cannot be undone.`)) {
      try {
        console.log(`🗑️ Deleting ${selectedIds.length} items from ${activeTab}... IDs:`, selectedIds);

        let successCount = 0;
        let failCount = 0;

        await Promise.all(selectedIds.map(async (id) => {
          try {
            if (activeTab === 'teachers') await api.teachers.delete(id);
            else if (activeTab === 'students') await api.students.delete(id);
            else if (activeTab === 'departments' || activeTab === 'clerks') await api.departments.delete(id);
            else if (activeTab === 'admins') await api.admins.delete(id);
            else if (activeTab === 'attendance_history') await api.attendance.delete(id);
            successCount++;
          } catch (e) {
            console.error(`Failed to delete ID ${id}:`, e);
            failCount++;
          }
        }));

        alert(`Deletion complete!\n- Success: ${successCount}\n- Failed: ${failCount}`);

        // Final cleanup
        setSelectedIds([]);
        setIsDeleteMode(false);
        loadSubmissions();
      } catch (err) {
        console.error('Deletion process crashed:', err);
        alert(`Deletion failed: ${err.message || 'Server error'}`);
      }
    }
  };



  const baseTeachers = isDepartmentLoggedIn && roleDepartmentData ? submissions.filter(t => t.department === roleDepartmentData.department) : submissions;
  const baseStudents = isDepartmentLoggedIn && roleDepartmentData ? studentSubmissions.filter(s => api.departments.getCourses(roleDepartmentData.department).includes(s.course)) : studentSubmissions;

  const isHOD = sessionStorage.getItem('isDepartmentLoggedIn') === 'true';
  const isHODOrAdmin = isAdminLoggedIn || isHOD;
  const hodSubmissions = departmentSubmissions.filter(d => d.role !== 'clerk');
  const allClerks = departmentSubmissions.filter(d => d.role === 'clerk');
  const baseClerks = isDepartmentLoggedIn && roleDepartmentData ? allClerks.filter(c => c.department === roleDepartmentData.department) : allClerks;

  const filteredTeachers = baseTeachers.filter(t => departmentFilter === 'All' || t.department === departmentFilter);
  const filteredStudents = baseStudents.filter(s =>
    (isDepartmentLoggedIn || !studentDeptFilter || s.department === studentDeptFilter) &&
    (s.course === courseFilter) &&
    matchSemester(s.semester, semesterFilter)
  )
    .sort((a, b) => (a.enrollmentNumber || '').localeCompare(b.enrollmentNumber || '', undefined, { numeric: true }));

  const handleSelectAll = (e) => {
    const currentData = activeTab === 'teachers' ? filteredTeachers
      : activeTab === 'students' ? filteredStudents
        : activeTab === 'departments' ? hodSubmissions
          : activeTab === 'clerks' ? baseClerks
            : adminSubmissions;

    if (e.target.checked) {
      if (activeTab === 'admins') {
        setSelectedIds(currentData.filter(a => a.username !== 'Adminmanminder').map(t => t._id || t.uuid || t.username));
      } else {
        setSelectedIds(currentData.map(t => t._id || t.id));
      }
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const viewDetails = (teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherModal(true);
  };

  const handleDownloadPDF = () => {
    setShowPdfModal(true);
  };



  return (
    <div style={{ padding: '20px 4%', maxWidth: '1600px', margin: '0 auto' }}>
      <input type="file" ref={memberPhotoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleMemberPhotoChange} />
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="profile-container" onClick={() => fileInputRef.current.click()} style={{ position: 'relative' }}>
            {isDepartmentLoggedIn && roleDepartmentData?.profilePhoto ? (
              <img src={roleDepartmentData.profilePhoto} alt="HOD" className="profile-thumb" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
            ) : isAdminLoggedIn && adminCreds?.profilePhoto ? (
              <img src={adminCreds.profilePhoto} alt="Admin" className="profile-thumb" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
            ) : (
              <div className="profile-thumb" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '20px', fontWeight: 'bold', border: '2px solid var(--primary)' }}>
                {(isDepartmentLoggedIn ? roleDepartmentData?.headName : adminCreds?.fullName)?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="edit-overlay">
              <span>📷</span>
            </div>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoChange} />
          </div>
          <div>
            <h2 style={{ color: 'var(--primary)', fontSize: '28px', margin: 0 }}>
              {isDepartmentLoggedIn ? `${roleDepartmentData?.department} Dashboard` : 'Admin Dashboard'}
            </h2>
            {isDepartmentLoggedIn ? (
              <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold' }}>{isClerkLoggedIn ? 'Clerk' : 'HOD'}: {roleDepartmentData?.headName}</p>
            ) : isAdminLoggedIn && adminCreds?.fullName ? (
              <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                Admin: {adminCreds?.fullName}
              </p>
            ) : null}
          </div>
        </div>
        <div className="admin-actions">
          <button onClick={() => setShowPwdModal(true)} style={{ background: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            Change Password
          </button>
          <button onClick={handleAddTeacher} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            Add Teacher
          </button>
          <button onClick={handleAddStudent} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            Add Student
          </button>
          {!isClerkLoggedIn && (
            <button onClick={handleAddClerk} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
              Add Clerk
            </button>
          )}
          {!isDepartmentLoggedIn && (
            <>
              <button onClick={handleAddDepartment} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
                Add Department
              </button>
              <button onClick={() => navigate('/register')} style={{ background: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
                Register New Admin
              </button>
            </>
          )}
          <button onClick={normalizeSemesters} style={{ background: '#34495e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginRight: '10px' }}>Normalize Data</button>
          <button onClick={handleClearData} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            {isDeleteMode ? (selectedIds.length > 0 ? `Delete (${selectedIds.length})` : 'Cancel') : 'Clear Data'}
          </button>
          <button onClick={handleLogout} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {/* 6-Second Animated Day-Change Popup */}
      {dayAlertPopup && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: dayAlertPopup.status === 'off' ? '#fef2f2' : '#f0fdf4',
          border: `2px solid ${dayAlertPopup.status === 'off' ? '#ef4444' : '#22c55e'}`,
          borderLeft: `6px solid ${dayAlertPopup.status === 'off' ? '#dc2626' : '#16a34a'}`,
          borderRadius: '12px', padding: '18px 24px', maxWidth: '520px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          animation: 'slideInRight 0.4s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '28px', flexShrink: 0 }}>{dayAlertPopup.status === 'off' ? '🛑' : '✅'}</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: dayAlertPopup.status === 'off' ? '#991b1b' : '#14532d', marginBottom: '6px' }}>
                📅 Day Schedule Updated
              </div>
              <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                {dayAlertPopup._label}
              </div>
            </div>
            <button onClick={() => setDayAlertPopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', marginLeft: 'auto', flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: dayAlertPopup.status === 'off' ? '#dc2626' : '#16a34a', animation: 'shrinkBar 6s linear forwards' }}></div>
          </div>
        </div>
      )}

      <div className="admin-tabs-container">
        <div className="admin-tabs">
          <button
            onClick={() => { setActiveTab('students'); setSelectedIds([]); setIsDeleteMode(false); }}
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'students' ? '3px solid var(--primary)' : 'none', color: activeTab === 'students' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Student Submissions
          </button>
          <button
            onClick={() => { setActiveTab('teachers'); setSelectedIds([]); setIsDeleteMode(false); }}
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'teachers' ? '3px solid var(--primary)' : 'none', color: activeTab === 'teachers' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Teacher Submissions
          </button>
          {!isDepartmentLoggedIn && (
            <>
              <button
                onClick={() => { setActiveTab('departments'); setSelectedIds([]); setIsDeleteMode(false); }}
                style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'departments' ? '3px solid var(--primary)' : 'none', color: activeTab === 'departments' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
                Department Submissions
              </button>
              <button
                onClick={() => { setActiveTab('admins'); setSelectedIds([]); setIsDeleteMode(false); }}
                style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'admins' ? '3px solid var(--primary)' : 'none', color: activeTab === 'admins' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
                Admin Accounts
              </button>
            </>
          )}
          {isDepartmentLoggedIn && (
            <button
              onClick={() => { setActiveTab('attendance_stats'); setSelectedIds([]); setIsDeleteMode(false); }}
              style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'attendance_stats' ? '3px solid var(--primary)' : 'none', color: activeTab === 'attendance_stats' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Attendance Stats
            </button>
          )}
          {isHODOrAdmin && (
            <button
              onClick={() => { setActiveTab('clerks'); setSelectedIds([]); setIsDeleteMode(false); }}
              style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'clerks' ? '3px solid var(--primary)' : 'none', color: activeTab === 'clerks' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Clerk Submissions
            </button>
          )}
          <button
            onClick={() => { setActiveTab('attendance_days'); setSelectedIds([]); setIsDeleteMode(false); }}
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'attendance_days' ? '3px solid var(--primary)' : 'none', color: activeTab === 'attendance_days' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Day Off/On Manager
          </button>
          <button
            onClick={() => { setActiveTab('notice_board'); setSelectedIds([]); setIsDeleteMode(false); }}
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'notice_board' ? '3px solid var(--primary)' : 'none', color: activeTab === 'notice_board' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Notice Board 📢
          </button>
          {(isDepartmentLoggedIn || isAdminLoggedIn) && (
            <button
              onClick={() => { setActiveTab('courses_management'); setSelectedIds([]); setIsDeleteMode(false); }}
              style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'courses_management' ? '3px solid var(--primary)' : 'none', color: activeTab === 'courses_management' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Courses Directory 📚
            </button>
          )}
          {isDepartmentLoggedIn && (
            <button
              onClick={() => { setActiveTab('edit_requests'); setSelectedIds([]); setIsDeleteMode(false); }}
              style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'edit_requests' ? '3px solid var(--primary)' : 'none', color: activeTab === 'edit_requests' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Edit Requests 📋
            </button>
          )}
        </div>

        <div className="admin-filters">
          {activeTab === 'teachers' ? (
            isDepartmentLoggedIn ? (
              <select value={roleDepartmentData?.department} disabled style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', background: '#f5f5f5', color: '#666' }}>
                <option>{roleDepartmentData?.department}</option>
              </select>
            ) : (
              <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setSelectedIds([]); }} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )
          ) : activeTab === 'students' ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {isDepartmentLoggedIn ? (
                <select value={roleDepartmentData?.department} disabled style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', background: '#f5f5f5', color: '#666' }}>
                  <option>{roleDepartmentData?.department}</option>
                </select>
              ) : (
                <select value={studentDeptFilter} onChange={(e) => { setStudentDeptFilter(e.target.value); setCourseFilter(''); setSelectedIds([]); }} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
              <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setSelectedIds([]); }} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                <option value="">Select Course</option>
                {api.departments.getCourses(isDepartmentLoggedIn ? roleDepartmentData?.department : studentDeptFilter).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={semesterFilter} onChange={(e) => { setSemesterFilter(e.target.value); setSelectedIds([]); }} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                <option value="">Select Semester</option>
                <option value="Odd Semester">Odd Semester</option>
                <option value="Even Semester">Even Semester</option>
              </select>
            </div>
          ) : null}
          {activeTab !== 'attendance_stats' && (
            <button
              onClick={handleDownloadPDF}
              style={{ marginLeft: '10px', background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              📥 Download PDF
            </button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        {activeTab === 'students' && ((!isDepartmentLoggedIn && !studentDeptFilter) || !courseFilter || !semesterFilter) ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: '15px' }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📋</div>
            <h3 style={{ color: '#333', margin: '0 0 10px 0' }}>Data Selection Required</h3>
            <p style={{ color: '#666', margin: 0 }}>Please select {!isDepartmentLoggedIn && !studentDeptFilter ? 'a Department, ' : ''}a <strong>Course</strong> and <strong>Semester</strong> to view the student list.</p>
          </div>
        ) : (
          (((activeTab === 'teachers' ? filteredTeachers : activeTab === 'students' ? filteredStudents : activeTab === 'departments' ? hodSubmissions : activeTab === 'clerks' ? baseClerks : adminSubmissions).length === 0 && !isLoading) && activeTab !== 'attendance_days' && activeTab !== 'notice_board' && activeTab !== 'courses_management' && activeTab !== 'edit_requests') ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-light)', fontStyle: 'italic' }}>
              No {activeTab} submissions found.
            </div>
          ) : (
          activeTab === 'students' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  {isDeleteMode && <th style={{ ...thStyle, width: '40px' }}><input type="checkbox" onChange={handleSelectAll} checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} /></th>}
                  <th style={thStyle}>Reg. Photo</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Batch</th>
                  <th style={thStyle}>Roll No</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={`skel-student-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                      {isDeleteMode && <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>}
                      <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '200px' }}></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                      <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    </tr>
                  ))
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(s.id) ? '#f0f8ff' : 'transparent' }}>
                      {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelect(s.id)} /></td>}

                      <td style={tdStyle}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          {s.profilePhoto ? (
                            <img src={s.profilePhoto} alt="Profile" className="profile-thumb" />
                          ) : (
                            <div className="profile-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>{s.fullName?.charAt(0).toUpperCase()}</div>
                          )}
                          <div
                            onClick={() => triggerMemberPhotoEdit(s.id, 'student')}
                            style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', border: '1px solid white' }}
                          >
                            📷
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{formatDate(s.createdAt || s.registrationDate || s.submissionDate)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{s.fullName}</td>
                      <td style={tdStyle}>{s.email}</td>
                      <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{s.course}</span></td>
                      <td style={tdStyle}>{s.batchYear}</td>
                      <td style={tdStyle}>{s.enrollmentNumber}</td>
                      <td style={tdStyle}>
                        <button onClick={() => viewStudentDetails(s)} style={{ background: 'none', border: 'none', color: '#1e6bd6', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>View Profile</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            activeTab === 'teachers' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    {isDeleteMode && <th style={{ ...thStyle, width: '40px' }}><input type="checkbox" onChange={handleSelectAll} checked={filteredTeachers.length > 0 && selectedIds.length === filteredTeachers.length} /></th>}
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Full Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Subject</th>
                    <th style={thStyle}>Exp. (Yrs)</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Details</th>

                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={`skel-teacher-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                        {isDeleteMode && <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>}
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '200px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                      </tr>
                    ))
                  ) : (
                    filteredTeachers.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(t.id) ? '#f0f8ff' : 'transparent' }}>
                        {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => handleSelect(t.id)} /></td>}
                        <td style={tdStyle}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            {t.profilePhoto ? (
                              <img src={t.profilePhoto} alt="Profile" className="profile-thumb" />
                            ) : (
                              <div className="profile-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>{t.fullName?.charAt(0).toUpperCase()}</div>
                            )}
                            <div
                              onClick={() => triggerMemberPhotoEdit(t.id, 'teacher')}
                              style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', border: '1px solid white' }}
                            >
                              📷
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>{formatDate(t.createdAt || t.submissionDate)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{t.fullName}</td>
                        <td style={tdStyle}>{t.email}</td>
                        <td style={tdStyle}>{t.phone}</td>
                        <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{t.primarySubject}</span></td>
                        <td style={tdStyle}>{t.experience || '0'}</td>
                        <td style={tdStyle}>{t.department || 'N/A'}</td>
                        <td style={tdStyle}>
                          <button onClick={() => viewDetails(t)} style={{ background: 'none', border: 'none', color: '#1e6bd6', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>View Profile</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'departments' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    {isDeleteMode && <th style={{ ...thStyle, width: '40px' }}><input type="checkbox" onChange={handleSelectAll} checked={hodSubmissions.length > 0 && selectedIds.length === hodSubmissions.length} /></th>}
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Head Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={`skel-dept-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                        {isDeleteMode && <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>}
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '180px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                      </tr>
                    ))
                  ) : (
                    hodSubmissions.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(d.id) ? '#f0f8ff' : 'transparent' }}>
                        {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => handleSelect(d.id)} /></td>}
                        <td style={tdStyle}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            {d.profilePhoto ? (
                              <img src={d.profilePhoto} alt="Profile" className="profile-thumb" />
                            ) : (
                              <div className="profile-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>{d.headName?.charAt(0).toUpperCase()}</div>
                            )}
                            <div
                              onClick={() => triggerMemberPhotoEdit(d.id, 'department')}
                              style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', border: '1px solid white' }}
                            >
                              📷
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>{formatDate(d.createdAt || d.submissionDate)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{d.headName}</td>
                        <td style={tdStyle}>{d.email}</td>
                        <td style={tdStyle}>{d.phone}</td>
                        <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{d.department}</span></td>
                        <td style={tdStyle}>
                          <button onClick={() => viewDeptDetails(d)} style={{ background: 'none', border: 'none', color: '#1e6bd6', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>View Profile</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'clerks' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    {isDeleteMode && <th style={{ ...thStyle, width: '40px' }}><input type="checkbox" onChange={handleSelectAll} checked={baseClerks.length > 0 && selectedIds.length === baseClerks.length} /></th>}
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Clerk Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={`skel-clerk-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                        {isDeleteMode && <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>}
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '180px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                      </tr>
                    ))
                  ) : (
                    baseClerks.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(c.id) ? '#f0f8ff' : 'transparent' }}>
                        {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => handleSelect(c.id)} /></td>}
                        <td style={tdStyle}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            {c.profilePhoto ? (
                              <img src={c.profilePhoto} alt="Profile" className="profile-thumb" />
                            ) : (
                              <div className="profile-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>{c.headName?.charAt(0).toUpperCase()}</div>
                            )}
                          </div>
                        </td>
                        <td style={tdStyle}>{formatDate(c.createdAt || c.submissionDate)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{c.headName}</td>
                        <td style={tdStyle}>{c.email}</td>
                        <td style={tdStyle}>{c.phone}</td>
                        <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{c.department}</span></td>
                        <td style={tdStyle}>
                          <button onClick={() => viewDeptDetails(c)} style={{ background: 'none', border: 'none', color: '#1e6bd6', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>View Profile</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'admins' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    {isDeleteMode && <th style={{ ...thStyle, width: '40px' }}><input type="checkbox" onChange={handleSelectAll} checked={adminSubmissions.length > 0 && selectedIds.length === adminSubmissions.length} /></th>}
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Full Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {adminSubmissions.map((a) => (
                    <tr key={a._id || a.username} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(a._id || a.uuid || a.username) ? '#f0f8ff' : 'transparent' }}>
                      {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(a._id || a.uuid || a.username)} onChange={() => handleSelect(a._id || a.uuid || a.username)} disabled={a.username === 'Adminmanminder'} /></td>}
                      <td style={tdStyle}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          {a.profilePhoto ? (
                            <img src={a.profilePhoto} alt="Profile" className="profile-thumb" />
                          ) : (
                            <div className="profile-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>{a.fullName ? a.fullName.charAt(0).toUpperCase() : 'A'}</div>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>{formatDate(a.createdAt || a.submissionDate)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{a.fullName || 'Admin User'}</td>
                      <td style={tdStyle}>{a.email}</td>
                      <td style={tdStyle}>{a.contact}</td>
                      <td style={tdStyle}>
                        <button onClick={() => viewAdminDetails(a)} style={{ background: 'none', border: 'none', color: '#1e6bd6', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>View Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === 'notice_board' ? (
              renderNoticeBoard()
            ) : activeTab === 'courses_management' ? (
              renderCoursesManagement()
            ) : activeTab === 'edit_requests' ? (
              renderEditRequests()
            ) : activeTab === 'attendance_days' ? (
              <div style={{ padding: '30px' }}>
                <div className="admin-days-grid">
                  {/* Create rule Form */}
                  <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '20px', marginTop: 0 }}>Configure Day Off/On Status</h3>
                    <form onSubmit={handleAddAttendanceDay}>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#444' }}>Select Date</label>
                        <input
                          type="date"
                          value={newDayDate}
                          onChange={(e) => setNewDayDate(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                          required
                        />
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#444' }}>Status</label>
                        <select
                          value={newDayStatus}
                          onChange={(e) => setNewDayStatus(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: 'white' }}
                        >
                          <option value="off">OFF (Holiday / Day Off)</option>
                          <option value="on">ON (Force Working Day)</option>
                        </select>
                      </div>

                      {!isDepartmentLoggedIn && (
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#444' }}>Apply To Department</label>
                          <select
                            value={newDayDept}
                            onChange={(e) => setNewDayDept(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: 'white' }}
                          >
                            <option value="All">All Departments (Campus-wide)</option>
                            {departments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {isDepartmentLoggedIn && (
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#888' }}>Department (Auto-set)</label>
                          <input
                            type="text"
                            value={roleDepartmentData?.department}
                            disabled
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#eee', color: '#666' }}
                          />
                        </div>
                      )}

                      <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#444' }}>Notice / Proof Description</label>
                        <textarea
                          placeholder="e.g. Gazetted Holiday, Institutional Break, or Midterm special schedule details."
                          value={newDayNotice}
                          onChange={(e) => setNewDayNotice(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', height: '100px', resize: 'vertical' }}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Save Configuration
                      </button>
                    </form>
                    {isAdminLoggedIn && (
                      <div style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: 'var(--primary)' }}>
                          📅 Bulk Import Holidays (PDF Calendar)
                        </label>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666' }}>
                          Upload the official academic calendar PDF. Dates will be extracted, marked as off-days, and broadcasted to the notice board automatically.
                        </p>
                        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfUpload}
                            style={{ display: 'none' }}
                            id="pdf-holiday-upload"
                            disabled={uploadingPdf}
                          />
                          <label
                            htmlFor="pdf-holiday-upload"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px',
                              padding: '12px',
                              background: uploadingPdf ? '#aaa' : '#8b4513',
                              color: 'white',
                              borderRadius: '8px',
                              cursor: uploadingPdf ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              border: 'none',
                              textAlign: 'center',
                              boxShadow: '0 4px 10px rgba(139, 69, 19, 0.2)',
                              transition: 'all 0.3s'
                            }}
                          >
                            {uploadingPdf ? '⏳ Parsing & Loading PDF...' : '📄 Upload Holiday PDF Calendar'}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* List of rules */}
                  <div style={{ background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #eee' }}>
                    <h3 style={{ color: '#333', marginBottom: '20px', marginTop: 0 }}>Configured Days</h3>
                    <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {attendanceDaysList.length === 0 ? (
                        <p style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center', padding: '50px 0' }}>No days configured yet.</p>
                      ) : (
                        attendanceDaysList.map((day) => (
                          <div
                            key={day._id || day.id}
                            style={{
                              padding: '15px',
                              borderRadius: '10px',
                              borderLeft: `5px solid ${day.status === 'off' ? '#e74c3c' : '#2ecc71'}`,
                              background: '#fcfcfc',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ flex: 1, paddingRight: '15px' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>{formatDate(day.date)}</span>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  fontWeight: 'bold',
                                  background: day.status === 'off' ? '#fde8e8' : '#e1f7eb',
                                  color: day.status === 'off' ? '#e74c3c' : '#2ecc71'
                                }}>
                                  {day.status === 'off' ? 'OFF (Holiday)' : 'ON (Work Day)'}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '6px' }}>
                                <strong>Notice:</strong> {day.notice}
                              </div>
                              <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
                                Dept: {day.department} | Created By: {day.createdBy} ({day.role?.toUpperCase()})
                              </div>
                            </div>
                            <div>
                              <button
                                onClick={() => handleDeleteAttendanceDay(day._id || day.id)}
                                style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                title="Delete Configuration"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'attendance_stats' ? (
              <div style={{ padding: '30px' }}>
                {/* Filter Selection Panel */}
                <div className="admin-stats-filters">
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>Select Course</label>
                    <select
                      value={statsCourseFilter}
                      onChange={(e) => setStatsCourseFilter(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: 'white' }}
                    >
                      <option value="">-- Choose Course --</option>
                      {(isDepartmentLoggedIn ? api.departments.getCourses(roleDepartmentData?.department) : [
                        'BSE. Graphic', 'B.Tech Mechanical', 'B.Tech Civil', 'B.Tech Electrical', 'BCA', 'MCA', 'Arts of Computer'
                      ]).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>Select Semester</label>
                    <select
                      value={statsSemesterFilter}
                      onChange={(e) => setStatsSemesterFilter(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: 'white' }}
                    >
                      <option value="">-- Choose Semester --</option>
                      <option value="Odd Semester">Odd Semester</option>
                      <option value="Even Semester">Even Semester</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>Select Subject</label>
                    <select
                      value={statsSubjectFilter}
                      onChange={(e) => setStatsSubjectFilter(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: 'white' }}
                    >
                      <option value="All">All Subjects</option>
                      {Array.from(new Set(attendanceRecords
                        .filter(r => r.course === statsCourseFilter && matchSemester(r.semester, statsSemesterFilter))
                        .map(r => r.subject)
                        .filter(Boolean)
                      )).sort().map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!statsCourseFilter || !statsSemesterFilter ? (
                  <div style={{ textAlign: 'center', padding: '100px 20px', color: '#999', background: 'white', borderRadius: '15px', border: '2px dashed #eee' }}>
                    <div style={{ fontSize: '50px', marginBottom: '20px' }}>📊</div>
                    <h3 style={{ margin: 0, color: '#666' }}>Ready to analyze attendance data?</h3>
                    <p style={{ margin: '10px 0 0 0' }}>Please select a <strong>Course</strong> and <strong>Semester</strong> above to generate the report.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                      {(() => {
                        const semesterName = statsSemesterFilter;

                        // Filter records for this semester, department, COURSE, and SUBJECT
                        const semRecords = attendanceRecords.filter(r =>
                          matchSemester(r.semester, semesterName) &&
                          r.course === statsCourseFilter &&
                          (statsSubjectFilter === 'All' || r.subject === statsSubjectFilter) &&
                          (!isDepartmentLoggedIn || r.department === roleDepartmentData.department)
                        );

                        // Filter students for this semester, department, and COURSE
                        const semStudents = studentSubmissions.filter(s =>
                          matchSemester(s.semester, semesterName) &&
                          s.course === statsCourseFilter &&
                          (!isDepartmentLoggedIn || api.departments.getCourses(roleDepartmentData.department).includes(s.course))
                        );

                        let totalPresent = 0;
                        let totalAbsent = 0;
                        let totalMarked = 0;

                        semRecords.forEach(record => {
                          Object.values(record.attendance).forEach(status => {
                            if (status === 'Present') totalPresent++;
                            else if (status === 'Absent') totalAbsent++;
                            totalMarked++;
                          });
                        });

                        const avgAttendance = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

                        return (
                          <div key={semesterName} style={{ background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)', borderLeft: '6px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                              <div>
                                <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '20px' }}>{semesterName}</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: '#888', fontWeight: '600' }}>{statsCourseFilter} {statsSubjectFilter !== 'All' ? `(${statsSubjectFilter})` : ''}</p>
                              </div>
                              <div style={{ borderRadius: '50%', width: '50px', height: '50px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📈</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <span style={{ color: '#666' }}>Students Enrolled:</span>
                              <span style={{ fontWeight: 'bold' }}>{semStudents.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <span style={{ color: '#666' }}>Total Present Count:</span>
                              <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{totalPresent}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                              <span style={{ color: '#666' }}>Total Absent Count:</span>
                              <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{totalAbsent}</span>
                            </div>

                            <div style={{ height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
                              <div style={{ width: `${avgAttendance}%`, height: '100%', background: 'linear-gradient(90deg, #2ecc71, #27ae60)', transition: 'width 0.5s ease-out' }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#444' }}>Average Attendance</span>
                              <span style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: '900' }}>{avgAttendance}%</span>
                            </div>

                            <button
                              onClick={() => api.attendance.generateClassPDF(semStudents, semRecords, statsCourseFilter, semesterName)}
                              style={{ width: '100%', marginTop: '20px', padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.3s' }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#6b2016'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
                            >
                              📥 Download Class Attendance PDF
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ marginTop: '40px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#333' }}>Attendance History Library</h3>
                        <span style={{ fontSize: '13px', color: '#888', background: '#f5f5f5', padding: '5px 12px', borderRadius: '15px' }}>
                          Showing records for <strong>{statsCourseFilter}</strong> {statsSubjectFilter !== 'All' ? `(${statsSubjectFilter})` : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {attendanceRecords
                          .filter(r =>
                            matchSemester(r.semester, statsSemesterFilter) &&
                            r.course === statsCourseFilter &&
                            (statsSubjectFilter === 'All' || r.subject === statsSubjectFilter) &&
                            (!isDepartmentLoggedIn || r.department === roleDepartmentData.department)
                          )
                          .sort((a, b) => b.id - a.id)
                          .map(record => {
                            const presentCount = Object.values(record.attendance).filter(v => v === 'Present').length;
                            const totalCount = Object.keys(record.attendance).length;
                            return (
                              <div key={record.id} style={{ padding: '15px 20px', background: 'white', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
                                <div>
                                  <div style={{ fontWeight: 'bold', color: '#444', fontSize: '16px' }}>{record.subject}</div>
                                  <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{record.dateDisplay}</span> • Prof. {record.teacherName} • Session: {record.session || 'N/A'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ padding: '6px 15px', borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32', fontSize: '13px', fontWeight: 'bold', display: 'inline-block' }}>
                                      {presentCount} / {totalCount} Students Present
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px' }}>ID: #{record.id}</div>
                                  </div>
                                  {isDepartmentLoggedIn && (
                                    <button 
                                      onClick={() => {
                                        setSelectedAttendanceRecord(record);
                                        setShowEditAttendanceModal(true);
                                      }}
                                      style={{ padding: '8px 15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                    >
                                      ✏️ Edit
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        {attendanceRecords.filter(r => matchSemester(r.semester, statsSemesterFilter) && r.course === statsCourseFilter && (statsSubjectFilter === 'All' || r.subject === statsSubjectFilter)).length === 0 && (
                          <p style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontStyle: 'italic' }}>No attendance records found for this selection.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null
          )))}
      </div>

      {showPdfModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '15px', width: '90%', maxWidth: '450px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📄</div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Export PDF Report</h3>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '15px' }}>
              Would you like to include sensitive login credentials (<strong>Username, User ID & Password</strong>) in the exported list?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button
                onClick={() => {
                  const currentData = activeTab === 'teachers' ? filteredTeachers : activeTab === 'students' ? filteredStudents : activeTab === 'departments' ? hodSubmissions : activeTab === 'clerks' ? baseClerks : adminSubmissions;
                  api.admins.generateListPDF(activeTab, currentData, true);
                  setShowPdfModal(false);
                }}
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Yes, Include Credentials
              </button>
              <button
                onClick={() => {
                  const currentData = activeTab === 'teachers' ? filteredTeachers : activeTab === 'students' ? filteredStudents : activeTab === 'departments' ? hodSubmissions : activeTab === 'clerks' ? baseClerks : adminSubmissions;
                  api.admins.generateListPDF(activeTab, currentData, false);
                  setShowPdfModal(false);
                }}
                style={{ background: '#3498db', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                No, Basic Info Only
              </button>
            </div>
            <button
              onClick={() => setShowPdfModal(false)}
              style={{ marginTop: '20px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>
              Cancel Export
            </button>
          </div>
        </div>
      )}

      {showEditAttendanceModal && selectedAttendanceRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid #eee', paddingBottom: '15px', marginTop: 0 }}>
              ✏️ Edit Attendance: {selectedAttendanceRecord.subject}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '15px 0 25px 0', fontSize: '14px', background: '#fafafa', padding: '15px', borderRadius: '8px' }}>
              <div><strong>Course:</strong> {selectedAttendanceRecord.course}</div>
              <div><strong>Semester:</strong> {selectedAttendanceRecord.semester}</div>
              <div><strong>Date:</strong> {selectedAttendanceRecord.dateDisplay}</div>
              <div><strong>Session:</strong> {selectedAttendanceRecord.session || 'N/A'}</div>
            </div>

            <h4 style={{ color: '#333', marginBottom: '15px' }}>Student Roll call</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
              {(() => {
                const classStudents = studentSubmissions.filter(s => 
                  s.course === selectedAttendanceRecord.course && 
                  matchSemester(s.semester, selectedAttendanceRecord.semester)
                );

                if (classStudents.length === 0) {
                  return <p style={{ color: '#999', fontStyle: 'italic' }}>No enrolled students found in this course & semester.</p>;
                }

                return classStudents.map(student => {
                  const sId = student._id || student.enrollmentNumber;
                  const currentDbStatus = selectedAttendanceRecord.attendance[sId] || 'Absent';
                  const currentChange = attendanceChanges[sId];
                  const activeStatus = currentChange ? currentChange.status : currentDbStatus;
                  const isChanged = activeStatus !== currentDbStatus;

                  return (
                    <div key={student._id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '10px', background: isChanged ? '#fffdea' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{student.fullName}</strong> <span style={{ color: '#888', fontSize: '12px' }}>({student.rollNumber || student.enrollmentNumber})</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => {
                              const nextStatus = activeStatus === 'Present' ? 'Absent' : 'Present';
                              if (nextStatus === currentDbStatus) {
                                // Revert change
                                const copy = { ...attendanceChanges };
                                delete copy[sId];
                                setAttendanceChanges(copy);
                              } else {
                                setAttendanceChanges(prev => ({
                                  ...prev,
                                  [sId]: {
                                    ...prev[sId],
                                    status: nextStatus
                                  }
                                }));
                              }
                            }}
                            style={{
                              padding: '6px 15px',
                              borderRadius: '20px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              background: activeStatus === 'Present' ? '#2ecc71' : '#e74c3c',
                              color: 'white'
                            }}
                          >
                            {activeStatus} {isChanged ? '✏️' : ''}
                          </button>
                        </div>
                      </div>

                      {isChanged && (
                        <div style={{ marginTop: '15px', borderTop: '1px dashed #ddd', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Proof Category:</label>
                            <select
                              value={currentChange.proofType || 'Other'}
                              onChange={(e) => {
                                setAttendanceChanges(prev => ({
                                  ...prev,
                                  [sId]: {
                                    ...prev[sId],
                                    proofType: e.target.value
                                  }
                                }));
                              }}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                            >
                              <option value="Medical Leave">Medical Leave</option>
                              <option value="Duty Leave">Duty Leave</option>
                              <option value="Special Permission">Special Permission</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px', alignItems: 'flex-start' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginTop: '6px' }}>Reason/Proof Detail:</label>
                            <textarea
                              placeholder="Provide description of proof/reason..."
                              value={currentChange.reason || ''}
                              onChange={(e) => {
                                setAttendanceChanges(prev => ({
                                  ...prev,
                                  [sId]: {
                                    ...prev[sId],
                                    reason: e.target.value
                                  }
                                }));
                              }}
                              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', height: '60px', resize: 'vertical' }}
                              required
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Upload Proof File:</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProofFileChange(sId, e.target.files[0])}
                              style={{ fontSize: '12px' }}
                            />
                          </div>
                          {currentChange.proofFile && (
                            <div style={{ marginLeft: '150px' }}>
                              <img src={currentChange.proofFile} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', border: '1px solid #ccc', borderRadius: '4px' }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowEditAttendanceModal(false);
                  setAttendanceChanges({});
                }}
                style={{ padding: '10px 20px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttendanceEdits}
                style={{ padding: '10px 25px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : isClerkLoggedIn ? 'Submit Edit Requests 🚀' : 'Save Changes Directly ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPwdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>Change Password</h3>

            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>New Password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Detail Modal */}
      {showTeacherModal && selectedTeacher && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowTeacherModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>&times;</button>

            <div className="admin-modal-header">
              <img src={selectedTeacher.profilePhoto || '/IMAGES/logo.webp'} style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', border: '3px solid var(--primary)' }} />
              <div style={{ flex: 1 }}>
                {isEditingDetails ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      defaultValue={selectedTeacher.fullName}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 0) val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                        setEditFormData({ ...editFormData, fullName: val });
                      }}
                      style={{ fontSize: '24px', fontWeight: 'bold', padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input type="text" defaultValue={selectedTeacher.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} placeholder="Email" style={editInputStyle} />
                      <input type="text" defaultValue={selectedTeacher.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} placeholder="Phone" style={editInputStyle} />
                      <input type="text" defaultValue={selectedTeacher.qualification} onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })} placeholder="Qualification" style={editInputStyle} />
                      <select defaultValue={selectedTeacher.department} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} style={editInputStyle}>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '28px' }}>{selectedTeacher.fullName}</h2>
                    <p style={{ margin: '0 0 15px 0', color: '#666', fontWeight: 'bold', fontSize: '18px' }}>{selectedTeacher.qualification} • {selectedTeacher.department}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                      <div style={{ color: '#555' }}><strong>Email:</strong> {selectedTeacher.email}</div>
                      <div style={{ color: '#555' }}><strong>Phone:</strong> {selectedTeacher.phone}</div>
                      <div style={{ color: '#555' }}><strong>DOB:</strong> {selectedTeacher.dob || 'N/A'}</div>
                      <div style={{ color: '#555' }}><strong>Gender:</strong> {selectedTeacher.gender || 'N/A'}</div>
                      <div style={{ color: '#555' }}><strong>Experience:</strong> {selectedTeacher.experience} Years</div>
                      <div style={{ color: '#555' }}><strong>Primary Subject:</strong> {selectedTeacher.primarySubject}</div>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginTop: '10px' }}>
                  <div style={{ color: '#27ae60', background: '#e8f5e9', padding: '8px 12px', borderRadius: '8px' }}>
                    <strong>Portal Username:</strong> {selectedTeacher.username}
                  </div>
                  <div style={{ color: '#e67e22', background: '#fff3e0', padding: '8px 12px', borderRadius: '8px' }}>
                    <strong>Portal Password:</strong> <code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedTeacher.password}</code>
                  </div>
                </div>

                {selectedTeacher.documents && selectedTeacher.documents.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                      Educational Documents 📂
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {selectedTeacher.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.data}
                          download={doc.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#f1f3f5',
                            color: '#373a3c',
                            textDecoration: 'none',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            border: '1px solid #dee2e6',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#e9ecef';
                            e.currentTarget.style.borderColor = '#ced4da';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f1f3f5';
                            e.currentTarget.style.borderColor = '#dee2e6';
                          }}
                        >
                          📄 {doc.name.length > 25 ? doc.name.substring(0, 22) + '...' : doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              {isEditingDetails ? (
                <>
                  <button
                    onClick={() => handleUpdateDetails('teacher')}
                    style={{ background: '#27ae60', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Save Changes ✅
                  </button>
                  <button
                    onClick={() => { setIsEditingDetails(false); setEditFormData({}); }}
                    style={{ background: '#666', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingDetails(true)}
                    style={{ background: '#3498db', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Edit Details ✏️
                  </button>
                  <button
                    onClick={() => handleShare(selectedTeacher, 'Teacher')}
                    style={{ background: '#25D366', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Share 📲
                  </button>
                  <button
                    onClick={() => setShowTeacherModal(false)}
                    style={{ background: '#333', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowStudentModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>&times;</button>

            <div className="admin-modal-header">
              <img src={selectedStudent.profilePhoto || '/IMAGES/logo.webp'} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
              <div style={{ flex: 1 }}>
                {isEditingDetails ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      defaultValue={selectedStudent.fullName}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 0) val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                        setEditFormData({ ...editFormData, fullName: val });
                      }}
                      style={{ fontSize: '24px', fontWeight: 'bold', padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input type="text" defaultValue={selectedStudent.enrollmentNumber} onChange={(e) => setEditFormData({ ...editFormData, enrollmentNumber: e.target.value })} placeholder="Roll No" style={editInputStyle} />
                      <input type="text" defaultValue={selectedStudent.course} onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })} placeholder="Course" style={editInputStyle} />
                      <input type="text" defaultValue={selectedStudent.batchYear} onChange={(e) => setEditFormData({ ...editFormData, batchYear: e.target.value })} placeholder="Batch Year" style={editInputStyle} />
                      <input type="text" defaultValue={selectedStudent.semester} onChange={(e) => setEditFormData({ ...editFormData, semester: e.target.value })} placeholder="Semester" style={editInputStyle} />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '26px' }}>{selectedStudent.fullName}</h2>
                    <p style={{ margin: '0 0 10px 0', color: '#666', fontWeight: 'bold' }}>{selectedStudent.course} • Semester {selectedStudent.semester}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '14px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                      <div style={{ color: '#555' }}><strong>Enrollment / Roll No:</strong> {selectedStudent.enrollmentNumber}</div>
                      <div style={{ color: '#555' }}><strong>Email:</strong> {selectedStudent.email}</div>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginTop: '10px' }}>
                  <div style={{ color: '#27ae60', background: '#e8f5e9', padding: '8px 12px', borderRadius: '8px' }}>
                    <strong>Portal User ID:</strong> {selectedStudent.username}
                  </div>
                  <div style={{ color: '#e67e22', background: '#fff3e0', padding: '8px 12px', borderRadius: '8px' }}>
                    <strong>Portal Password:</strong> <code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedStudent.password}</code>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              {isEditingDetails ? (
                <>
                  <button
                    onClick={() => handleUpdateDetails('student')}
                    style={{ background: '#27ae60', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Save Changes ✅
                  </button>
                  <button
                    onClick={() => { setIsEditingDetails(false); setEditFormData({}); }}
                    style={{ background: '#666', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingDetails(true)}
                    style={{ background: '#3498db', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Edit Details ✏️
                  </button>
                  <button
                    onClick={() => handleShare(selectedStudent, 'Student')}
                    style={{ background: '#25D366', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Share 📲
                  </button>
                  <button
                    onClick={() => setShowStudentModal(false)}
                    style={{ background: '#333', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Department Detail Modal */}
      {showDeptModal && selectedDept && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowDeptModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>&times;</button>

            <div className="admin-modal-header">
              <img src={selectedDept.profilePhoto || '/IMAGES/logo.webp'} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '26px' }}>{selectedDept.department}</h2>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontWeight: 'bold' }}>{selectedDept.role === 'clerk' ? 'Clerk' : 'Head'}: {selectedDept.headName}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '14px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                  <div style={{ color: '#555' }}><strong>{selectedDept.role === 'clerk' ? 'Clerk' : 'HOD'} Email:</strong> {selectedDept.email}</div>
                  <div style={{ color: '#555' }}><strong>{selectedDept.role === 'clerk' ? 'Clerk' : 'HOD'} Phone:</strong> {selectedDept.phone}</div>
                  <div style={{ color: '#27ae60', background: '#e8f5e9', padding: '5px 10px', borderRadius: '5px' }}>
                    <strong>Portal Username:</strong> {selectedDept.username}
                  </div>
                  <div style={{ color: '#e67e22', background: '#fff3e0', padding: '5px 10px', borderRadius: '5px' }}>
                    <strong>Portal Password:</strong> <code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedDept.password}</code>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '15px' }}>
              <button
                onClick={() => handleShare(selectedDept, selectedDept.role === 'clerk' ? 'Clerk' : 'Department HOD')}
                style={{ background: '#25D366', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Share Details 📲
              </button>
              <button
                onClick={() => setShowDeptModal(false)}
                style={{ background: '#333', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Detail Modal */}
      {showAdminModal && selectedAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowAdminModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>&times;</button>

            <div className="admin-modal-header">
              <img src={selectedAdmin.profilePhoto || '/IMAGES/logo.webp'} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '24px' }}>{selectedAdmin.fullName || 'Admin User'}</h2>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontWeight: 'bold' }}>Master Administrative Account</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '14px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                  <div style={{ color: '#555' }}><strong>Admin Email:</strong> {selectedAdmin.email}</div>
                  <div style={{ color: '#555' }}><strong>Admin Contact:</strong> {selectedAdmin.contact}</div>
                  <div style={{ color: '#27ae60', background: '#e8f5e9', padding: '5px 10px', borderRadius: '5px' }}>
                    <strong>System Username:</strong> {selectedAdmin.username}
                  </div>
                  <div style={{ color: '#e67e22', background: '#fff3e0', padding: '5px 10px', borderRadius: '5px' }}>
                    <strong>System Password:</strong> <code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedAdmin.password}</code>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '15px' }}>
              <button
                onClick={() => handleShare(selectedAdmin, 'Master Admin')}
                style={{ background: '#25D366', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Share Details 📲
              </button>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{ background: '#333', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close Admin View
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .profile-thumb {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
          cursor: pointer;
        }
        .profile-thumb:hover {
          transform: scale(2.5);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
          z-index: 100;
          position: relative;
        }
      `}</style>
    </div>
  );
}

const thStyle = { background: '#f8f9fa', color: '#666', fontWeight: 600, padding: '15px 20px', borderBottom: '2px solid #eee', textTransform: 'uppercase', fontSize: '12px' };
const tdStyle = { padding: '15px 20px', fontSize: '14px' };
const editInputStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', fontSize: '14px', marginTop: '5px' };

export default Admin;
