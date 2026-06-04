import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { subjectMapping } from '../utils/subjectMapping';
import './StudentDashboard.css';

function StudentDashboard() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Password change states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdateMsg, setPwdUpdateMsg] = useState({ text: '', type: '' });

  const [activeView, setActiveView] = useState('details'); // 'details' or 'attendance' as default
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('');

  // Fingerprint enrollment states
  const [isEnrollingFinger, setIsEnrollingFinger] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [enrollStatusMsg, setEnrollStatusMsg] = useState('');

  const playBeep = (freq = 800, duration = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio feedback error:', e);
    }
  };

  const startFingerprintEnrollment = () => {
    setIsEnrollingFinger(true);
    setEnrollProgress(0);
    setEnrollStatusMsg('Initializing biometric scanner...');
    playBeep(600, 0.1);
    
    const steps = [
      { progress: 10, msg: 'Initializing biometric scanner...' },
      { progress: 25, msg: 'Place your thumb on the sensor...' },
      { progress: 45, msg: 'Scanning fingerprint minutiae...' },
      { progress: 70, msg: 'Analyzing pattern characteristics...' },
      { progress: 90, msg: 'Securing template encryption...' },
      { progress: 100, msg: 'Fingerprint registered successfully!' }
    ];
    
    let currentStep = 0;
    const interval = setInterval(async () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setEnrollProgress(step.progress);
        setEnrollStatusMsg(step.msg);
        playBeep(800 + step.progress * 2, 0.05);
        currentStep++;
      } else {
        clearInterval(interval);
        
        try {
          const id = studentInfo._id || studentInfo.id;
          const mockFingerprintData = `FP_SIG_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
          const updatedStudent = {
            ...studentInfo,
            enrolledFingerprint: 'Active',
            fingerprintData: mockFingerprintData
          };
          
          await api.students.update(id, updatedStudent);
          
          setStudentInfo(updatedStudent);
          sessionStorage.setItem('loggedInStudent', JSON.stringify(updatedStudent));
          playBeep(1200, 0.3);
          
          setTimeout(() => {
            setIsEnrollingFinger(false);
          }, 1500);
        } catch (err) {
          console.error('Biometric enrollment failed:', err);
          setEnrollStatusMsg('Enrollment failed. Please try again.');
          playBeep(400, 0.4);
        }
      }
    }, 800);
  };

  useEffect(() => {
    const savedStudent = sessionStorage.getItem('loggedInStudent');
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      setSemesterFilter(parsed.semester); // Default to current semester
      fetchData(parsed, parsed.semester);
    } else {
      navigate('/student-services');
    }
  }, []);

  const fetchData = async (student, sem, sub) => {
    if (!student) return;
    setLoading(true);
    try {
      const id = student._id || student.id;
      // Optimize: Fetch records for specific student, semester, AND subject
      const params = { studentId: id };
      if (sem && sem !== 'All') params.semester = sem;
      if (sub && sub !== 'All') params.subject = sub;
      
      const myRecords = await api.attendance.getAll(params);
      setAttendanceRecords(myRecords);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('loggedInStudent');
    navigate('/');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdUpdateMsg({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setPwdUpdateMsg({ text: 'Passwords do not match!', type: 'error' });
      return;
    }

    try {
      const id = studentInfo._id || studentInfo.id;
      await api.students.update(id, { ...studentInfo, password: newPassword });
      setPwdUpdateMsg({ text: 'Password updated successfully!', type: 'success' });
      setTimeout(() => {
        setShowPwdModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPwdUpdateMsg({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      setPwdUpdateMsg({ text: 'Failed to update: ' + err.message, type: 'error' });
    }
  };

  const id = studentInfo?._id || studentInfo?.id;
  
  const getSemesterIndex = (semStr) => {
    if (!semStr) return "";
    const match = semStr.match(/\d+/);
    return match ? match[0] : semStr;
  };

  const semIndex = getSemesterIndex(semesterFilter || studentInfo?.semester);
  
  // Get predefined subjects based on course and semester index (e.g. "4th Semester" -> "4")
  const predefinedSubjects = (studentInfo && subjectMapping[studentInfo.course] && subjectMapping[studentInfo.course][semIndex]) || [];
  
  // Combine predefined subjects with subjects from existing attendance records
  const subjects = ['All', ...new Set([...predefinedSubjects, ...attendanceRecords.map(r => r.subject || 'General')])];
  
  const filteredRecords = selectedSubject === 'All' 
    ? attendanceRecords 
    : attendanceRecords.filter(r => (r.subject || 'General') === selectedSubject);

  const presentCount = filteredRecords.filter(r => r.attendance?.[id] === 'Present').length;
  const absentCount = filteredRecords.filter(r => r.attendance?.[id] !== 'Present').length;

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/IMAGES/logo.webp" alt="Logo" style={{ width: '40px' }} />
          <span>MRSPTU</span>
        </div>
        <ul className="sidebar-menu">
          <li className={`sidebar-item ${activeView === 'details' ? 'active' : ''}`} onClick={() => setActiveView('details')}>
            <i className="fas fa-user-circle"></i> My Details
          </li>
          <li className={`sidebar-item ${activeView === 'attendance' ? 'active' : ''}`} onClick={() => setActiveView('attendance')}>
            <i className="fas fa-calendar-check"></i> Attendance
          </li>
          <li className="sidebar-item"><i className="fas fa-book"></i> Academic</li>
          <li className="sidebar-item"><i className="fas fa-file-alt"></i> Examinations</li>
          <li className="sidebar-item"><i className="fas fa-folder-open"></i> Study Materials</li>
          <li className="sidebar-item" onClick={() => setShowPwdModal(true)}><i className="fas fa-key"></i> Change Password</li>
          <li className="sidebar-item" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="search-container">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search Attendance, Subject..." />
          </div>
          <div className="user-profile">
            <div className="profile-info" onClick={() => setActiveView('details')} style={{ cursor: 'pointer' }}>
              <img src={studentInfo?.profilePhoto || "https://ui-avatars.com/api/?name=User"} alt="User" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="user-name">{studentInfo?.fullName}</span>
                <span className="user-role">Student Portal</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          {activeView === 'attendance' ? (
            <>
              <div className="left-section">
                <div className="card">
                  <h2 className="card-title">Subject Attendance Details</h2>
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label>Course</label>
                      <select disabled><option>{studentInfo?.course || 'Loading...'}</option></select>
                    </div>
                    <div className="filter-group">
                      <label>Semester</label>
                      <select 
                        value={semesterFilter} 
                        onChange={(e) => {
                          setSemesterFilter(e.target.value);
                          fetchData(studentInfo, e.target.value);
                        }}
                      >
                        <option value="All">All Semesters</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <option key={n} value={`${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Semester`}>
                            {n}{n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} Semester
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Subject</label>
                      <select 
                        value={selectedSubject} 
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          fetchData(studentInfo, semesterFilter, e.target.value);
                        }}
                      >
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <button className="search-btn" onClick={() => fetchData(studentInfo, semesterFilter, selectedSubject)}>
                      <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: '0' }}>
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Semester</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array(5).fill(0).map((_, i) => (
                          <tr key={`skel-row-${i}`}>
                            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                            <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                            <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                            <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                          </tr>
                        ))
                      ) : (
                        <>
                          {filteredRecords.sort((a,b) => new Date(b.date) - new Date(a.date)).map((r, idx) => (
                            <tr key={idx}>
                              <td>{r.date}</td>
                              <td style={{ fontSize: '12px', fontWeight: 'bold', color: '#8a2c20' }}>{r.semester}</td>
                              <td>{r.subject || 'General'}</td>
                              <td>{r.teacherName || 'Admin'}</td>
                              <td>
                                <span className={`status-badge ${r.attendance?.[id] === 'Present' ? 'present' : 'absent'}`}>
                                  {r.attendance?.[id] === 'Present' ? 'Present' : 'Absent'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredRecords.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No records found for this selection</td></tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="right-section">
                <div className="card calendar-card">
                  <div className="calendar-header">
                    <h3 className="card-title" style={{ marginBottom: 0 }}>Calendar</h3>
                    <div className="calendar-nav">
                      <button onClick={prevMonth} className="nav-btn"><i className="fas fa-chevron-left"></i></button>
                      <span className="current-month-display">
                        {calendarDate.toLocaleString('default', { month: 'long' })} {currentYear}
                      </span>
                      <button onClick={nextMonth} className="nav-btn"><i className="fas fa-chevron-right"></i></button>
                    </div>
                  </div>
                  <div className="calendar-grid">
                    {['S','M','T','W','T','F','S'].map((d, i) => <div key={`day-name-${i}`} className="calendar-day-name">{d}</div>)}
                    {[...Array(firstDayOfMonth)].map((_, i) => (
                      <div key={`empty-${i}`} className="calendar-day empty"></div>
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayRecords = filteredRecords.filter(r => r.date === dateStr);
                      const dayAbsents = dayRecords.filter(r => r.attendance?.[id] !== 'Present').length;
                      const dayPresents = dayRecords.filter(r => r.attendance?.[id] === 'Present').length;
                      
                      const currentDayOfWeek = new Date(currentYear, currentMonth, day).getDay();
                      const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;
                      
                      let className = 'calendar-day';
                      if (dayAbsents > 0) className += ' danger'; 
                      else if (dayPresents > 0) className += ' active';
                      else if (isWeekend) className += ' day-off';

                      return (
                        <div key={day} className={className} title={dayAbsents > 0 ? 'Absent' : dayPresents > 0 ? 'Present' : isWeekend ? 'Day Off' : ''}>
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="stats-container">
                  <div className="stat-card stat-yellow">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-info">
                      {loading ? <div className="skeleton skeleton-text" style={{ width: '40px', height: '24px' }}></div> : <h4>{filteredRecords.length}</h4>}
                      <p>Total Classes</p>
                    </div>
                  </div>
                  <div className="stat-card stat-green">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      {loading ? <div className="skeleton skeleton-text" style={{ width: '40px', height: '24px' }}></div> : <h4>{presentCount}</h4>}
                      <p>Present</p>
                    </div>
                  </div>
                  <div className="stat-card stat-red">
                    <div className="stat-icon">☹️</div>
                    <div className="stat-info">
                      {loading ? <div className="skeleton skeleton-text" style={{ width: '40px', height: '24px' }}></div> : <h4>{absentCount}</h4>}
                      <p>Absent</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="details-view fade-in" style={{ width: '100%' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '30px' }}>
                  <img 
                    src={studentInfo?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo?.fullName || 'User')}&background=8a2c20&color=fff&size=128`} 
                    alt="Profile" 
                    style={{ width: '120px', height: '120px', borderRadius: '15px', border: '3px solid #8a2c20', objectFit: 'cover' }} 
                  />
                  <div>
                    <h2 style={{ margin: 0, color: '#8a2c20', fontSize: '28px' }}>{studentInfo?.fullName}</h2>
                    <p style={{ margin: '5px 0 0', color: '#666', fontSize: '16px' }}>{studentInfo?.course} | Semester {studentInfo?.semester}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                  <div>
                    <h3 style={{ color: '#8a2c20', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-info-circle"></i> Personal Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Email Address</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.email}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Phone Number</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.phone}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Gender</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.gender}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Date of Birth</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.dob}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ color: '#3498db', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-university"></i> Academic Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Department</label>
                        <span style={{ fontWeight: '600' }}>Computational Sciences</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Enrollment Number</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.enrollmentNumber}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Username</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.username}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Batch Year</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo?.batchYear}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ color: '#2e7d32', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-fingerprint"></i> Biometric Enrollment
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div className="info-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Face Recognition</label>
                          <span style={{ fontWeight: '600', color: studentInfo?.enrolledFace ? '#2e7d32' : '#e53935' }}>
                            {studentInfo?.enrolledFace ? '✓ Fully Enrolled' : '✗ Missing'}
                          </span>
                        </div>
                        {studentInfo?.enrolledFace && (
                          <img src={studentInfo?.enrolledFace} alt="Enrolled Face" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #ddd' }} />
                        )}
                      </div>
                      <div className="info-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Fingerprint Template</label>
                          <span style={{ fontWeight: '600', color: studentInfo?.enrolledFingerprint === 'Active' ? '#2e7d32' : '#e53935' }}>
                            {studentInfo?.enrolledFingerprint === 'Active' ? '✓ Registered' : '✗ Missing'}
                          </span>
                        </div>
                        {studentInfo?.enrolledFingerprint === 'Active' ? (
                          <div style={{ fontSize: '24px' }}>👆</div>
                        ) : (
                          <button 
                            onClick={startFingerprintEnrollment}
                            style={{ 
                              background: '#2e7d32', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px',
                              fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            Register
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px dashed #ddd' }}>
                  <p style={{ color: '#777', fontSize: '14px', textAlign: 'center' }}>
                    <i className="fas fa-lock"></i> To update your official information, please contact the Department Administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal">
            <h3>Update Password</h3>
            {pwdUpdateMsg.text && <div className={`message ${pwdUpdateMsg.type}`}>{pwdUpdateMsg.text}</div>}
            <form onSubmit={handlePasswordChange}>
              <div className="filter-group">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="filter-group">
                <label>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="search-btn" style={{ flex: 1 }}>Update</button>
                <button type="button" onClick={() => setShowPwdModal(false)} className="search-btn" style={{ flex: 1, backgroundColor: '#999' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fingerprint Enrollment Modal */}
      {isEnrollingFinger && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal" style={{ background: '#0a0f1d', border: '1px solid rgba(0,230,118,0.2)', color: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#00e676', marginBottom: '20px', fontFamily: 'monospace', letterSpacing: '1px' }}>BIOMETRIC REGISTRATION</h3>
            
            <div style={{ position: 'relative', width: '120px', height: '140px', margin: '0 auto 25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100" height="120" viewBox="0 0 24 28" fill="none" stroke="#00e676" strokeWidth="1.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 8px #00e676)' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12C2 13.92 2.55 15.7 3.5 17.2M22 12C22 6.48 17.52 2 12 2" />
                <path d="M5.5 19.5C6.75 21 8.5 22 10.5 22.3M18.5 19.5C19.38 18.5 20 17.2 20.3 15.8" />
                <path d="M8.5 7.5C10 6.5 12 6.5 13.5 7.5M6.5 11C7 9.5 8.5 8.5 10.5 8.2M15.5 12.5C15 14 13.5 15 11.5 15.3" />
                <path d="M10 11C10 11.5 10.5 12 11 12C11.5 12 12 11.5 12 11C12 10.5 11.5 10 11 10C10.5 10 10 10.5 10 11" />
              </svg>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: '#00e676', boxShadow: '0 0 15px #00e676', animation: 'laserScan 1.5s infinite ease-in-out', borderRadius: '2px' }}></div>
            </div>

            <div style={{ width: '80%', height: '8px', background: '#222', borderRadius: '4px', margin: '0 auto 15px', overflow: 'hidden' }}>
              <div style={{ width: `${enrollProgress}%`, height: '100%', background: '#00e676', transition: 'width 0.1s linear', boxShadow: '0 0 10px #00e676' }}></div>
            </div>

            <p style={{ fontFamily: 'monospace', fontSize: '14px', color: '#8892b0', margin: 0, minHeight: '20px' }}>
              {enrollStatusMsg}
            </p>

            <button 
              type="button" 
              onClick={() => setIsEnrollingFinger(false)} 
              style={{ 
                marginTop: '25px', width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', 
                color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'monospace'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes laserScan {
          0% { top: 5%; opacity: 0.3; }
          50% { top: 95%; opacity: 1; }
          100% { top: 5%; opacity: 0.3; }
        }
      `}</style>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  );
}

export default StudentDashboard;
