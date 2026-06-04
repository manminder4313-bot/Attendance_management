import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { departments } from '../utils/departments';

function FormClerk() {
  const [formData, setFormData] = useState({
    headName: '',
    email: '',
    phone: '',
    department: 'Select Department',
    profilePhoto: '',
    role: 'clerk'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if HOD is logged in to autofill and lock department selection
  const isHODLoggedIn = sessionStorage.getItem('isDepartmentLoggedIn') === 'true';
  const roleDepartmentData = isHODLoggedIn ? JSON.parse(sessionStorage.getItem('loggedInDepartment')) : null;

  useEffect(() => {
    if (isHODLoggedIn && roleDepartmentData?.department) {
      setFormData(prev => ({ ...prev, department: roleDepartmentData.department }));
    }
  }, []);

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
        callback(canvas.toDataURL('image/jpeg', 0.7));
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
      let formattedValue = e.target.value;
      if (['headName', 'department'].includes(e.target.name) && formattedValue.length > 0) {
        formattedValue = formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1).toLowerCase();
      }
      setFormData({ ...formData, [e.target.name]: formattedValue });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const username = ('clerk_' + formData.department.replace(/\s+/g, '').toLowerCase() + formData.phone.slice(-4)).replace(/[^a-z0-9_]/g, '');
      const password = Math.random().toString(36).slice(-8);

      const clerkData = {
        ...formData,
        username,
        password
      };

      await api.departments.create(clerkData);

      alert(`Success! Clerk account created for ${formData.department}.\n\n[ADMIN BACKUP]\nUsername: ${username}\nPassword: ${password}`);
      
      e.target.reset();
      setFormData({
        headName: '',
        email: '',
        phone: '',
        department: 'Select Department',
        profilePhoto: '',
        role: 'clerk'
      });

      navigate('/admin');
    } catch (err) {
      alert('Error saving clerk: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="form-box" style={{ maxWidth: '900px' }}>
        <h1>Clerk Registration Form</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>Create a new department clerk login and details</p>

        <form onSubmit={handleSubmit}>
          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Clerk Details</h2>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Clerk Full Name</label>
              <input name="headName" type="text" placeholder="Enter full name" onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Email ID</label>
              <input name="email" type="email" placeholder="Enter email" onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Phone Number</label>
              <input name="phone" type="tel" placeholder="Enter phone number" onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Department Name</label>
              <select 
                name="department" 
                value={formData.department} 
                onChange={handleChange} 
                disabled={isHODLoggedIn}
                style={{ background: isHODLoggedIn ? '#f5f5f5' : 'white', cursor: isHODLoggedIn ? 'not-allowed' : 'pointer' }}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Clerk Photo</label>
              <input name="profilePhoto" type="file" accept="image/*" onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {formData.profilePhoto && <img src={formData.profilePhoto} alt="Profile Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Creating Clerk...' : 'Register Clerk'}
            </button>
            <button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                console.log("Navigating back to admin dashboard...");
                navigate('/admin');
              }} 
              style={{ 
                flex: 1, 
                background: '#555', 
                color: 'white', 
                border: 'none', 
                padding: '12px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#333'}
              onMouseOut={(e) => e.currentTarget.style.background = '#555'}
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormClerk;
