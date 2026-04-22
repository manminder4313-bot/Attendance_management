import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [includeCredentials, setIncludeCredentials] = useState(false);
  
  // Attendance Stats specific filters
  const [statsCourseFilter, setStatsCourseFilter] = useState('');
  const [statsSemesterFilter, setStatsSemesterFilter] = useState('');

  const getStudentAttendanceStats = (studentId) => {
    const studentRecords = attendanceRecords.filter(r => r.attendance?.[studentId]);
    const presentCount = studentRecords.filter(r => r.attendance?.[studentId] === 'Present').length;
    const absentCount = studentRecords.filter(r => r.attendance?.[studentId] === 'Absent').length;
    const totalCount = studentRecords.length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    return { presentCount, absentCount, totalCount, percentage, records: studentRecords };
  };

  const navigate = useNavigate();

  const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
  const isDepartmentLoggedIn = sessionStorage.getItem('isDepartmentLoggedIn') === 'true';
  const roleDepartmentData = isDepartmentLoggedIn ? JSON.parse(sessionStorage.getItem('loggedInDepartment')) : null;
  const adminCreds = isAdminLoggedIn ? JSON.parse(sessionStorage.getItem('loggedInAdmin')) : null;

  useEffect(() => {
    if (!isAdminLoggedIn && !isDepartmentLoggedIn) {
      navigate('/login');
    }
    // Handle tab visibility for Master Admin vs Department
    if (isAdminLoggedIn && activeTab === 'attendance_stats') {
      setActiveTab('teachers');
    }
    loadSubmissions();
  }, [navigate, isAdminLoggedIn, isDepartmentLoggedIn, activeTab]);

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

  const handleDownloadPDF = () => {
    setShowPdfModal(true);
  };

  const generatePDF = async (withCreds) => {
    const doc = new jsPDF();
    
    // Draw Header using Canvas (to support Punjabi fonts)
    const headerImg = await new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1600, 360);

      const logoImg = new Image();
      logoImg.src = '/IMAGES/logo.webp';
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        ctx.drawImage(logoImg, 40, 40, 280, 280);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8a2c20';
        ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.fillText('ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ', 360, 100);
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Maharaja Ranjit Singh Punjab Technical University, BATHINDA', 360, 160);
        ctx.fillStyle = '#555';
        ctx.font = 'italic 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText('(A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015', 360, 200);
        ctx.fillText('and Approved Under Section 2(f) & 12 (B) of UGC)', 360, 230);
        ctx.fillStyle = '#8a2c20';
        ctx.fillRect(360, 260, 1200, 4);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        const title = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
        ctx.fillText(`${title.toUpperCase()} REPORT`, 360, 310);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) {
      doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);
    } else {
      doc.setFillColor(138, 44, 32);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('MRSPTU ATTENDANCE MANAGEMENT', 105, 20, { align: 'center' });
    }

    let headers = [];
    let data = [];

    if (activeTab === 'teachers') {
      headers = [['Name', 'Email', 'Subject', 'Experience', 'Department']];
      if (withCreds) headers[0].push('Username', 'Password');
      data = filteredTeachers.map(t => {
        const row = [t.fullName || t.name, t.email, t.primarySubject || t.subject, t.experience, t.department];
        if (withCreds) row.push(t.username, t.password);
        return row;
      });
    } else if (activeTab === 'students') {
      headers = [['Name', 'Roll No', 'Email', 'Course', 'Semester']];
      if (withCreds) headers[0].push('Username', 'Password');
      data = filteredStudents.map(s => {
        const row = [s.fullName || s.name, s.enrollmentNumber || s.rollNo, s.email, s.course, s.semester];
        if (withCreds) row.push(s.username, s.password);
        return row;
      });
    } else if (activeTab === 'departments') {
      headers = [['Department', 'Head Name', 'Email', 'Phone']];
      if (withCreds) headers[0].push('Username', 'Password');
      data = departmentSubmissions.map(d => {
        const row = [d.department, d.headName, d.email, d.phone];
        if (withCreds) row.push(d.username, d.password);
        return row;
      });
    } else if (activeTab === 'admins') {
      headers = [['Name', 'Email', 'Phone', 'Role']];
      if (withCreds) headers[0].push('Username', 'Password');
      data = adminSubmissions.map(a => {
        const row = [a.fullName || 'Admin', a.email, a.contact, a.id === 'admin' ? 'Master Admin' : 'Admin'];
        if (withCreds) row.push(a.id, a.password);
        return row;
      });
    }

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [138, 44, 32], textColor: 255 },
      styles: { fontSize: 8 }
    });

    doc.save(`${activeTab}_list_${Date.now()}.pdf`);
    setShowPdfModal(false);
  };

  const generateIndividualStudentPDF = async (student) => {
    const doc = new jsPDF();
    const stats = getStudentAttendanceStats(student.id);
    
    // Header
    const headerImg = await new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1600, 360);
      const logoImg = new Image();
      logoImg.src = '/IMAGES/logo.webp';
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        ctx.drawImage(logoImg, 40, 40, 280, 280);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8a2c20';
        ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.fillText('ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ', 360, 100);
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Maharaja Ranjit Singh Punjab Technical University, BATHINDA', 360, 160);
        ctx.fillStyle = '#555';
        ctx.font = 'italic 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText('(A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015', 360, 200);
        ctx.fillText('and Approved Under Section 2(f) & 12 (B) of UGC)', 360, 230);
        ctx.fillStyle = '#8a2c20';
        ctx.fillRect(360, 260, 1200, 4);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`DETAILED ATTENDANCE REPORT`, 360, 310);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 55);
    
    // Info Box
    doc.setFillColor(248, 249, 250);
    doc.rect(15, 60, 180, 25, 'F');
    doc.setFontSize(12);
    doc.setFont("Helvetica", "bold");
    doc.text(student.fullName || student.name, 20, 70);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Roll No: ${student.enrollmentNumber || student.rollNo} | Course: ${student.course} | Sem: ${student.semester}`, 20, 78);
    
    // Summary
    doc.text(`Total Sessions: ${stats.totalCount}`, 20, 95);
    doc.setTextColor(39, 174, 96);
    doc.text(`Present: ${stats.presentCount}`, 70, 95);
    doc.setTextColor(231, 76, 60);
    doc.text(`Absent: ${stats.absentCount}`, 120, 95);
    doc.setTextColor(138, 44, 32);
    doc.text(`Overall Attendance: ${stats.percentage}%`, 160, 95);

    const historyData = stats.records.sort((a,b) => b.id - a.id).map(r => [
      r.dateDisplay,
      r.subject,
      r.teacherName,
      r.attendance[student.id],
      r.session || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Date', 'Subject', 'Teacher', 'Status', 'Session']],
      body: historyData,
      startY: 105,
      theme: 'striped',
      headStyles: { fillColor: [138, 44, 32] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Present') data.cell.styles.textColor = [39, 174, 96];
          if (data.cell.raw === 'Absent') data.cell.styles.textColor = [231, 76, 60];
        }
      }
    });

    doc.save(`attendance_report_${(student.fullName || student.name).replace(/\s+/g, '_')}.pdf`);
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
          {isDepartmentLoggedIn && (
            <button 
              onClick={() => { setActiveTab('attendance_stats'); setSelectedIds([]); setIsDeleteMode(false); }} 
              style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'attendance_stats' ? '3px solid var(--primary)' : 'none', color: activeTab === 'attendance_stats' ? 'var(--primary)' : '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Attendance Stats
            </button>
          )}
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
                  <th style={thStyle}>Attendance %</th>
                  <th style={thStyle}>Detailed Report</th>
                  <th style={thStyle}>Reg. Photo</th>
                  <th style={thStyle}>Enrolled Face</th>
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
                    <td style={tdStyle}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <div style={{ width: '60px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${getStudentAttendanceStats(s.id).percentage}%`, height: '100%', background: getStudentAttendanceStats(s.id).percentage >= 75 ? '#27ae60' : '#e74c3c' }}></div>
                         </div>
                         <span style={{ fontWeight: 'bold', color: getStudentAttendanceStats(s.id).percentage >= 75 ? '#27ae60' : '#e74c3c' }}>
                           {getStudentAttendanceStats(s.id).percentage}%
                         </span>
                       </div>
                     </td>
                     <td style={tdStyle}>
                        <button 
                          onClick={() => generateIndividualStudentPDF(s)}
                          style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          📥 Download
                        </button>
                     </td>
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
                    <td style={tdStyle}>
                      {s.enrolledFace ? (
                        <img src={s.enrolledFace} alt="Enrolled" className="profile-thumb" style={{ border: '2px solid #27ae60' }} />
                      ) : (
                        <div className="profile-thumb" style={{ background: '#fff3f3', border: '1px dashed #e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#e74c3c' }}>Missing</div>
                      )}
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
                    {(isDepartmentLoggedIn ? getCoursesForDept(roleDepartmentData?.department) : [
                      'B.Tech Computer Science', 'B.Tech Mechanical', 'B.Tech Civil', 'B.Tech Electrical', 'BCA', 'MCA'
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
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
                      const name = `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Semester`;
                      return <option key={name} value={name}>{name}</option>
                    })}
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
                      
                      // Filter records for this semester, department, and COURSE
                      const semRecords = attendanceRecords.filter(r => 
                        r.semester === semesterName && 
                        r.course === statsCourseFilter &&
                        (!isDepartmentLoggedIn || r.department === roleDepartmentData.department)
                      );

                      // Filter students for this semester, department, and COURSE
                      const semStudents = studentSubmissions.filter(s => 
                        s.semester === semesterName && 
                        s.course === statsCourseFilter &&
                        (!isDepartmentLoggedIn || getCoursesForDept(roleDepartmentData.department).includes(s.course))
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
                              <p style={{ margin: 0, fontSize: '13px', color: '#888', fontWeight: '600' }}>{statsCourseFilter}</p>
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
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ marginTop: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#333' }}>Attendance History Library</h3>
                      <span style={{ fontSize: '13px', color: '#888', background: '#f5f5f5', padding: '5px 12px', borderRadius: '15px' }}>
                        Showing records for <strong>{statsCourseFilter}</strong>
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {attendanceRecords
                        .filter(r => 
                          r.semester === statsSemesterFilter && 
                          r.course === statsCourseFilter &&
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
                      {attendanceRecords.filter(r => r.semester === statsSemesterFilter && r.course === statsCourseFilter).length === 0 && (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontStyle: 'italic' }}>No attendance records found for this selection.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null
        )}
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
                onClick={() => generatePDF(true)} 
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Yes, Include Credentials
              </button>
              <button 
                onClick={() => generatePDF(false)} 
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
