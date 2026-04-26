import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function FormDepartment() {
  const [formData, setFormData] = useState({
    headName: '',
    email: '',
    phone: '',
    department: 'Select Department',
    profilePhoto: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const username = (formData.department.replace(/\s+/g, '').toLowerCase() + formData.phone.slice(-4)).replace(/[^a-z0-9]/g, '');
      const password = Math.random().toString(36).slice(-8);

      const departmentData = {
        ...formData,
        username,
        password
      };

      await api.departments.create(departmentData);

      alert(`Success! Department account created for ${formData.department}.\n\n[ADMIN BACKUP]\nUsername: ${username}\nPassword: ${password}`);
      navigate('/admin');
    } catch (err) {
      alert('Error saving department: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: 'url("/IMAGES/mrsptu.webp") cover center no-repeat', attachment: 'fixed' }}>
      <div className="form-box" style={{ maxWidth: '900px', background: 'rgba(255, 255, 255, 0.95)' }}>
        <h1>Department Registration Form</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>Create a new department login and details</p>

        <form onSubmit={handleSubmit}>
          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Head of Department (HOD) Details</h2>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>HOD Full Name</label>
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
              <select name="department" onChange={handleChange} required>
                <option value="">Select Department</option>
                <option>Mathematics</option>
                <option>Computer Science</option>
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Biology</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
                <option>Electrical Engineering</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Department Logo / HOD Photo</label>
              <input name="profilePhoto" type="file" accept="image/*" onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {formData.profilePhoto && <img src={formData.profilePhoto} alt="Profile Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Department...' : 'Register Department'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FormDepartment;
