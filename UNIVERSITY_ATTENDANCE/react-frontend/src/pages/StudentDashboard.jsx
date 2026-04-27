import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './StudentDashboard.css';

function StudentDashboard() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Mock data to match the image aesthetic
  const mockStudents = [
    { id: '447', name: 'Savannah Nguyen', status: 'present' },
    { id: '177', name: 'Brooklyn Simmons', status: 'present' },
    { id: '185', name: 'Darrell Steward', status: 'absent' },
    { id: '816', name: 'Marvin McKinney', status: 'present' },
    { id: '429', name: 'Cameron Williamson', status: 'present' },
    { id: '154', name: 'Cody Fisher', status: 'present' },
    { id: '154', name: 'Cody Fisher', status: 'present' },
  ];

  useEffect(() => {
    const savedStudent = sessionStorage.getItem('loggedInStudent');
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      fetchData(parsed);
    } else {
      // For demo purposes if not logged in, show mock
      setLoading(false);
    }
  }, []);

    const id = studentInfo._id || studentInfo.id;
    const presentCount = attendanceRecords.filter(r => r.attendance?.[id] === 'Present').length;
    const absentCount = attendanceRecords.filter(r => r.attendance?.[id] === 'Absent').length;
    
    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src="/IMAGES/logo.webp" alt="Logo" style={{ width: '40px' }} />
            <span>MRSPTU</span>
          </div>
          <ul className="sidebar-menu">
            <li className="sidebar-item" onClick={() => navigate('/')}><i className="fas fa-home"></i> Home</li>
            <li className="sidebar-item active"><i className="fas fa-user-graduate"></i> Students</li>
            <li className="sidebar-item"><i className="fas fa-book"></i> Academic</li>
            <li className="sidebar-item"><i className="fas fa-file-alt"></i> Examinations</li>
            <li className="sidebar-item"><i className="fas fa-folder-open"></i> Study Materials</li>
            <li className="sidebar-item"><i className="fas fa-wallet"></i> Fees Collections</li>
            <li className="sidebar-item"><i className="fas fa-users"></i> Human Resource</li>
            <li className="sidebar-item" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</li>
          </ul>
        </aside>
  
        {/* Main Content */}
        <main className="main-content">
          {/* Topbar */}
          <header className="topbar">
            <div className="search-container">
              <i className="fas fa-search" style={{ color: '#999' }}></i>
              <input type="text" placeholder="Search for student, Teacher or Document" />
            </div>
            <div className="user-profile">
              <button className="notif-btn">
                <i className="far fa-bell"></i>
                <span className="notif-badge"></span>
              </button>
              <div className="profile-info" onClick={() => navigate('/student-services')}>
                <img 
                  src={studentInfo.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo.fullName)}&background=3498db&color=fff`} 
                  alt="User" 
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>{studentInfo.fullName}</span>
                  <span style={{ fontSize: '11px', color: '#999' }}>Student</span>
                </div>
                <i className="fas fa-chevron-down" style={{ fontSize: '10px', color: '#999' }}></i>
              </div>
            </div>
          </header>
  
          {/* Content Wrapper */}
          <div className="content-wrapper">
            {/* Left: Filters & Table */}
            <div className="left-section">
              <div className="card">
                <h2 className="card-title">My Subject Attendance</h2>
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Faculty</label>
                    <select><option>Faculty of Sciences</option></select>
                  </div>
                  <div className="filter-group">
                    <label>Program *</label>
                    <select><option>{studentInfo.course}</option></select>
                  </div>
                  <div className="filter-group">
                    <label>Section *</label>
                    <select><option>A</option></select>
                  </div>
                  <div className="filter-group">
                    <label>Semester *</label>
                    <select><option>{studentInfo.semester}</option></select>
                  </div>
                  <div className="filter-group">
                    <label>Year *</label>
                    <select><option>2024</option></select>
                  </div>
                  <button className="search-btn">
                    <i className="fas fa-search"></i> Refresh
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
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.sort((a,b) => new Date(b.date) - new Date(a.date)).map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.date}</td>
                        <td>{r.subject || 'N/A'}</td>
                        <td>{r.teacherName || 'N/A'}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            backgroundColor: r.attendance?.[id] === 'Present' ? '#e8f5e9' : '#ffebee',
                            color: r.attendance?.[id] === 'Present' ? '#2e7d32' : '#c62828'
                          }}>
                            {r.attendance?.[id]}
                          </span>
                        </td>
                        <td style={{ color: '#999', fontSize: '12px' }}>N/A</td>
                      </tr>
                    ))}
                    {attendanceRecords.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
  
            {/* Right: Calendar & Stats */}
            <div className="right-section">
              <div className="card calendar-card">
                <div className="calendar-header">
                  <span style={{ fontWeight: '700' }}>April 2024</span>
                  <div>
                    <i className="fas fa-chevron-left" style={{ cursor: 'pointer', marginRight: '15px', fontSize: '12px' }}></i>
                    <i className="fas fa-chevron-right" style={{ cursor: 'pointer', fontSize: '12px' }}></i>
                  </div>
                </div>
                <div className="calendar-grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="calendar-day-name">{d}</div>
                  ))}
                  {[...Array(30)].map((_, i) => {
                    const day = i + 1;
                    const dateStr = `2024-04-${String(day).padStart(2, '0')}`;
                    const record = attendanceRecords.find(r => r.date === dateStr);
                    const status = record?.attendance?.[id];
                    
                    return (
                      <div key={day} className={`calendar-day ${status === 'Present' ? 'active' : status === 'Absent' ? 'muted' : ''}`} style={{ backgroundColor: status === 'Present' ? '#2ecc71' : status === 'Absent' ? '#e74c3c' : '' }}>
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
                    <h4>{attendanceRecords.length}</h4>
                    <p>Total Classes</p>
                  </div>
                </div>
                <div className="stat-card stat-green">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <h4>{presentCount}</h4>
                    <p>Present Days</p>
                  </div>
                </div>
                <div className="stat-card stat-red">
                  <div className="stat-icon">☹️</div>
                  <div className="stat-info">
                    <h4>{absentCount}</h4>
                    <p>Absent Days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
  
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </div>
    );
}

export default StudentDashboard;
