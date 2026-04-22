import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function StudentService() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loginData, setLoginData] = useState({ id: '', pwd: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Password change states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdateMsg, setPwdUpdateMsg] = useState({ text: '', type: '' });

  const navigate = useNavigate();

  useEffect(() => {
    const savedStudent = sessionStorage.getItem('loggedInStudent');
    if (savedStudent) {
      setStudentInfo(JSON.parse(savedStudent));
      setIsLoggedIn(true);
    }
  }, []);

  const handleInputChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const submissions = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
      const student = submissions.find(s => s.username === loginData.id && s.password === loginData.pwd);

      if (student) {
        setStudentInfo(student);
        setIsLoggedIn(true);
        sessionStorage.setItem('loggedInStudent', JSON.stringify(student));
      } else {
        setErrorMsg('Invalid User ID or Password. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('An error occurred during login. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStudentInfo(null);
    setLoginData({ id: '', pwd: '' });
    sessionStorage.removeItem('loggedInStudent');
  };

  // Calendar Helper Functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getAttendanceForDate = (day) => {
    if (!studentInfo) return null;
    const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const dateString = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Filter records for this specific student and date
    const dayRecords = allRecords.filter(r => r.date === dateString && r.attendance?.[studentInfo.id]);

    if (dayRecords.length === 0) return null;

    // Logic: If any record for the day is 'Absent', the whole day is marked 'Absent'
    const isAbsent = dayRecords.some(r => r.attendance?.[studentInfo.id] === 'Absent');
    return isAbsent ? 'Absent' : 'Present';
  };

  const changeMonth = (offset) => {
    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
    setCalendarDate(newDate);
  };

  const handlePasswordChange = (e) => {
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

      // Update in localStorage
      const submissions = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
      const updatedSubmissions = submissions.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      localStorage.setItem('studentSubmissions', JSON.stringify(updatedSubmissions));

      // Update in sessionStorage
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
      setPwdUpdateMsg({ text: 'Failed to update password. Please try again.', type: 'error' });
    }
  };

  const generateBrandedPDF = async () => {
    if (!studentInfo) return;

    const doc = new jsPDF();
    const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const myRecords = allRecords.filter(r => r.attendance?.[studentInfo.id]).sort((a,b) => b.id - a.id);
    const presentCount = myRecords.filter(r => r.attendance?.[studentInfo.id] === 'Present').length;
    const absentCount = myRecords.filter(r => r.attendance?.[studentInfo.id] === 'Absent').length;
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
        ctx.fillText('and Approved Under Section 2(f) & 12 (B) of UGC)', 360, 230);
        ctx.fillStyle = '#8a2c20';
        ctx.fillRect(360, 260, 1200, 4);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`STUDENT ATTENDANCE RECORD`, 360, 310);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 55);
    
    // Student Info Box
    doc.setFillColor(248, 249, 250);
    doc.rect(15, 60, 180, 25, 'F');
    doc.setFontSize(12);
    doc.setFont("Helvetica", "bold");
    doc.text(studentInfo.fullName, 20, 70);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Roll No: ${studentInfo.enrollmentNumber} | Course: ${studentInfo.course} | Sem: ${studentInfo.semester}`, 20, 78);
    
    // Stats
    doc.text(`Total Sessions: ${totalCount}`, 20, 95);
    doc.setTextColor(39, 174, 96);
    doc.text(`Present: ${presentCount}`, 70, 95);
    doc.setTextColor(231, 76, 60);
    doc.text(`Absent: ${absentCount}`, 120, 95);
    doc.setTextColor(138, 44, 32);
    doc.text(`Overall Attendance: ${percentage}%`, 160, 95);

    const historyData = myRecords.map(r => [
      r.dateDisplay,
      r.subject,
      r.teacherName,
      r.attendance[studentInfo.id]
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
  };

  if (isLoggedIn && studentInfo) {
    return (
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={studentInfo.profilePhoto || '/IMAGES/default-avatar.png'}
                alt="Profile"
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #8a2c20', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              />
            </div>
            <div>
              <h1 style={{ color: '#8a2c20', fontSize: '2.2rem', margin: 0 }}>{studentInfo.course} Dashboard</h1>
              <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Student: {studentInfo.fullName}</p>
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
            Personal Profile
          </button>
          <button
            onClick={() => setActiveTab('academic')}
            style={{
              padding: '12px 25px', border: 'none', background: 'none',
              borderBottom: activeTab === 'academic' ? '3px solid #8a2c20' : 'none',
              color: activeTab === 'academic' ? '#8a2c20' : '#666',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s'
            }}
          >
            Academic Info
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '12px 25px', border: 'none', background: 'none',
              borderBottom: activeTab === 'attendance' ? '3px solid #8a2c20' : 'none',
              color: activeTab === 'attendance' ? '#8a2c20' : '#666',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s'
            }}
          >
            Attendance
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ background: 'white', padding: '35px', borderRadius: '15px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          {activeTab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
              <div>
                <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Contact Information</h3>
                <p><strong>Email:</strong> {studentInfo.email}</p>
                <p><strong>Phone:</strong> {studentInfo.phone}</p>
                <p><strong>Address:</strong> Not provided</p>
              </div>
              <div>
                <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Other Details</h3>
                <p><strong>Gender:</strong> {studentInfo.gender}</p>
                <p><strong>Date of Birth:</strong> {studentInfo.dob}</p>
                <p><strong>Registration Date:</strong> {studentInfo.submissionDate}</p>
                <p><strong>Username:</strong> {studentInfo.username}</p>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
              <div>
                <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Enrollment Details</h3>
                <p><strong>Roll/Enrollment No:</strong> {studentInfo.enrollmentNumber}</p>
                <p><strong>Course:</strong> {studentInfo.course}</p>
                <p><strong>Semester:</strong> {studentInfo.semester}</p>
              </div>
              <div>
                <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Academic Records</h3>
                <p><strong>Current GPA:</strong> N/A</p>
                <p><strong>Backlogs:</strong> Nil</p>
                <p><strong>Credits Earned:</strong> 0</p>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) 1fr', gap: '30px' }}>
              {/* Print Only Styles */}
              <style>
                {`
                  #printable-report { display: none; }
                  @media print {
                    body * { visibility: hidden; }
                    #printable-report, #printable-report * { visibility: visible !important; display: block !important; }
                    #printable-report { 
                      position: absolute; 
                      left: 0; 
                      top: 0; 
                      width: 100%; 
                      padding: 20px;
                      background: white !important;
                      visibility: visible !important;
                      display: block !important;
                    }
                    .no-print { display: none !important; }
                  }
                `}
              </style>

              {/* Left Column: Details & Stats */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 style={{ color: '#8a2c20', margin: 0 }}>My Attendance Record</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={generateBrandedPDF}
                      style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      Download Report (PDF)
                    </button>
                  </div>
                </div>

                {/* Summary Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
                  {(() => {
                    const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                    const myRecords = allRecords.filter(r => r.attendance?.[studentInfo.id]);
                    const present = myRecords.filter(r => r.attendance?.[studentInfo.id] === 'Present').length;
                    const absent = myRecords.filter(r => r.attendance?.[studentInfo.id] === 'Absent').length;

                    return (
                      <>
                        <div style={{ background: '#fff59d', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                          <div style={{ fontSize: '1.5rem', background: 'white', padding: '10px', borderRadius: '10px' }}>🎓</div>
                          <div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{myRecords.length}</div>
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
                      </>
                    );
                  })()}
                </div>

                {/* Detailed Records Table */}
                <div style={{ background: '#fcfcfc', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', background: '#f8f9fa' }}>
                        <th style={{ padding: '12px', fontSize: '13px', color: '#666', borderBottom: '2px solid #eee' }}>Date</th>
                        <th style={{ padding: '12px', fontSize: '13px', color: '#666', borderBottom: '2px solid #eee' }}>Subject</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666', borderBottom: '2px solid #eee' }}>Present</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666', borderBottom: '2px solid #eee' }}>Absent</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666', borderBottom: '2px solid #eee' }}>Leave</th>
                        <th style={{ padding: '12px', fontSize: '13px', color: '#666', borderBottom: '2px solid #eee' }}>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                        const myRecords = allRecords
                          .filter(r => r.attendance[studentInfo.id])
                          .sort((a, b) => b.id - a.id);

                        if (myRecords.length === 0) {
                          return <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No daily records found.</td></tr>;
                        }

                        return myRecords.map(record => {
                          const status = record.attendance?.[studentInfo.id];
                          return (
                            <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500 }}>{record.dateDisplay}</td>
                              <td style={{ padding: '12px', fontSize: '14px' }}>{record.subject}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #ddd', margin: '0 auto', background: status === 'Present' ? '#27ae60' : '#f0f0f0' }}></div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #ddd', margin: '0 auto', background: status === 'Absent' ? '#c62828' : '#f0f0f0' }}></div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #ddd', margin: '0 auto', background: '#f0f0f0' }}></div>
                              </td>
                              <td style={{ padding: '12px', fontSize: '12px', color: '#999' }}>Note</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Sidebar (Calendar) */}
              <div>
                <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #eee', padding: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontWeight: 'bold' }}>{calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}</span>
                    <div>
                      <span onClick={() => changeMonth(-1)} style={{ cursor: 'pointer', marginRight: '15px', fontSize: '18px', color: '#8a2c20', fontWeight: 'bold' }}>&lt;</span>
                      <span onClick={() => changeMonth(1)} style={{ cursor: 'pointer', fontSize: '18px', color: '#8a2c20', fontWeight: 'bold' }}>&gt;</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', fontSize: '12px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ color: '#999', paddingBottom: '10px', fontWeight: 'bold' }}>{d}</div>)}
                    {(() => {
                      const { firstDay, daysInMonth } = getDaysInMonth(calendarDate);
                      const cells = [];

                      // Padding for first week
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`}></div>);
                      }

                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const status = getAttendanceForDate(day);
                        const isToday = day === new Date().getDate() &&
                          calendarDate.getMonth() === new Date().getMonth() &&
                          calendarDate.getFullYear() === new Date().getFullYear();

                        let bgColor = 'transparent';
                        let textColor = '#333';
                        let border = 'none';

                        if (status === 'Present') {
                          bgColor = '#27ae60';
                          textColor = 'white';
                        } else if (status === 'Absent') {
                          bgColor = '#c62828';
                          textColor = 'white';
                        }

                        if (isToday && !status) {
                          border = '2px solid #8a2c20';
                        }

                        cells.push(
                          <div key={day} style={{
                            padding: '8px 0',
                            borderRadius: '50%',
                            background: bgColor,
                            color: textColor,
                            fontWeight: (isToday || status) ? 'bold' : 'normal',
                            border: border,
                            cursor: 'default',
                            transition: 'all 0.2s',
                            fontSize: '13px'
                          }}>
                            {day}
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>

                <div style={{ marginTop: '20px', background: 'white', border: '1px solid #eee', padding: '15px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8a2c20' }}>Legend</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27ae60' }}></div> Present
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#c62828' }}></div> Absent
                  </div>
                </div>
              </div>

              {/* HIDDEN PRINTABLE REPORT */}
              <div id="printable-report">
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 280px', alignItems: 'center', gap: '0', borderBottom: '3px solid #8a2c20', padding: '10px 0', margin: '0 0 20px 0', minHeight: '100px' }}>
                  {/* Left: Logo */}
                  <div style={{ textAlign: 'left' }}>
                    <img src="/IMAGES/logo.webp" alt="University Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                  </div>

                  {/* Center: University Name & Legal */}
                  <div style={{ textAlign: 'center' }}>
                    <h1 style={{ color: '#8a2c20', margin: '0', fontSize: '20px', fontWeight: 'bold', fontFamily: '"Segoe UI", Arial, sans-serif' }}>ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ</h1>
                    <h2 style={{ color: '#8a2c20', margin: '2px 0 0 0', fontSize: '18px', fontWeight: 'bold', fontFamily: '"Segoe UI", Arial, sans-serif' }}>Maharaja Ranjit Singh Punjab Technical University, BATHINDA</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#555', fontWeight: '600', lineHeight: '1.4' }}>
                      (A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015 <br />
                      and Approved Under Section 2(f) & 12 (B) of UGC)
                    </p>
                  </div>

                  {/* Right: Contact Info / Campus */}
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#333' }}>
                    <p style={{ margin: '0' }}>
                      <strong style={{ color: '#8a2c20' }}>Contact:</strong> +91-1644-239205
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong style={{ color: '#8a2c20' }}>Email:</strong> info@mrsptu.ac.in
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#333', fontSize: '10px' }}>
                      STUDENT ATTENDANCE RECORD
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '40px', marginBottom: '40px', padding: '25px', background: '#fff', border: '1px solid #ddd', borderRadius: '15px', alignItems: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={studentInfo.profilePhoto || '/IMAGES/default-avatar.png'}
                      alt="Student"
                      style={{ width: '70px', height: '70px', borderRadius: '15px', objectFit: 'cover', border: '3px solid #8a2c20', padding: '3px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#8a2c20', borderBottom: '1px solid #eee' }}>Student Profile</h4>
                      <p style={{ margin: '8px 0' }}><strong>Full Name:</strong><br /> {studentInfo.fullName}</p>
                      <p style={{ margin: '8px 0' }}><strong>Enrollment No:</strong><br /> {studentInfo.enrollmentNumber}</p>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#8a2c20', borderBottom: '1px solid #eee' }}>Program Details</h4>
                      <p style={{ margin: '8px 0' }}><strong>Degree/Course:</strong><br /> {studentInfo.course}</p>
                      <p style={{ margin: '8px 0' }}><strong>Current Semester:</strong><br /> {studentInfo.semester}</p>
                      <p style={{ margin: '8px 0' }}><strong>Report Date:</strong><br /> {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Teaching Faculty Directory</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ background: '#f4f4f4', border: '2px solid #333' }}>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'left' }}>Subject Name</th>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'left' }}>Assigned Professor</th>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'left' }}>Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allRecs = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                        const allTeachers = JSON.parse(localStorage.getItem('teacherSubmissions')) || [];
                        const facultyMap = {};

                        // 1. Get from existing records
                        allRecs.forEach(r => {
                          if (r.attendance[studentInfo.id]) {
                            facultyMap[r.subject] = { name: r.teacherName, dept: r.department || 'N/A' };
                          }
                        });

                        // 2. Supplement from teacher database for current course
                        allTeachers.forEach(t => {
                          if (t.department?.toLowerCase() === studentInfo.course?.toLowerCase() ||
                            t.primarySubject?.toLowerCase().includes(studentInfo.course?.toLowerCase())) {
                            if (!facultyMap[t.primarySubject]) {
                              facultyMap[t.primarySubject] = { name: t.fullName, dept: t.department };
                            }
                          }
                        });

                        const subjects = Object.keys(facultyMap);
                        return subjects.length > 0 ? subjects.map(s => (
                          <tr key={s}>
                            <td style={{ border: '1px solid #333', padding: '10px' }}>{s}</td>
                            <td style={{ border: '1px solid #333', padding: '10px' }}>Prof. {facultyMap[s].name}</td>
                            <td style={{ border: '1px solid #333', padding: '10px' }}>{facultyMap[s].dept}</td>
                          </tr>
                        )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '10px' }}>No faculty data available.</td></tr>;
                      })()}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Detailed Attendance History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ background: '#f4f4f4', border: '2px solid #333' }}>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'left' }}>Date</th>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'left' }}>Subject</th>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'left' }}>Teacher</th>
                        <th style={{ border: '2px solid #333', padding: '10px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allRecs = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                        const myRecs = allRecs.filter(r => r.attendance[studentInfo.id]).sort((a, b) => b.id - a.id);
                        return myRecs.map(r => (
                          <tr key={r.id}>
                            <td style={{ border: '1px solid #333', padding: '10px' }}>{r.dateDisplay}</td>
                            <td style={{ border: '1px solid #333', padding: '10px' }}>{r.subject}</td>
                            <td style={{ border: '1px solid #333', padding: '10px' }}>Prof. {r.teacherName}</td>
                            <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center', color: r.attendance[studentInfo.id] === 'Present' ? '#27ae60' : '#c62828', fontWeight: 'bold' }}>
                              {r.attendance[studentInfo.id]}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'right', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                  {(() => {
                    const allRecs = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                    const myRecs = allRecs.filter(r => r.attendance[studentInfo.id]);
                    const pres = myRecs.filter(r => r.attendance[studentInfo.id] === 'Present').length;
                    const per = myRecs.length > 0 ? ((pres / myRecs.length) * 100).toFixed(1) : 0;
                    return (
                      <div>
                        <p style={{ margin: '5px 0' }}>Total Lectures: {myRecs.length}</p>
                        <p style={{ margin: '5px 0' }}>Total Attended: {pres}</p>
                        <h3 style={{ margin: '10px 0', color: '#8a2c20' }}>Overall Attendance: {per}%</h3>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #333', width: '150px', marginTop: '20px' }}></div>
                    <p style={{ fontSize: '12px' }}>Student Signature</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #333', width: '150px', marginTop: '20px' }}></div>
                    <p style={{ fontSize: '12px' }}>Department Head</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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

        {/* Hidden Printable Report Section */}
        <div id="printable-report" style={{ display: 'none' }}>
          <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #8a2c20', paddingBottom: '20px' }}>
              <h1 style={{ color: '#8a2c20', margin: '0', fontSize: '28px' }}>MRSPTU - Academic Progress Report</h1>
              <p style={{ margin: '5px 0', color: '#666' }}>Official Student Attendance Record</p>
            </div>

            <div style={{ display: 'flex', gap: '40px', marginBottom: '30px', background: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
              <img src={studentInfo.profilePhoto || '/IMAGES/default-avatar.png'} style={{ width: '100px', height: '100px', borderRadius: '10px', objectFit: 'cover' }} alt="S" />
              <div>
                <h2 style={{ margin: '0 0 10px 0' }}>{studentInfo.fullName}</h2>
                <p style={{ margin: '2px 0' }}><strong>Enrollment:</strong> {studentInfo.enrollmentNumber}</p>
                <p style={{ margin: '2px 0' }}><strong>Course:</strong> {studentInfo.course}</p>
                <p style={{ margin: '2px 0' }}><strong>Semester:</strong> {studentInfo.semester}</p>
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Detailed Attendance Log</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Subject</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                  return allRecords
                    .filter(r => r.attendance?.[studentInfo.id])
                    .sort((a, b) => b.id - a.id)
                    .map(r => (
                      <tr key={r.id}>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.dateDisplay}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.subject}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', color: r.attendance?.[studentInfo.id] === 'Present' ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
                          {r.attendance?.[studentInfo.id]}
                        </td>
                      </tr>
                    ));
                })()}
              </tbody>
            </table>

            <div style={{ marginTop: '50px', textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: '#999' }}>Report Generated on: {new Date().toLocaleString()}</p>
            </div>
          </div>
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
