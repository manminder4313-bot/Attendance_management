import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

function StudentService() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loginData, setLoginData] = useState({ id: '', pwd: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Password change states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdateMsg, setPwdUpdateMsg] = useState({ text: '', type: '' });

  const navigate = useNavigate();

  useEffect(() => {
    const savedStudent = sessionStorage.getItem('loggedInStudent');
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      setIsLoggedIn(true);
      fetchAttendance(parsed);
    }
  }, []);

  const fetchAttendance = async (student) => {
    if (!student) return;
    setIsLoading(true);
    try {
      const id = student._id || student.id;
      const allRecords = await api.attendance.getAll();
      const myRecords = allRecords.filter(r => r.attendance?.[id]);
      setAttendanceRecords(myRecords);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const data = await api.login(loginData.id, loginData.pwd);
      
      if (data.type === 'student') {
        setStudentInfo(data.user);
        setIsLoggedIn(true);
        sessionStorage.setItem('loggedInStudent', JSON.stringify(data.user));
        fetchAttendance(data.user);
      } else {
        setErrorMsg('Invalid credentials for student portal.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message === 'API Error' || err.message === 'Failed to fetch'
        ? 'Server error. Please make sure the backend is running.'
        : 'Invalid ID or Password. Please check your credentials.');
    }
  };

  const getDaysInMonth = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getAttendanceForDate = (day) => {
    if (!studentInfo || attendanceRecords.length === 0) return null;
    const dateString = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dayRecords = attendanceRecords.filter(r => r.date === dateString);
    if (dayRecords.length === 0) return null;

    const id = studentInfo._id || studentInfo.id;
    const isAbsent = dayRecords.some(r => r.attendance?.[id] === 'Absent');
    return isAbsent ? 'Absent' : 'Present';
  };

  const changeMonth = (offset) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarDate(newDate);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdUpdateMsg({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setPwdUpdateMsg({ text: 'Passwords do not match!', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdUpdateMsg({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    try {
      const updatedStudent = { ...studentInfo, password: newPassword };
      const id = updatedStudent._id || updatedStudent.id;

      await api.students.update(id, updatedStudent);

      setStudentInfo(updatedStudent);
      sessionStorage.setItem('loggedInStudent', JSON.stringify(updatedStudent));

      setPwdUpdateMsg({ text: 'Password updated successfully!', type: 'success' });
      setTimeout(() => {
        setShowPwdModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPwdUpdateMsg({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      console.error('Password update error:', err);
      setPwdUpdateMsg({ text: `Failed to update password: ${err.message || 'Server error'}`, type: 'error' });
    }
  };

  const generateBrandedPDF = async () => {
    if (!studentInfo) return;

    try {
      const doc = new jsPDF();
      const studentId = studentInfo._id || studentInfo.id;
      const myRecords = [...attendanceRecords].sort((a,b) => new Date(b.date) - new Date(a.date));
      const presentCount = myRecords.filter(r => r.attendance?.[studentId] === 'Present').length;
      const absentCount = myRecords.filter(r => r.attendance?.[studentId] === 'Absent').length;
      const totalCount = myRecords.length;
      const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

      // Header Canvas
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
          ctx.fillText('and Approved Under Section 2(f) \u0026 12 (B) of UGC)', 360, 230);
          ctx.fillStyle = '#8a2c20';
          ctx.fillRect(360, 260, 1200, 4);
          ctx.fillStyle = '#333';
          ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
          ctx.fillText(`STUDENT ATTENDANCE REPORT`, 360, 310);
          resolve(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = () => resolve(null);
      });

      if (headerImg) doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 55);

      doc.setFillColor(248, 249, 250);
      doc.rect(15, 60, 180, 30, 'F');
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.text(`Student: ${studentInfo.fullName}`, 20, 70);
      doc.text(`Course: ${studentInfo.course}`, 20, 78);
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(`Roll No: ${studentInfo.enrollmentNumber} | Semester: ${studentInfo.semester}`, 20, 85);

      doc.text(`Present: ${presentCount}`, 70, 95);
      doc.setTextColor(231, 76, 60);
      doc.text(`Absent: ${absentCount}`, 120, 95);
      doc.setTextColor(138, 44, 32);
      doc.text(`Overall Attendance: ${percentage}%`, 160, 95);

      const historyData = myRecords.map(r => [
        r.date,
        r.subject || 'N/A',
        r.teacherName || 'N/A',
        r.attendance[studentId]
      ]);

      autoTable(doc, {
        head: [['Date', 'Subject', 'Teacher', 'Status']],
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

      doc.save(`attendance_record_${studentInfo.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF report.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('loggedInStudent');
    setIsLoggedIn(false);
    setStudentInfo(null);
    navigate('/');
  };

  if (isLoggedIn && studentInfo) {
    const id = studentInfo._id || studentInfo.id;
    const present = attendanceRecords.filter(r => r.attendance?.[id] === 'Present').length;
    const absent = attendanceRecords.filter(r => r.attendance?.[id] === 'Absent').length;
    
    return (
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
        <div className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={studentInfo.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo.fullName || 'Student')}\u0026background=8a2c20\u0026color=fff`}
                alt="Profile"
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #8a2c20', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              />
            </div>
            <div>
              <h1 style={{ color: '#8a2c20', fontSize: '2.2rem', margin: 0 }}>{studentInfo.course} Dashboard</h1>
              <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Student: {studentInfo.fullName}</p>
            </div>
          </div>
          <div className="admin-actions">
            <button
              onClick={() => setShowPwdModal(true)}
              style={{ padding: '12px 25px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Change Password
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '12px 25px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="admin-tabs" style={{ marginTop: '30px', marginBottom: '30px' }}>
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Profile</button>
          <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>Attendance Calendar</button>
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>History & PDF</button>
        </div>

        {activeTab === 'profile' && (
          <div className="admin-card fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              <div style={{ padding: '20px', background: '#fcfcfc', borderRadius: '12px' }}>
                <h3 style={{ color: '#8a2c20', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Personal Details</h3>
                <div style={{ marginTop: '15px' }}>
                  <p><strong>Full Name:</strong> {studentInfo.fullName}</p>
                  <p><strong>Email:</strong> {studentInfo.email}</p>
                  <p><strong>Contact:</strong> {studentInfo.phone}</p>
                  <p><strong>Gender:</strong> {studentInfo.gender}</p>
                  <p><strong>DOB:</strong> {studentInfo.dob}</p>
                </div>
              </div>
              <div style={{ padding: '20px', background: '#fcfcfc', borderRadius: '12px' }}>
                <h3 style={{ color: '#8a2c20', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Academic Info</h3>
                <div style={{ marginTop: '15px' }}>
                  <p><strong>Course:</strong> {studentInfo.course}</p>
                  <p><strong>Semester:</strong> {studentInfo.semester}</p>
                  <p><strong>Roll No:</strong> {studentInfo.enrollmentNumber}</p>
                  <p><strong>Username:</strong> {studentInfo.username}</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <h3 style={{ color: '#8a2c20', marginBottom: '20px' }}>Attendance Overview</h3>
              <div className="summary-cards">
                <div style={{ background: '#fff59d', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '1.5rem', background: 'white', padding: '10px', borderRadius: '10px' }}>🎓</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{attendanceRecords.length}</div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Total Classes</div>
                  </div>
                </div>
                <div style={{ background: '#a5d6a7', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '1.5rem', background: 'white', padding: '10px', borderRadius: '10px' }}>✅</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>{present}</div>
                    <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: '600' }}>Present</div>
                  </div>
                </div>
                <div style={{ background: '#ef9a9a', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '1.5rem', background: 'white', padding: '10px', borderRadius: '10px' }}>☹️</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>{absent}</div>
                    <div style={{ fontSize: '12px', color: '#c62828', fontWeight: '600' }}>Absent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="admin-card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: '#8a2c20', margin: 0 }}>
                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => changeMonth(-1)} className="btn-secondary" style={{ padding: '8px 15px' }}>Previous</button>
                <button onClick={() => changeMonth(1)} className="btn-secondary" style={{ padding: '8px 15px' }}>Next</button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ fontWeight: 'bold', padding: '10px', background: '#eee', borderRadius: '5px' }}>{day}</div>
              ))}
              
              {(() => {
                const { firstDay, daysInMonth } = getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth());
                const slots = [];
                for (let i = 0; i < firstDay; i++) slots.push(<div key={`empty-${i}`} />);
                for (let day = 1; day <= daysInMonth; day++) {
                  const status = getAttendanceForDate(day);
                  slots.push(
                    <div
                      key={day}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        background: status === 'Present' ? '#a5d6a7' : status === 'Absent' ? '#ef9a9a' : '#f5f5f5',
                        color: status ? 'white' : '#333',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      {day}
                      {status && <div style={{ fontSize: '10px' }}>{status}</div>}
                    </div>
                  );
                }
                return slots;
              })()}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="admin-card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: '#8a2c20', margin: 0 }}>Attendance Log</h2>
              <button onClick={generateBrandedPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 Download Detailed Report
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#8a2c20', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Subject</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Teacher</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => (
                    <tr key={r._id || r.id}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>{r.date}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>{r.subject || 'N/A'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>{r.teacherName || 'N/A'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', color: r.attendance?.[id] === 'Present' ? '#2e7d32' : '#c62828' }}>
                        {r.attendance?.[id]}
                      </td>
                    </tr>
                  ))}
                  {attendanceRecords.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No attendance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPwdModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <h2 style={{ color: '#8a2c20', marginBottom: '20px' }}>Update Password</h2>
              {pwdUpdateMsg.text && (
                <div className={`message ${pwdUpdateMsg.type}`} style={{ marginBottom: '15px' }}>
                  {pwdUpdateMsg.text}
                </div>
              )}
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Update</button>
                  <button type="button" onClick={() => setShowPwdModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/IMAGES/mrsptu.webp") center/cover no-repeat fixed' }}>
      <div className="form-box" style={{ maxWidth: '400px', width: '100%', background: 'rgba(255, 255, 255, 0.95)', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#8a2c20', fontSize: '2rem', marginBottom: '10px' }}>Student Login</h1>
          <p style={{ color: '#666' }}>Enter your credentials to access services</p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid #ffcdd2' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>User ID / Username</label>
            <input
              name="id"
              type="text"
              placeholder="e.g. john1234"
              value={loginData.id}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Password</label>
            <input
              name="pwd"
              type="password"
              placeholder="••••••••"
              value={loginData.pwd}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px', backgroundColor: '#8a2c20', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.3s' }}
          >
            Login
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
          <p>Don't have your credentials? Contact your department administrator.</p>
        </div>
      </div>
    </div>
  );
}

export default StudentService;
