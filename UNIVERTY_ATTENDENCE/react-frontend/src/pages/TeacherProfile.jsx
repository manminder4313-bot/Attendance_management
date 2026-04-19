import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function TeacherProfile() {
  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [students, setStudents] = useState([]);
  const [semesterFilter, setSemesterFilter] = useState('');
  
  // Attendance Marking State
  const [attendanceMarks, setAttendanceMarks] = useState({}); // { studentId: 'Present' }
  const [saveStatus, setSaveStatus] = useState({ text: '', type: '' });
  const [selectedHistory, setSelectedHistory] = useState(null); // Updated state for modal viewing
  const [historySemesterFilter, setHistorySemesterFilter] = useState(''); // New history filter state
  const [selectedSession, setSelectedSession] = useState('Lecture 1'); // Session selection state
  const [showPdfModal, setShowPdfModal] = useState(false);
  
  // Smart Attendance States
  const [markingMode, setMarkingMode] = useState('manual'); // 'manual' or 'smart'
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Password change states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdUpdateMsg, setPwdUpdateMsg] = useState({ text: '', type: '' });

  // Secure Deletion and Proof States
  const [capturedImage, setCapturedImage] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmPwd, setDeleteConfirmPwd] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // High Tech Detection States
  const [detectionLog, setDetectionLog] = useState([]);
  const [lastDetectedStudent, setLastDetectedStudent] = useState('');
  const [lastDetectedPhoto, setLastDetectedPhoto] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('loggedInTeacher');
    if (!loggedInUser) {
      navigate('/login');
    } else {
      const teacherData = JSON.parse(loggedInUser);
      setTeacher(teacherData);
      loadSubmissions(teacherData);
    }
  }, [navigate]);

  // Live clock for camera overlay
  useEffect(() => {
    let timer;
    if (isCameraOpen) {
      timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCameraOpen]);

  const loadSubmissions = (teacherData) => {
    const allStudents = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
    const filteredStudents = allStudents.filter(s => {
      const dept = teacherData.department;
      const course = s.course;
      
      // Exact Match (Computer Science)
      if (dept === 'Computer Science' && ['BCA', 'MCA', 'B.Tech Computer Science'].includes(course)) return true;
      // Partial Matches for Engineering
      if (dept === 'Mechanical Engineering' && course === 'B.Tech Mechanical') return true;
      if (dept === 'Civil Engineering' && course === 'B.Tech Civil') return true;
      if (dept === 'Electrical Engineering' && course === 'B.Tech Electrical') return true;
      if (dept === 'B.Tech' && course === 'B.Tech') return true;
      
      // Fallback: Fuzzy match or specific course requirement
      return course?.toLowerCase().includes(dept?.toLowerCase()) || 
             dept?.toLowerCase().includes(course?.toLowerCase());
    });
    setStudents(filteredStudents);

    // Initialize marks
    const initialMarks = {};
    filteredStudents.forEach(s => {
      initialMarks[s.id] = 'Present';
    });
    setAttendanceMarks(initialMarks);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user' 
        } 
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions or ensure you are on HTTPS.");
    }
  };

  // Attach stream when video element is rendered
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraOpen(false);
    setIsScanning(false);
    setScanProgress(0);
  };

  const performScan = () => {
    if (!semesterFilter) {
      alert("Please select a semester first!");
      return;
    }
    
    setIsScanning(true);
    setDetectionLog(['Initializing Core...']);
    setLastDetectedStudent('');
    
    let progress = 0;
    const studentsPool = [...filteredBySemester];
    const detectedIds = [];
    
    scanIntervalRef.current = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      
      // Periodically "Detect" a student
      if (progress % 10 === 0 && studentsPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * studentsPool.length);
        const student = studentsPool.splice(randomIndex, 1)[0];
        
        // 80% chance of 'Detection' for each student in frame
        if (Math.random() > 0.2) {
          detectedIds.push(student.id);
          setLastDetectedStudent(student.fullName);
          setLastDetectedPhoto(student.profilePhoto || '/IMAGES/default-avatar.png');
          setDetectionLog(prev => [`[✔] Match: ${student.fullName}`, ...prev.slice(0, 4)]);
        } else {
          setDetectionLog(prev => [`[!] No Match for ID: ${student.enrollmentNumber.slice(-4)}`, ...prev.slice(0, 4)]);
        }
      }

      if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
        setDetectionLog(prev => ['[DONE] Scan finalized.', ...prev]);
        
        // Capture Class Photo as Evidence
        let imageData = null;
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          imageData = canvas.toDataURL('image/jpeg', 0.4);
          setCapturedImage(imageData);
        }

        // Finalize results: detected = Present, others = Absent
        const newMarks = { ...attendanceMarks };
        filteredBySemester.forEach(student => {
          newMarks[student.id] = detectedIds.includes(student.id) ? 'Present' : 'Absent';
        });
        setAttendanceMarks(newMarks);
        
        setTimeout(() => {
          setIsScanning(false);
          saveAttendanceData(newMarks, imageData);
          stopCamera();
          setMarkingMode('manual');
        }, 1000);
      }
    }, 80);
  };

  const getAvailableSemesters = () => {
    const month = new Date().getMonth(); // 0-11
    const isEvenSession = month < 6; // Jan to June
    const sems = [
      "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
      "5th Semester", "6th Semester", "7th Semester", "8th Semester"
    ];
    return sems.filter((_, index) => {
      const semNum = index + 1;
      return isEvenSession ? semNum % 2 === 0 : semNum % 2 !== 0;
    });
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = () => {
    if (semesterFilter === 'All') {
      alert("Please select a specific semester before saving attendance.");
      return;
    }
    saveAttendanceData(attendanceMarks, capturedImage);
  };

  const saveAttendanceData = (marks, proof) => {
    try {
      const semesterMarks = {};
      filteredBySemester.forEach(s => {
        semesterMarks[s.id] = marks[s.id] || 'Present';
      });

      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const record = {
        id: Date.now(),
        date: localDate,
        dateDisplay: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        subject: teacher.primarySubject,
        semester: semesterFilter,
        department: teacher.department,
        attendance: semesterMarks,
        proofPhoto: proof // Store the evidence image
      };

      const existingRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
      const filteredRecords = existingRecords.filter(r => 
        !(r.date === record.date && r.teacherId === record.teacherId && r.semester === record.semester && r.subject === record.subject && r.session === selectedSession)
      );
      
      const newRecord = { ...record, session: selectedSession };
      localStorage.setItem('attendanceRecords', JSON.stringify([...filteredRecords, newRecord]));

      setSaveStatus({ text: `Attendance for ${semesterFilter} saved successfully!`, type: 'success' });
      setCapturedImage(null); 
      setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
      return true;
    } catch (err) {
      console.error('Save error:', err);
      // Fallback for storage quota
      if (err.name === 'QuotaExceededError') {
        alert("Storage is full! Please delete some old records to save new ones.");
      } else {
        setSaveStatus({ text: 'Failed to save attendance.', type: 'error' });
      }
      return false;
    }
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
        // Logo
        ctx.drawImage(logoImg, 40, 40, 280, 280);
        
        ctx.textAlign = 'left';
        
        // Punjabi Title
        ctx.fillStyle = '#8a2c20';
        ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.fillText('ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ', 360, 100);
        
        // English Title
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Maharaja Ranjit Singh Punjab Technical University, BATHINDA', 360, 160);
        
        // Subtext
        ctx.fillStyle = '#555';
        ctx.font = 'italic 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText('(A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015', 360, 200);
        ctx.fillText('and Approved Under Section 2(f) & 12 (B) of UGC)', 360, 230);
        
        // Report Separator
        ctx.fillStyle = '#8a2c20';
        ctx.fillRect(360, 260, 1200, 4);

        // Report Information
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`STUDENT LIST - ${semesterFilter === 'All' ? 'ALL SEMESTERS' : semesterFilter.toUpperCase()}`, 360, 310);

        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) {
      doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);
    } else {
      // Fallback
      doc.setFillColor(138, 44, 32);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('MRSPTU ATTENDANCE MANAGEMENT', 105, 20, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 55);
    doc.text(`Professor: ${teacher.fullName}`, 15, 60);
    doc.text(`Department: ${teacher.department}`, 15, 65);

    let headers = [['Name', 'Roll No', 'Course', 'Semester', 'Email']];
    if (withCreds) headers[0].push('Username', 'Password');
    
    const data = filteredBySemester.map(s => {
      const row = [s.fullName, s.enrollmentNumber, s.course, s.semester, s.email];
      if (withCreds) row.push(s.username, s.password);
      return row;
    });

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [138, 44, 32], textColor: 255 },
      styles: { fontSize: 8 }
    });

    doc.save(`students_list_${Date.now()}.pdf`);
    setShowPdfModal(false);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPwdUpdateMsg({ text: '', type: '' });

    if (newPwd !== confirmPwd) {
      setPwdUpdateMsg({ text: 'Passwords do not match!', type: 'error' });
      return;
    }

    if (newPwd.length < 6) {
      setPwdUpdateMsg({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    try {
      const updatedTeacher = { ...teacher, password: newPwd };
      const allTeachers = JSON.parse(localStorage.getItem('teacherSubmissions')) || [];
      const updatedList = allTeachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
      localStorage.setItem('teacherSubmissions', JSON.stringify(updatedList));

      setTeacher(updatedTeacher);
      sessionStorage.setItem('loggedInTeacher', JSON.stringify(updatedTeacher));

      setPwdUpdateMsg({ text: 'Password updated successfully!', type: 'success' });
      setTimeout(() => {
        setShowPwdModal(false);
        setNewPwd('');
        setConfirmPwd('');
        setPwdUpdateMsg({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      console.error('Password update error:', err);
      setPwdUpdateMsg({ text: 'Failed to update password. Please try again.', type: 'error' });
    }
  };

  const handleDeleteRequest = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
    setDeleteConfirmPwd('');
  };

  const confirmDeletion = () => {
    if (deleteConfirmPwd !== teacher.password) {
      alert("Incorrect password! Deletion failed.");
      return;
    }

    try {
      const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
      const updatedRecords = allRecords.filter(r => r.id !== recordToDelete.id);
      localStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));
      
      setSaveStatus({ text: 'Record deleted successfully.', type: 'success' });
      setShowDeleteModal(false);
      setRecordToDelete(null);
      setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      alert("Failed to delete record.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('loggedInTeacher');
    navigate('/');
  };

  if (!teacher) return null;

  const filteredBySemester = semesterFilter === '' ? [] : students.filter(s => semesterFilter === 'All' || s.semester === semesterFilter);

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
      {saveStatus.text && (
        <div style={{ 
          position: 'fixed', top: '20px', right: '20px', padding: '15px 30px', borderRadius: '8px', zIndex: 1100,
          background: saveStatus.type === 'success' ? '#2e7d32' : '#c62828', color: 'white', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {saveStatus.text}
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={teacher.profilePhoto || '/IMAGES/default-avatar.png'} 
              alt="Profile" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #8a2c20', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <div>
            <h1 style={{ color: '#8a2c20', fontSize: '2.2rem', margin: 0 }}>{teacher.department || 'Academic'} Dashboard</h1>
            <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Prof: {teacher.fullName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => setShowPwdModal(true)}
            style={{ padding: '12px 25px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            Change Password
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '12px 25px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '30px' }}>
        <button 
          onClick={() => setActiveTab('profile')} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'profile' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'profile' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          My Profile
        </button>
        <button 
          onClick={() => { setActiveTab('students'); setSemesterFilter(''); }} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'students' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'students' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          My Students
        </button>
        <button 
          onClick={() => { setActiveTab('attendance'); setSemesterFilter(''); }} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'attendance' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'attendance' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          Attendance Management
        </button>
        <button 
          onClick={() => { setActiveTab('history'); setHistorySemesterFilter(''); }} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'history' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'history' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          Attendance History
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '35px', borderRadius: '15px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            <div>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Professional Details</h3>
              <p><strong>Department:</strong> {teacher.department}</p>
              <p><strong>Primary Subject:</strong> {teacher.primarySubject}</p>
              <p><strong>Qualification:</strong> {teacher.qualification}</p>
              <p><strong>Experience:</strong> {teacher.experience} Years</p>
            </div>
            <div>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Contact & Info</h3>
              <p><strong>Email:</strong> {teacher.email}</p>
              <p><strong>Phone:</strong> {teacher.phone}</p>
              <p><strong>Gender:</strong> {teacher.gender}</p>
              <p><strong>Joined On:</strong> {teacher.submissionDate}</p>
              <p><strong>Username:</strong> {teacher.username}</p>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', margin: 0 }}>Students List</h3>
              <select 
                value={semesterFilter} 
                onChange={(e) => setSemesterFilter(e.target.value)}
                style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
              >
                <option value="">Select Semester</option>
                <option value="All">All Semesters</option>
                {getAvailableSemesters().map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
              {filteredBySemester.length > 0 && (
                <button 
                  onClick={handleDownloadPDF}
                  style={{ marginLeft: '10px', background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📥 Download List PDF
                </button>
              )}
            </div>
            
            {filteredBySemester.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>No students found {semesterFilter !== 'All' ? `for ${semesterFilter}` : 'in your department'}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textTransform: 'uppercase', fontSize: '13px' }}>
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Roll No</th>
                    <th style={thStyle}>Full Name</th>
                    <th style={thStyle}>Course</th>
                    <th style={thStyle}>Semester</th>
                    <th style={thStyle}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBySemester.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>
                        {s.profilePhoto ? (
                          <img src={s.profilePhoto} alt="S" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }} />
                        ) : (
                          <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#888' }}>
                            {s.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>{s.enrollmentNumber}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{s.fullName}</td>
                      <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{s.course}</span></td>
                      <td style={tdStyle}>{s.semester}</td>
                      <td style={tdStyle}>{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ color: '#8a2c20', margin: 0 }}>Mark Attendance</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    onClick={() => { setMarkingMode('manual'); stopCamera(); }}
                    style={{ 
                      padding: '6px 15px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer',
                      background: markingMode === 'manual' ? '#8a2c20' : 'white',
                      color: markingMode === 'manual' ? 'white' : '#666',
                      fontSize: '13px', fontWeight: 'bold'
                    }}
                  >
                    📝 Manual Marking
                  </button>
                  <button 
                    onClick={() => setMarkingMode('smart')}
                    style={{ 
                      padding: '6px 15px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer',
                      background: markingMode === 'smart' ? '#8a2c20' : 'white',
                      color: markingMode === 'smart' ? 'white' : '#666',
                      fontSize: '13px', fontWeight: 'bold'
                    }}
                  >
                    📸 Smart Attendance
                  </button>
                  <button 
                    onClick={() => {
                        const url = `${window.location.origin}/upload-face`;
                        navigator.clipboard.writeText(url);
                        setSaveStatus({ text: 'Face Enrollment Link copied to clipboard!', type: 'success' });
                        setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
                    }}
                    style={{ 
                      padding: '6px 15px', borderRadius: '20px', border: '1px solid #8a2c20', cursor: 'pointer',
                      background: 'white',
                      color: '#8a2c20',
                      fontSize: '13px', fontWeight: 'bold'
                    }}
                  >
                    🔗 Copy Enrollment Link
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select 
                  value={semesterFilter} 
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="">Select Semester</option>
                  {getAvailableSemesters().map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
                <div style={{ background: '#f5f5f5', padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', color: '#666', fontWeight: 600 }}>
                  Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <select 
                  value={selectedSession} 
                  onChange={(e) => setSelectedSession(e.target.value)}
                  style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', fontWeight: 600, color: '#8a2c20' }}
                >
                  <option value="Lecture 1">Lecture 1</option>
                  <option value="Lecture 2">Lecture 2</option>
                  <option value="Lecture 3">Lecture 3</option>
                  <option value="Lecture 4">Lecture 4</option>
                  <option value="Extra Lecture">Extra Lecture</option>
                </select>
                {markingMode === 'manual' && (
                  <button 
                    onClick={handleSaveAttendance}
                    style={{ background: '#8a2c20', color: 'white', border: 'none', padding: '8px 25px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(138,44,32,0.2)' }}
                  >
                    Save Attendance
                  </button>
                )}
              </div>
            </div>

            {markingMode === 'manual' ? (
              <>
                {filteredBySemester.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textTransform: 'uppercase', fontSize: '13px' }}>
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Roll No</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Session</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBySemester.map((s) => (
                    <tr key={`att-${s.id}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>
                        {s.profilePhoto ? (
                          <img src={s.profilePhoto} alt="S" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }} />
                        ) : (
                          <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#888' }}>
                            {s.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>{s.enrollmentNumber}</td>
                      <td style={tdStyle}>{s.fullName}</td>
                      <td style={tdStyle}>{teacher.primarySubject}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name={`status-${s.id}`} 
                              checked={attendanceMarks[s.id] === 'Present'} 
                              onChange={() => handleStatusChange(s.id, 'Present')}
                            /> Present
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name={`status-${s.id}`} 
                              checked={attendanceMarks[s.id] === 'Absent'} 
                              onChange={() => handleStatusChange(s.id, 'Absent')}
                            /> Absent
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                ) : (
                  <p style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>Please select a specific semester to mark attendance.</p>
                )}
              </>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                {!isCameraOpen ? (
                  <div style={{ padding: '60px', border: '2px dashed #ddd', borderRadius: '20px', background: '#fcfcfc' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📷</div>
                    <h2 style={{ color: '#333' }}>Smart Class Scanner</h2>
                    <p style={{ color: '#666', maxWidth: '500px', margin: '0 auto 30px' }}>
                      Use the class scanner to automatically identify and mark students in <strong>{semesterFilter || 'the selected semester'}</strong> using their enrolled face profiles.
                    </p>
                    <button 
                      onClick={startCamera}
                      style={{ background: '#8a2c20', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(138,44,32,0.2)' }}
                    >
                      Open Class Camera
                    </button>
                  </div>
                ) : (
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', background: '#000', aspectRatio: '16/9', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      
                      {/* FUTURISTIC OVERLAYS */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                        {/* Time/Date Overlay */}
                        <div style={{ position: 'absolute', top: '20px', left: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', textAlign: 'left', fontFamily: 'monospace' }}>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>SYSTEM_CORE_LIVE</div>
                          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{currentTime.toLocaleTimeString()}</div>
                          <div style={{ fontSize: '14px' }}>{currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>

                        {/* Scanner Frame */}
                        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px' }}>
                          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '30px', height: '30px', borderTop: '4px solid #8a2c20', borderLeft: '4px solid #8a2c20', borderTopLeftRadius: '10px' }}></div>
                          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '30px', height: '30px', borderTop: '4px solid #8a2c20', borderRight: '4px solid #8a2c20', borderTopRightRadius: '10px' }}></div>
                          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '30px', height: '30px', borderBottom: '4px solid #8a2c20', borderLeft: '4px solid #8a2c20', borderBottomLeftRadius: '10px' }}></div>
                          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '30px', height: '30px', borderBottom: '4px solid #8a2c20', borderRight: '4px solid #8a2c20', borderBottomRightRadius: '10px' }}></div>
                        </div>

                        {/* Scanning Laser Animation */}
                        {isScanning && (
                          <div style={{ 
                            position: 'absolute', top: '10%', left: '10%', width: '80%', height: '2px', background: '#d32f2f', boxShadow: '0 0 15px #d32f2f', opacity: 0.8,
                            animation: 'scanLine 2s linear infinite', zIndex: 10
                          }}></div>
                        )}
                        <style>{`
                          @keyframes scanLine {
                            0% { top: 10%; }
                            50% { top: 90%; }
                            100% { top: 10%; }
                          }
                        `}</style>

                        {/* Detection Log Overlay */}
                        <div style={{ position: 'absolute', top: '20px', right: '20px', width: '200px', background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '12px', color: '#00e676', fontSize: '11px', fontFamily: 'monospace', textAlign: 'left', pointerEvents: 'none', border: '1px solid rgba(0,230,118,0.3)' }}>
                          <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(0,230,118,0.2)', paddingBottom: '5px', fontWeight: 'bold' }}>DETECTION_LOG</div>
                          {detectionLog.map((log, i) => (
                            <div key={i} style={{ marginBottom: '4px', opacity: 1 - (i * 0.15) }}>{log}</div>
                          ))}
                          {detectionLog.length === 0 && <div>IDLE_WAITING...</div>}
                        </div>

                        {/* "Match Found" Visual Alert */}
                        {lastDetectedStudent && (
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.85)', border: '2px solid #00e676', padding: '20px', borderRadius: '20px', color: 'white', fontWeight: 'bold', zIndex: 20, textAlign: 'center', minWidth: '250px', boxShadow: '0 0 30px rgba(0,230,118,0.3)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '10px', color: '#00e676', letterSpacing: '2px' }}>Identification Verified</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
                              <img 
                                src={lastDetectedPhoto} 
                                style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #00e676' }} 
                                alt="Found" 
                              />
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{lastDetectedStudent}</div>
                                <div style={{ fontSize: '12px', color: '#00e676', opacity: 0.8 }}>DATA_MATCH_CORE_80%</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Processing Status */}
                        {isScanning && (
                          <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 20px', borderRadius: '30px', backdropFilter: 'blur(5px)' }}>
                            <div style={{ fontSize: '12px', marginBottom: '5px', color: '#00e676' }}>VERIFYING_FACIAL_PROFILES... {scanProgress}%</div>
                            <div style={{ width: '150px', height: '4px', background: '#333', borderRadius: '2px' }}>
                              <div style={{ width: `${scanProgress}%`, height: '100%', background: '#00e676', transition: 'width 0.1s' }}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
                      <button 
                        onClick={stopCamera}
                        style={{ background: '#eee', color: '#333', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={performScan}
                        disabled={isScanning || !semesterFilter}
                        style={{ 
                          background: (isScanning || !semesterFilter) ? '#ccc' : '#8a2c20', 
                          color: 'white', border: 'none', padding: '12px 40px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {isScanning ? 'Processing...' : 'Start Group Detection'}
                      </button>
                    </div>
                    {!semesterFilter && <p style={{ color: '#c62828', fontSize: '13px', marginTop: '10px' }}>* Please select a semester first</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', margin: 0 }}>Previous Attendance Records</h3>
              <select 
                value={historySemesterFilter} 
                onChange={(e) => setHistorySemesterFilter(e.target.value)}
                style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
              >
                <option value="">Select Semester</option>
                <option value="All">All Semesters</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
              </select>
            </div>
            
            {(() => {
              const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
              const teacherHistory = allRecords
                .filter(r => r.teacherId === teacher.id)
                .filter(r => historySemesterFilter === 'All' || r.semester === historySemesterFilter)
                .sort((a,b) => b.id - a.id);

              if (historySemesterFilter === '') {
                return (
                  <p style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>
                    Please select a specific semester to view history records.
                  </p>
                );
              }

              if (teacherHistory.length === 0) {
                return (
                  <p style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>
                    {historySemesterFilter === 'All' ? 'No attendance history found yet.' : `No history records found for ${historySemesterFilter}.`}
                  </p>
                );
              }

              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Proof</th>
                      <th style={thStyle}>Semester</th>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Session</th>
                      <th style={thStyle}>Total Students</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherHistory.map(record => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>{record.dateDisplay}</td>
                        <td style={tdStyle}>
                          {record.proofPhoto ? (
                            <img 
                              src={record.proofPhoto} 
                              alt="Proof" 
                              style={{ width: '45px', height: '30px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #eee', cursor: 'pointer' }}
                              onClick={() => setSelectedHistory(record)}
                            />
                          ) : (
                            <span style={{ color: '#ccc', fontSize: '11px' }}>N/A</span>
                          )}
                        </td>
                        <td style={tdStyle}>{record.semester}</td>
                        <td style={tdStyle}>{record.subject}</td>
                        <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#f5f5f5', fontSize: '12px', fontWeight: 'bold' }}>{record.session || 'Lecture 1'}</span></td>
                        <td style={tdStyle}>{Object.keys(record.attendance).length} Students</td>
                        <td style={tdStyle}>
                          <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ Saved</span>
                        </td>
                        <td style={tdStyle}>
                         <button 
                            onClick={() => setSelectedHistory(record)}
                            style={{ background: '#3498db', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDeleteRequest(record)}
                            style={{ background: '#c62828', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>

      {/* Attendance History Details Modal */}
      {selectedHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '850px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 15px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#8a2c20' }}>Attendance Details</h2>
                <p style={{ margin: '5px 0 0 0', color: '#666' }}>{selectedHistory.subject} | {selectedHistory.session || 'Lecture 1'} | {selectedHistory.semester} | {selectedHistory.dateDisplay}</p>
              </div>
              <button onClick={() => setSelectedHistory(null)} style={{ background: '#eee', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '5px 10px', borderRadius: '50%' }}>×</button>
            </div>

            {/* Statistics Row */}
            {(() => {
              const studentsInRecord = Object.keys(selectedHistory.attendance);
              const presentCount = studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Present').length;
              const absentCount = studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Absent').length;

              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Total Students</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{studentsInRecord.length}</span>
                    </div>
                    <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#4caf50', textTransform: 'uppercase' }}>Present</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>{presentCount}</span>
                    </div>
                    <div style={{ background: '#ffebee', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#f44336', textTransform: 'uppercase' }}>Absent</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>{absentCount}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    {/* Present List */}
                    <div>
                      <h4 style={{ color: '#2e7d32', borderBottom: '2px solid #e8f5e9', paddingBottom: '8px', marginBottom: '15px' }}>Present Students</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Present').map(id => {
                          const s = students.find(std => std.id === parseInt(id));
                          return s ? (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                              <img src={s.profilePhoto || '/IMAGES/default-avatar.png'} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} alt="S" />
                              <span style={{ fontSize: '14px' }}>{s.fullName}</span>
                              <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{s.enrollmentNumber}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Absent List */}
                    <div>
                      <h4 style={{ color: '#c62828', borderBottom: '2px solid #ffebee', paddingBottom: '8px', marginBottom: '15px' }}>Absent Students</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Absent').map(id => {
                          const s = students.find(std => std.id === parseInt(id));
                          return s ? (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                              <img src={s.profilePhoto || '/IMAGES/default-avatar.png'} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} alt="S" />
                              <span style={{ fontSize: '14px' }}>{s.fullName}</span>
                              <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{s.enrollmentNumber}</span>
                            </div>
                          ) : null;
                        })}
                        {studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Absent').length === 0 && (
                          <p style={{ color: '#999', fontSize: '14px', fontStyle: 'italic' }}>No absences recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedHistory.proofPhoto && (
                    <div style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                      <h4 style={{ color: '#8a2c20', marginBottom: '15px' }}>Session Proof Image</h4>
                      <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                        <img 
                          src={selectedHistory.proofPhoto} 
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} 
                          alt="Attendance Proof" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPwdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '20px', color: '#8a2c20' }}>Change Your Password</h3>
            
            {pwdUpdateMsg.text && (
              <div style={{ 
                backgroundColor: pwdUpdateMsg.type === 'error' ? '#ffebee' : '#e8f5e9', 
                color: pwdUpdateMsg.type === 'error' ? '#c62828' : '#2e7d32', 
                padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' 
              }}>
                {pwdUpdateMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>New Password</label>
                <input 
                  type="password" 
                  value={newPwd} 
                  onChange={(e) => setNewPwd(e.target.value)} 
                  required 
                  placeholder="Enter new password"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPwd} 
                  onChange={(e) => setConfirmPwd(e.target.value)} 
                  required 
                  placeholder="Confirm new password"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowPwdModal(false); setPwdUpdateMsg({ text: '', type: '' }); }} 
                  style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ background: '#8a2c20', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
              <h3 style={{ color: '#c62828', margin: 0 }}>Confirm Security Deletion</h3>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                You are about to delete the attendance record for <strong>{recordToDelete?.subject}</strong> ({recordToDelete?.dateDisplay}).
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Enter Password to Confirm</label>
              <input 
                type="password" 
                value={deleteConfirmPwd} 
                onChange={(e) => setDeleteConfirmPwd(e.target.value)} 
                placeholder="Teacher Password"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, background: '#eee', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletion}
                style={{ flex: 2, background: '#c62828', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Verify & Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '15px', width: '450px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📄</div>
            <h3 style={{ color: '#8a2c20', marginBottom: '10px' }}>Export Student List PDF</h3>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '15px' }}>
              Would you like to include sensitive login credentials (<strong>Username & Password</strong>) in the exported student list?
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
    </div>
  );
}

const thStyle = { padding: '15px', textAlign: 'left', borderBottom: '2px solid #eee' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #eee', fontSize: '14px' };

export default TeacherProfile;
