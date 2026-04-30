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

  const [activeView, setActiveView] = useState('attendance'); // 'attendance' or 'details'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSubject, setSelectedSubject] = useState('All');

  useEffect(() => {
    const savedStudent = sessionStorage.getItem('loggedInStudent');
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      fetchData(parsed);
    } else {
      navigate('/student-services');
    }
  }, []);

  const fetchData = async (student) => {
    try {
      const records = await api.attendance.getAll();
      const id = student._id || student.id;
      const myRecords = records.filter(r => r.attendance?.[id]);
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

  if (loading || !studentInfo) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#8a2c20' }}>Loading Modern Dashboard...</h2>
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  const id = studentInfo._id || studentInfo.id;
  
  // Get predefined subjects based on course and semester
  const predefinedSubjects = (subjectMapping[studentInfo.course] && subjectMapping[studentInfo.course][studentInfo.semester]) || [];
  
  // Combine predefined subjects with subjects from existing attendance records
  const subjects = ['All', ...new Set([...predefinedSubjects, ...attendanceRecords.map(r => r.subject || 'General')])];
  
  const filteredRecords = selectedSubject === 'All' 
    ? attendanceRecords 
    : attendanceRecords.filter(r => (r.subject || 'General') === selectedSubject);

  const presentCount = filteredRecords.filter(r => r.attendance?.[id] === 'Present').length;
  const absentCount = filteredRecords.filter(r => r.attendance?.[id] === 'Absent').length;

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
          <li className={`sidebar-item ${activeView === 'attendance' ? 'active' : ''}`} onClick={() => setActiveView('attendance')}>
            <i className="fas fa-calendar-check"></i> Attendance
          </li>
          <li className={`sidebar-item ${activeView === 'details' ? 'active' : ''}`} onClick={() => setActiveView('details')}>
            <i className="fas fa-user-circle"></i> My Details
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
              <img src={studentInfo.profilePhoto || "https://ui-avatars.com/api/?name=User"} alt="User" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="user-name">{studentInfo.fullName}</span>
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
                      <select disabled><option>{studentInfo.course}</option></select>
                    </div>
                    <div className="filter-group">
                      <label>Semester</label>
                      <select disabled><option>{studentInfo.semester}</option></select>
                    </div>
                    <div className="filter-group">
                      <label>Subject</label>
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <button className="search-btn" onClick={() => fetchData(studentInfo)}>
                      <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: '0' }}>
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.sort((a,b) => new Date(b.date) - new Date(a.date)).map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.date}</td>
                          <td>{r.subject || 'General'}</td>
                          <td>{r.teacherName || 'Admin'}</td>
                          <td>
                            <span className={`status-badge ${r.attendance?.[id] === 'Present' ? 'present' : 'absent'}`}>
                              {r.attendance?.[id]}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {attendanceRecords.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>No records found</td></tr>
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
                      const record = filteredRecords.find(r => r.date === dateStr);
                      const status = record?.attendance?.[id];
                      
                      const currentDayOfWeek = new Date(currentYear, currentMonth, day).getDay();
                      const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;
                      
                      let className = 'calendar-day';
                      if (status === 'Present') className += ' active';
                      else if (status === 'Absent') className += ' danger';
                      else if (isWeekend) className += ' day-off';

                      return (
                        <div key={day} className={className} title={isWeekend ? 'Day Off' : ''}>
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="stats-container">
                  <div className="stat-card stat-yellow">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-info"><h4>{filteredRecords.length}</h4><p>Total Classes</p></div>
                  </div>
                  <div className="stat-card stat-green">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info"><h4>{presentCount}</h4><p>Present</p></div>
                  </div>
                  <div className="stat-card stat-red">
                    <div className="stat-icon">☹️</div>
                    <div className="stat-info"><h4>{absentCount}</h4><p>Absent</p></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="details-view fade-in" style={{ width: '100%' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '30px' }}>
                  <img 
                    src={studentInfo.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo.fullName)}&background=8a2c20&color=fff&size=128`} 
                    alt="Profile" 
                    style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                  <div>
                    <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '5px' }}>{studentInfo.fullName}</h1>
                    <p style={{ color: '#777', fontSize: '16px' }}>Student ID: {studentInfo.enrollmentNumber}</p>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                      <span className="status-badge present">{studentInfo.course}</span>
                      <span className="status-badge" style={{ backgroundColor: '#eef2f7', color: '#555' }}>Semester {studentInfo.semester}</span>
                    </div>
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
                        <span style={{ fontWeight: '600' }}>{studentInfo.email}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Phone Number</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo.phone}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Gender</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo.gender}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Date of Birth</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo.dob}</span>
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
                        <span style={{ fontWeight: '600' }}>{studentInfo.enrollmentNumber}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Username</label>
                        <span style={{ fontWeight: '600' }}>{studentInfo.username}</span>
                      </div>
                      <div className="info-item">
                        <label style={{ fontSize: '12px', color: '#999', display: 'block' }}>Batch</label>
                        <span style={{ fontWeight: '600' }}>2022-2024</span>
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

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  );
}

export default StudentDashboard;
