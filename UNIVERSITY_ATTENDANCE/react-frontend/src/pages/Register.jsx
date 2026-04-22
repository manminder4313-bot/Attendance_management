import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    email: '',
    contact: '',
    fullName: '',
    profilePhoto: ''
  });
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    let aData;
    try {
      aData = JSON.parse(localStorage.getItem('adminCredentials'));
    } catch(err) {}

    if (!aData) aData = [];
    else if (!Array.isArray(aData)) aData = [aData];

    const newAdmin = {
      ...formData,
      uuid: Date.now(),
      submissionDate: new Date().toLocaleString()
    };

    aData.push(newAdmin);

    localStorage.setItem('adminCredentials', JSON.stringify(aData));
    setMsg('Admin account created successfully! Redirecting to login...');
    setTimeout(() => navigate('/login'), 2000);
  };

  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  };

  const handleChange = (e) => {
    if (e.target.name === 'profilePhoto') {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, (compressedData) => {
          setFormData({ ...formData, profilePhoto: compressedData });
        });
      }
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  return (
    <div className="auth-container">
      <div className="form-box">
        <h1>Setup Admin Account</h1>
        {msg && <div className="message success">{msg}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input name="fullName" type="text" placeholder="Admin Full Name" onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Profile Photo</label>
            <input name="profilePhoto" type="file" accept="image/*" onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>New Admin ID</label>
            <input name="id" type="text" placeholder="Create Username" onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input name="password" type="password" placeholder="Create Password" onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" placeholder="admin@example.com" onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input name="contact" type="tel" placeholder="+91 XXX-XXX-XXXX" onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-primary" style={{ background: 'var(--success)' }}>Create Account</button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login here</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
