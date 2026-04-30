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
  const [showPwd, setShowPwd] = useState(false);

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
        sessionStorage.setItem('loggedInStudent', JSON.stringify(data.user));
        navigate('/student-dashboard');
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
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#8a2c20' }}>Redirecting to modern dashboard...</h2>
          <button 
            onClick={() => navigate('/student-dashboard')}
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#8a2c20', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
        </div>
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
          <div className="form-group" style={{ marginBottom: '30px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                name="pwd"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={loginData.pwd}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '12px', paddingRight: '45px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <span 
                onClick={() => setShowPwd(!showPwd)}
                style={{ 
                  position: 'absolute', 
                  right: '15px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  cursor: 'pointer', 
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPwd ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </span>
            </div>
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
