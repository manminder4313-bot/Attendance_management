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

function Admin() {
  const [submissions, setSubmissions] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [departmentSubmissions, setDepartmentSubmissions] = useState([]);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
      const [teachers, students, depts, admins, recs] = await Promise.all([
        api.teachers.getAll(),
        api.students.getAll(),
        api.departments.getAll(),
        api.admins.getAll(),
        api.attendance.getAll()
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

      console.log(`📊 Data Loaded: ${teachers.length} Teachers, ${students.length} Students, ${depts.length} Departments`);
    } catch (err) {
      console.error('Error loading data from MongoDB:', err);
    } finally {
      setIsLoading(false);
    }
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
    (s.semester === semesterFilter || String(s.semester).replace(/\D/g, '') === semesterFilter.replace(/\D/g, ''))
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
                {(new Date().getMonth() >= 6 ? [1, 3, 5, 7, 9] : [2, 4, 6, 8, 10]).map(n => (
                  <option key={n} value={`${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Semester`}>
                    {n}{n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Semester
                  </option>
                ))}
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
          ((activeTab === 'teachers' ? filteredTeachers : activeTab === 'students' ? filteredStudents : activeTab === 'departments' ? hodSubmissions : activeTab === 'clerks' ? baseClerks : adminSubmissions).length === 0 && !isLoading) ? (
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
            ) : activeTab === 'attendance_stats' ? (
              <div style={{ padding: '30px' }}>
                {/* Filter Selection Panel */}
                <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '15px', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
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
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                        const name = `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Semester`;
                        return <option key={name} value={name}>{name}</option>
                      })}
                      {[1, 2, 3, 4,].map(n => {
                        const name = `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Year`;
                        return <option key={name} value={name}>{name}</option>
                      })}
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
                        .filter(r => r.course === statsCourseFilter && (r.semester === statsSemesterFilter || String(r.semester).replace(/\D/g, '') === statsSemesterFilter.replace(/\D/g, '')))
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
                          (r.semester === semesterName || String(r.semester).replace(/\D/g, '') === semesterName.replace(/\D/g, '')) &&
                          r.course === statsCourseFilter &&
                          (statsSubjectFilter === 'All' || r.subject === statsSubjectFilter) &&
                          (!isDepartmentLoggedIn || r.department === roleDepartmentData.department)
                        );

                        // Filter students for this semester, department, and COURSE
                        const semStudents = studentSubmissions.filter(s =>
                          (s.semester === semesterName || String(s.semester).replace(/\D/g, '') === semesterName.replace(/\D/g, '')) &&
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
                            (r.semester === statsSemesterFilter || String(r.semester).replace(/\D/g, '') === statsSemesterFilter.replace(/\D/g, '')) &&
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
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ padding: '6px 15px', borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32', fontSize: '13px', fontWeight: 'bold', display: 'inline-block' }}>
                                    {presentCount} / {totalCount} Students Present
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px' }}>ID: #{record.id}</div>
                                </div>
                              </div>
                            );
                          })}
                        {attendanceRecords.filter(r => (r.semester === statsSemesterFilter || String(r.semester).replace(/\D/g, '') === statsSemesterFilter.replace(/\D/g, '')) && r.course === statsCourseFilter && (statsSubjectFilter === 'All' || r.subject === statsSubjectFilter)).length === 0 && (
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
          <div style={{ background: 'white', padding: '40px', borderRadius: '15px', width: '450px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
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

      {showPwdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
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

            <div style={{ display: 'flex', gap: '25px', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
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

            <div style={{ display: 'flex', gap: '25px', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
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

            <div style={{ display: 'flex', gap: '25px', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
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

            <div style={{ display: 'flex', gap: '25px', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
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
