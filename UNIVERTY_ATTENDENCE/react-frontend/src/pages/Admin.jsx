import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [submissions, setSubmissions] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [departmentSubmissions, setDepartmentSubmissions] = useState([]);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('teachers');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Profile update states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const fileInputRef = useRef(null);
  const memberPhotoInputRef = useRef(null);
  const [editingMember, setEditingMember] = useState(null); // { id, type }

  const navigate = useNavigate();

  const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
  const isDepartmentLoggedIn = sessionStorage.getItem('isDepartmentLoggedIn') === 'true';
  const roleDepartmentData = isDepartmentLoggedIn ? JSON.parse(sessionStorage.getItem('loggedInDepartment')) : null;
  const adminCreds = isAdminLoggedIn ? JSON.parse(sessionStorage.getItem('loggedInAdmin')) : null;

  useEffect(() => {
    if (!isAdminLoggedIn && !isDepartmentLoggedIn) {
      navigate('/login');
    }
    loadSubmissions();
  }, [navigate, isAdminLoggedIn, isDepartmentLoggedIn]);

  const loadSubmissions = () => {
    const data = JSON.parse(localStorage.getItem('teacherSubmissions')) || [];
    setSubmissions(data);
    const sData = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
    setStudentSubmissions(sData);
    const dData = JSON.parse(localStorage.getItem('departmentSubmissions')) || [];
    setDepartmentSubmissions(dData);

    let aData = JSON.parse(localStorage.getItem('adminCredentials'));
    if (!aData) aData = [];
    else if (!Array.isArray(aData)) aData = [aData];
    
    // Auto-repair default admin data if missing fields
    const repairedAdmins = aData.map(admin => {
      if (admin.id === 'admin') {
        return {
          ...admin,
          fullName: admin.fullName || 'System Administrator',
          submissionDate: admin.submissionDate || 'System Initialized'
        };
      }
      return admin;
    });
    
    setAdminSubmissions(repairedAdmins);
    
    const aRecs = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    setAttendanceRecords(aRecs);
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

  const handleMemberPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && editingMember) {
      compressImage(file, (compressedData) => {
        const { id, type } = editingMember;
        if (type === 'teacher') {
          const updatedList = submissions.map(item => item.id === id ? { ...item, profilePhoto: compressedData } : item);
          localStorage.setItem('teacherSubmissions', JSON.stringify(updatedList));
          setSubmissions(updatedList);
        } else if (type === 'student') {
          const updatedList = studentSubmissions.map(item => item.id === id ? { ...item, profilePhoto: compressedData } : item);
          localStorage.setItem('studentSubmissions', JSON.stringify(updatedList));
          setStudentSubmissions(updatedList);
        } else if (type === 'department') {
          const updatedList = departmentSubmissions.map(item => item.id === id ? { ...item, profilePhoto: compressedData } : item);
          localStorage.setItem('departmentSubmissions', JSON.stringify(updatedList));
          setDepartmentSubmissions(updatedList);
        }
        setEditingMember(null);
      });
    }
  };

  const triggerMemberPhotoEdit = (id, type) => {
    setEditingMember({ id, type });
    setTimeout(() => memberPhotoInputRef.current.click(), 0);
  };

  const handlePasswordChange = (e) => {
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
      saveProfileUpdate(updated, 'department');
    } else if (isAdminLoggedIn) {
      const updated = { ...adminCreds, password: newPwd };
      saveProfileUpdate(updated, 'admin');
    }
    
    setShowPwdModal(false);
    setNewPwd('');
    setConfirmPwd('');
    alert("Password updated successfully!");
  };

  const saveProfileUpdate = (updatedUser, role) => {
    if (role === 'department') {
      sessionStorage.setItem('loggedInDepartment', JSON.stringify(updatedUser));
      const allDepts = JSON.parse(localStorage.getItem('departmentSubmissions')) || [];
      const updatedList = allDepts.map(d => d.id === updatedUser.id ? updatedUser : d);
      localStorage.setItem('departmentSubmissions', JSON.stringify(updatedList));
      setDepartmentSubmissions(updatedList);
    } else {
      sessionStorage.setItem('loggedInAdmin', JSON.stringify(updatedUser));
      let aData = JSON.parse(localStorage.getItem('adminCredentials'));
      if (!aData) aData = [];
      else if (!Array.isArray(aData)) aData = [aData];
      
      const updatedList = aData.map(a => (a.uuid === updatedUser.uuid || a.id === updatedUser.id) ? updatedUser : a);
      localStorage.setItem('adminCredentials', JSON.stringify(updatedList));
      setAdminSubmissions(updatedList);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('isDepartmentLoggedIn');
    sessionStorage.removeItem('loggedInDepartment');
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

  const handleClearData = () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setIsDeleteMode(false);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete the selected submission data? This cannot be undone.')) {
      if (activeTab === 'teachers') {
        const remaining = submissions.filter(t => !selectedIds.includes(t.id));
        localStorage.setItem('teacherSubmissions', JSON.stringify(remaining));
        setSubmissions(remaining);
      } else if (activeTab === 'students') {
        const remaining = studentSubmissions.filter(s => !selectedIds.includes(s.id));
        localStorage.setItem('studentSubmissions', JSON.stringify(remaining));
        setStudentSubmissions(remaining);
      } else if (activeTab === 'departments') {
        const remaining = departmentSubmissions.filter(d => !selectedIds.includes(d.id));
        localStorage.setItem('departmentSubmissions', JSON.stringify(remaining));
        setDepartmentSubmissions(remaining);
      } else if (activeTab === 'admins') {
        const remaining = adminSubmissions.filter(a => !selectedIds.includes(a.uuid || a.id));
        if (remaining.length === 0 && adminSubmissions.length > 0) {
           alert("Cannot delete all master admins. The system requires at least one admin account to remain accessible.");
           setIsDeleteMode(false);
           return;
        }
        localStorage.setItem('adminCredentials', JSON.stringify(remaining));
        setAdminSubmissions(remaining);
      }
      setSelectedIds([]);
      setIsDeleteMode(false);
    }
  };

  const getCoursesForDept = (dept) => {
    if (!dept) return [];
    switch (dept) {
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
  };

  const baseTeachers = isDepartmentLoggedIn && roleDepartmentData ? submissions.filter(t => t.department === roleDepartmentData.department) : submissions;
  const baseStudents = isDepartmentLoggedIn && roleDepartmentData ? studentSubmissions.filter(s => getCoursesForDept(roleDepartmentData.department).includes(s.course)) : studentSubmissions;

  const filteredTeachers = baseTeachers.filter(t => departmentFilter === 'All' || t.department === departmentFilter);
  const filteredStudents = baseStudents.filter(s => courseFilter === 'All' || s.course === courseFilter);

  const handleSelectAll = (e) => {
    const currentData = activeTab === 'teachers' ? filteredTeachers : activeTab === 'students' ? filteredStudents : activeTab === 'departments' ? departmentSubmissions : adminSubmissions;
    if (e.target.checked) {
      if (activeTab === 'admins') {
        setSelectedIds(currentData.filter(a => a.id !== 'admin').map(t => t.uuid || t.id));
      } else {
        setSelectedIds(currentData.map(t => t.id));
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
    alert(`Bio for ${teacher.fullName}:\n\n${teacher.bio || "No bio provided."}`);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '100%', margin: '0 auto' }}>
      <input type="file" ref={memberPhotoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleMemberPhotoChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            {isDepartmentLoggedIn && roleDepartmentData?.profilePhoto ? (
              <img src={roleDepartmentData.profilePhoto} alt="HOD" className="profile-thumb" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => fileInputRef.current.click()} />
            ) : isAdminLoggedIn && adminCreds?.profilePhoto ? (
              <img src={adminCreds.profilePhoto} alt="Admin" className="profile-thumb" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={() => fileInputRef.current.click()} />
            ) : (
                <div className="profile-thumb" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '20px', fontWeight: 'bold', border: '2px solid var(--primary)' }} onClick={() => fileInputRef.current.click()}>
                    {(isDepartmentLoggedIn ? roleDepartmentData?.headName : adminCreds?.fullName)?.charAt(0).toUpperCase() || 'A'}
                </div>
            )}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoChange} />
          </div>
          <div>
            <h2 style={{ color: 'var(--primary)', fontSize: '28px', margin: 0 }}>
              {isDepartmentLoggedIn ? `${roleDepartmentData?.department} Dashboard` : 'Admin Dashboard'}
            </h2>
            {isDepartmentLoggedIn ? (
              <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold' }}>HOD: {roleDepartmentData?.headName}</p>
            ) : isAdminLoggedIn && adminCreds?.fullName ? (
              <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                Admin: {adminCreds?.fullName}
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <button onClick={() => setShowPwdModal(true)} style={{ background: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            Change Password
          </button>
          <button onClick={handleAddTeacher} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            Add Teacher
          </button>
          <button onClick={handleAddStudent} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            Add Student
          </button>
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
          <button onClick={handleClearData} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            {isDeleteMode ? (selectedIds.length > 0 ? `Delete (${selectedIds.length})` : 'Cancel') : 'Clear Data'}
          </button>
          <button onClick={handleLogout} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', marginBottom: '20px', alignItems: 'center', paddingBottom: '10px' }}>
        <div style={{ display: 'flex' }}>
          <button 
            onClick={() => { setActiveTab('teachers'); setSelectedIds([]); setIsDeleteMode(false); }} 
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'teachers' ? '3px solid var(--primary)' : 'none', color: activeTab === 'teachers' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Teacher Submissions
          </button>
          <button 
            onClick={() => { setActiveTab('students'); setSelectedIds([]); setIsDeleteMode(false); }} 
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'students' ? '3px solid var(--primary)' : 'none', color: activeTab === 'students' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Student Submissions
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
          <button 
            onClick={() => { setActiveTab('attendance_stats'); setSelectedIds([]); setIsDeleteMode(false); }} 
            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'attendance_stats' ? '3px solid var(--primary)' : 'none', color: activeTab === 'attendance_stats' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
            Attendance Stats
          </button>
        </div>
        
        <div>
          {activeTab === 'teachers' ? (
            isDepartmentLoggedIn ? (
              <select value={roleDepartmentData?.department} disabled style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', background: '#f5f5f5', color: '#666' }}>
                <option>{roleDepartmentData?.department}</option>
              </select>
            ) : (
              <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setSelectedIds([]); }} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                <option value="All">All Departments</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
              </select>
            )
          ) : activeTab === 'students' ? (
            <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setSelectedIds([]); }} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
              <option value="All">All Courses</option>
              {(isDepartmentLoggedIn ? getCoursesForDept(roleDepartmentData?.department) : [
                'B.Tech Computer Science', 'B.Tech Mechanical', 'B.Tech Civil', 'B.Tech Electrical', 'BCA', 'MCA'
              ]).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : null}
        </div>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        {(activeTab === 'teachers' ? filteredTeachers : activeTab === 'students' ? filteredStudents : activeTab === 'departments' ? departmentSubmissions : adminSubmissions).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-light)', fontStyle: 'italic' }}>
            No {activeTab} submissions found.
          </div>
        ) : (
          activeTab === 'teachers' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  {isDeleteMode && <th style={{...thStyle, width: '40px'}}><input type="checkbox" onChange={handleSelectAll} checked={filteredTeachers.length > 0 && selectedIds.length === filteredTeachers.length} /></th>}
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Exp. (Yrs)</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Password</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>Photo</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(t.id) ? '#f0f8ff' : 'transparent' }}>
                    {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => handleSelect(t.id)} /></td>}
                    <td style={tdStyle}>{t.submissionDate}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{t.fullName}</td>
                    <td style={tdStyle}>{t.email}</td>
                    <td style={tdStyle}>{t.phone}</td>
                    <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{t.primarySubject}</span></td>
                    <td style={tdStyle}>{t.experience || '0'}</td>
                    <td style={{ ...tdStyle, color: '#27ae60', fontWeight: 600 }}>{t.username || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{t.password || 'N/A'}</td>
                    <td style={tdStyle}>{t.department || 'N/A'}</td>
                    <td style={tdStyle}>    
                       <button onClick={() => viewDetails(t)} style={{ background: 'none', border: 'none', color: '#1e6bd6', cursor: 'pointer', textDecoration: 'underline' }}>View Bio</button>
                    </td>
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
                          ✎
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'students' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  {isDeleteMode && <th style={{...thStyle, width: '40px'}}><input type="checkbox" onChange={handleSelectAll} checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} /></th>}
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Semester</th>
                  <th style={thStyle}>Roll No</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Password</th>
                  <th style={thStyle}>Photo</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(s.id) ? '#f0f8ff' : 'transparent' }}>
                    {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelect(s.id)} /></td>}
                    <td style={tdStyle}>{s.submissionDate}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s.fullName}</td>
                    <td style={tdStyle}>{s.email}</td>
                    <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{s.course}</span></td>
                    <td style={tdStyle}>{s.semester}</td>
                    <td style={tdStyle}>{s.enrollmentNumber}</td>
                    <td style={{ ...tdStyle, color: '#27ae60', fontWeight: 600 }}>{s.username || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{s.password || 'N/A'}</td>
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
                          ✎
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'departments' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  {isDeleteMode && <th style={{...thStyle, width: '40px'}}><input type="checkbox" onChange={handleSelectAll} checked={departmentSubmissions.length > 0 && selectedIds.length === departmentSubmissions.length} /></th>}
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Head Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Password</th>
                  <th style={thStyle}>Photo</th>
                </tr>
              </thead>
              <tbody>
                {departmentSubmissions.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(d.id) ? '#f0f8ff' : 'transparent' }}>
                    {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => handleSelect(d.id)} /></td>}
                    <td style={tdStyle}>{d.submissionDate}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{d.headName}</td>
                    <td style={tdStyle}>{d.email}</td>
                    <td style={tdStyle}>{d.phone}</td>
                    <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{d.department}</span></td>
                    <td style={{ ...tdStyle, color: '#27ae60', fontWeight: 600 }}>{d.username || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{d.password || 'N/A'}</td>
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
                          ✎
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'admins' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  {isDeleteMode && <th style={{...thStyle, width: '40px'}}><input type="checkbox" onChange={handleSelectAll} checked={adminSubmissions.length > 0 && selectedIds.length === adminSubmissions.length} /></th>}
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Password</th>
                  <th style={thStyle}>Photo</th>
                </tr>
              </thead>
              <tbody>
                {adminSubmissions.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #eee', background: selectedIds.includes(a.uuid || a.id) ? '#f0f8ff' : 'transparent' }}>
                    {isDeleteMode && <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(a.uuid || a.id)} onChange={() => handleSelect(a.uuid || a.id)} disabled={a.id === 'admin'} /></td>}
                    <td style={tdStyle}>{a.submissionDate || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{a.fullName || 'Admin User'}</td>
                    <td style={tdStyle}>{a.email}</td>
                    <td style={tdStyle}>{a.contact}</td>
                    <td style={{ ...tdStyle, color: '#27ae60', fontWeight: 600 }}>{a.id}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{a.password}</td>
                    <td style={tdStyle}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {a.profilePhoto ? (
                          <img src={a.profilePhoto} alt="Profile" className="profile-thumb" />
                        ) : (
                          <div className="profile-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>{a.fullName ? a.fullName.charAt(0).toUpperCase() : 'A'}</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'attendance_stats' ? (
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(semNum => {
                  const semesterName = `${semNum}${semNum === 1 ? 'st' : semNum === 2 ? 'nd' : semNum === 3 ? 'rd' : 'th'} Semester`;
                  
                  // Filter records for this semester and department
                  const semRecords = attendanceRecords.filter(r => 
                    r.semester === semesterName && 
                    (!isDepartmentLoggedIn || r.department === roleDepartmentData.department)
                  );

                  // Filter students for this semester and department
                  const semStudents = studentSubmissions.filter(s => 
                    s.semester === semesterName && 
                    (!isDepartmentLoggedIn || getCoursesForDept(roleDepartmentData.department).includes(s.course))
                  );

                  if (semStudents.length === 0 && semRecords.length === 0) return null;

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
                    <div key={semesterName} style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '5px solid var(--primary)' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: 'var(--primary)', fontSize: '18px' }}>{semesterName}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ color: '#666' }}>Students:</span>
                        <span style={{ fontWeight: 'bold' }}>{semStudents.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ color: '#666' }}>Present (Total):</span>
                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{totalPresent}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: '#666' }}>Absent (Total):</span>
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{totalAbsent}</span>
                      </div>
                      <div style={{ height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ width: `${avgAttendance}%`, height: '100%', background: 'linear-gradient(90deg, #2ecc71, #27ae60)' }}></div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', fontWeight: 'bold' }}>
                        Avg. Attendance: {avgAttendance}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Student Breakdown for selected semester can be added here if needed */}
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#333' }}>Recent Attendance Activity</h3>
                <div style={{ marginTop: '20px' }}>
                  {attendanceRecords
                    .filter(r => !isDepartmentLoggedIn || r.department === roleDepartmentData.department)
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 10)
                    .map(record => {
                      const presentCount = Object.values(record.attendance).filter(v => v === 'Present').length;
                      const totalCount = Object.keys(record.attendance).length;
                      return (
                        <div key={record.id} style={{ padding: '15px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#444' }}>{record.subject} - {record.semester}</div>
                            <div style={{ fontSize: '12px', color: '#999' }}>{record.dateDisplay} | Prof. {record.teacherName}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32', fontSize: '13px', fontWeight: 'bold' }}>
                              {presentCount} / {totalCount} Present
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : null
        )}
      </div>

      {showPwdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>New Password</label>
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Confirm Password</label>
                <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowPwdModal(false)} style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Update Password</button>
              </div>
            </form>
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

export default Admin;
