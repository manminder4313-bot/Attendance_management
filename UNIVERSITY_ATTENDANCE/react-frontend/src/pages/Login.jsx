import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [id, setId] = useState('');
  const [pwd, setPwd] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Reset Password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetData, setResetData] = useState({ id: '', email: '', newPwd: '', confirmPwd: '' });
  const [resetMsg, setResetMsg] = useState({ text: '', type: '' });

  const navigate = useNavigate();

  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    // Check if there is data to migrate
    const keys = ['teacherSubmissions', 'studentSubmissions', 'attendanceRecords', 'departmentSubmissions'];
    const hasData = keys.some(key => localStorage.getItem(key));
    setHasLocalData(hasData);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const dataToSync = {
        teachers: JSON.parse(localStorage.getItem('teacherSubmissions')) || [],
        students: JSON.parse(localStorage.getItem('studentSubmissions')) || [],
        attendance: JSON.parse(localStorage.getItem('attendanceRecords')) || [],
        departments: JSON.parse(localStorage.getItem('departmentSubmissions')) || [],
        admins: JSON.parse(localStorage.getItem('adminCredentials')) || [],
      };

      for (const [type, data] of Object.entries(dataToSync)) {
        if (data.length > 0) {
          await api.sync(type, data);
        }
      }

      // Clear local storage after successful sync
      ['teacherSubmissions', 'studentSubmissions', 'attendanceRecords', 'departmentSubmissions', 'adminCredentials'].forEach(key => {
        localStorage.removeItem(key);
      });

      setHasLocalData(false);
      alert('Data successfully migrated to MongoDB!');
    } catch (err) {
      console.error('Migration failed:', err);
      alert('Migration failed. Check console for details.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const data = await api.login(id, pwd);

      if (data.type === 'admin') {
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        sessionStorage.setItem('loggedInAdmin', JSON.stringify(data.user));
        navigate('/admin');
      } else if (data.type === 'teacher') {
        sessionStorage.setItem('loggedInTeacher', JSON.stringify(data.user));
        navigate('/teacher-profile');
      } else if (data.type === 'department') {
        sessionStorage.setItem('isDepartmentLoggedIn', 'true');
        sessionStorage.setItem('loggedInDepartment', JSON.stringify(data.user));
        navigate('/admin');
      } else if (data.type === 'clerk') {
        sessionStorage.setItem('isClerkLoggedIn', 'true');
        sessionStorage.setItem('loggedInClerk', JSON.stringify(data.user));
        navigate('/admin');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message === 'API Error' || err.message === 'Failed to fetch'
        ? 'Server error. Please make sure the backend is running.'
        : err.message || 'Invalid credentials. Please check your ID and Password.');
    }
  };

  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="auth-container no-bg">
      <div className="form-box">
        <h1>Admin Login</h1>
        <p className="subtitle">Admin & Teachers Portal</p>
        {errorMsg && <div className="message error">{errorMsg}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>User ID / Username</label>
            <input
              type="text"
              placeholder="Enter User ID or Username"
              value={id}
              onChange={e => setId(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Enter Password"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
                style={{ paddingRight: '45px' }}
              />
              <span 
                onClick={() => setShowPwd(!showPwd)}
                style={{ 
                  position: 'absolute', 
                  right: '15px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  cursor: 'pointer', 
                  fontSize: '20px',
                  color: '#666',
                  userSelect: 'none'
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
          <button type="submit" className="btn-primary">Login</button>
        </form>

        {hasLocalData && (
          <div className="sync-section" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '8px', border: '1px dashed #ff6b6b' }}>
            <p style={{ fontSize: '12px', marginBottom: '10px', color: '#ff6b6b' }}>
              <strong>Legacy Data Found!</strong> Click below to migrate your local data to MongoDB.
            </p>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
            >
              {isSyncing ? 'Migrating...' : '🚀 Sync to MongoDB'}
            </button>
          </div>
        )}

        <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--gray-border)', fontSize: '13px', color: 'var(--text-light)', textAlign: 'center' }}>
          <p>Admin Support: admin@mrsptu.ac.in</p>
          <p>Contact: +91-1644-239205</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
