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
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pwd })
      });

      if (response.ok) {
        const data = await response.json();
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
        }
      } else {
        setErrorMsg('Invalid credentials. Please check your ID and Password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Server error. Please make sure the backend is running.');
    }
  };

  return (
    <div className="auth-container">
      <div className="form-box">
        <h1>Department Login</h1>
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
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              required 
            />
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
