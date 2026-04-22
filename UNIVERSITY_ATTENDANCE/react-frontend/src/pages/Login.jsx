import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [id, setId] = useState('');
  const [pwd, setPwd] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Reset Password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetData, setResetData] = useState({ id: '', email: '', newPwd: '', confirmPwd: '' });
  const [resetMsg, setResetMsg] = useState({ text: '', type: '' });

  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('adminCredentials')) {
      localStorage.setItem('adminCredentials', JSON.stringify([{
        id: 'admin',
        password: 'admin@1234',
        email: 'admin@mrsptu.ac.in',
        contact: '+91-1644-239205',
        fullName: 'System Administrator',
        submissionDate: new Date().toLocaleString()
      }]));
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    
    // 1. Check Admin Credentials
    let adminCreds = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('adminCredentials'));
      if (parsed) adminCreds = Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      console.error('Error parsing adminCredentials:', err);
    }

    const foundAdmin = adminCreds.find(a => a.id === id && a.password === pwd);
    if (foundAdmin) {
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      sessionStorage.setItem('loggedInAdmin', JSON.stringify(foundAdmin));
      navigate('/admin');
      return;
    }

    // 2. Check Teacher Credentials
    let teachers = [];
    try {
      teachers = JSON.parse(localStorage.getItem('teacherSubmissions')) || [];
    } catch(err) {
      console.error('Error parsing teacherSubmissions:', err);
    }

    const foundTeacher = teachers.find(t => t.username === id && t.password === pwd);
    if (foundTeacher) {
      sessionStorage.setItem('loggedInTeacher', JSON.stringify(foundTeacher));
      navigate('/teacher-profile');
      return;
    }

    // 3. Check Department Credentials
    let departments = [];
    try {
      departments = JSON.parse(localStorage.getItem('departmentSubmissions')) || [];
    } catch(err) {
      console.error('Error parsing departmentSubmissions:', err);
    }

    const foundDept = departments.find(d => d.username === id && d.password === pwd);
    if (foundDept) {
      sessionStorage.setItem('isDepartmentLoggedIn', 'true');
      sessionStorage.setItem('loggedInDepartment', JSON.stringify(foundDept));
      navigate('/admin');
      return;
    }

    // 4. Invalid credentials
    setErrorMsg('Invalid credentials. Please check your ID and Password.');
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setResetMsg({ text: '', type: '' });

    if (resetData.newPwd !== resetData.confirmPwd) {
      setResetMsg({ text: 'Passwords do not match!', type: 'error' });
      return;
    }

    // Find user across all types
    let userType = '';
    let foundUser = null;

    // Check Admins
    let admins = JSON.parse(localStorage.getItem('adminCredentials')) || [];
    if (!Array.isArray(admins)) admins = [admins];
    foundUser = admins.find(a => a.id === resetData.id && a.email === resetData.email);
    if (foundUser) userType = 'admin';

    // Check Teachers
    if (!foundUser) {
      let teachers = JSON.parse(localStorage.getItem('teacherSubmissions')) || [];
      foundUser = teachers.find(t => t.username === resetData.id && t.email === resetData.email);
      if (foundUser) userType = 'teacher';
    }

    // Check Departments
    if (!foundUser) {
      let depts = JSON.parse(localStorage.getItem('departmentSubmissions')) || [];
      foundUser = depts.find(d => d.username === resetData.id && d.email === resetData.email);
      if (foundUser) userType = 'department';
    }

    if (!foundUser) {
      setResetMsg({ text: 'User ID or Email not found.', type: 'error' });
      return;
    }

    // Update password
    if (userType === 'admin') {
      const updated = admins.map(a => (a.id === resetData.id ? { ...a, password: resetData.newPwd } : a));
      localStorage.setItem('adminCredentials', JSON.stringify(updated));
    } else if (userType === 'teacher') {
      let teachers = JSON.parse(localStorage.getItem('teacherSubmissions')) || [];
      const updated = teachers.map(t => (t.username === resetData.id ? { ...t, password: resetData.newPwd } : t));
      localStorage.setItem('teacherSubmissions', JSON.stringify(updated));
    } else if (userType === 'department') {
      let depts = JSON.parse(localStorage.getItem('departmentSubmissions')) || [];
      const updated = depts.map(d => (d.username === resetData.id ? { ...d, password: resetData.newPwd } : d));
      localStorage.setItem('departmentSubmissions', JSON.stringify(updated));
    }

    setResetMsg({ text: 'Password updated successfully! You can now login.', type: 'success' });
    setTimeout(() => {
      setShowResetModal(false);
      setResetData({ id: '', email: '', newPwd: '', confirmPwd: '' });
      setResetMsg({ text: '', type: '' });
    }, 2000);
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

        <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--gray-border)', fontSize: '13px', color: 'var(--text-light)', textAlign: 'center' }}>
          <p>Admin Support: admin@mrsptu.ac.in</p>
          <p>Contact: +91-1644-239205</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
