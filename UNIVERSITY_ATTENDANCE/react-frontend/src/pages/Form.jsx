import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import api from '../services/api';

function FormPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'Select gender',
    dob: '',
    qualification: '',
    experience: '',
    department: 'Select Department',
    primarySubject: 'Select subject',
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

    const username = (formData.fullName.split(' ')[0].toLowerCase() + formData.phone.slice(-4)).replace(/[^a-z0-9]/g, '');
    const password = Math.random().toString(36).slice(-8);

    const teacherData = {
      ...formData,
      username,
      password,
      submissionDate: new Date().toLocaleString()
    };

    try {
      // Save to MongoDB
      await api.teachers.create(teacherData);

      const templateParams = {
        teacher_name: formData.fullName,
        teacher_email: formData.email,
        username,
        password,
        admin_email: 'gmaan9964@gmail.com'
      };

      emailjs.init("knu1QdkOUOaYiTwFF");
      await emailjs.send('service_dosao84', 'service_dosao84', templateParams);
      
      alert(`Success! Account created for ${formData.fullName}.\n\nCredentials have been sent to: ${formData.email}`);
      navigate('/');
    } catch (err) {
      console.error('Submission failed:', err);
      alert(`Account created in DB, but email failed to send or server error.\n\n[BACKUP]\nUsername: ${username}\nPassword: ${password}`);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: 'url("/IMAGES/mrsptu.webp") cover center no-repeat', attachment: 'fixed' }}>
      <div className="form-box" style={{ maxWidth: '900px', background: 'rgba(255, 255, 255, 0.95)' }}>
        <h1>Teacher Details Form</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>Please fill all required information carefully</p>

        <form onSubmit={handleSubmit}>
          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Personal Information</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Full Name</label>
              <input name="fullName" type="text" placeholder="Enter full name" onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Email</label>
              <input name="email" type="email" placeholder="Enter email" onChange={handleChange} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Profile Photo</label>
              <input name="profilePhoto" type="file" accept="image/*" onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {formData.profilePhoto && <img src={formData.profilePhoto} alt="Profile Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Phone Number</label>
              <input name="phone" type="tel" placeholder="Enter phone number" onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Gender</label>
              <select name="gender" onChange={handleChange}>
                <option>Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Date of Birth</label>
              <input name="dob" type="date" onChange={handleChange} />
            </div>
          </div>

          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Professional Information</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Highest Qualification</label>
              <input name="qualification" type="text" placeholder="e.g. M.Tech, PhD" onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Teaching Experience (Years)</label>
              <input name="experience" type="number" min="0" placeholder="e.g. 5" onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Department</label>
            <select name="department" onChange={handleChange}>
              <option>Select Department</option>
              <option>Mathematics</option>
              <option>Computer Science</option>
              <option>Physics</option>
              <option>Chemistry</option>
              <option>Biology</option>
            </select>
          </div>
          <div className="form-group">
            <label>Primary Subject</label>
            <select name="primarySubject" onChange={handleChange}>
              <option>Select subject</option>
              <option>Mathematics</option>
              <option>Computer Science</option>
              <option>Physics</option>
              <option>Chemistry</option>
              <option>Biology</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending Credentials Email...' : 'Submit Details'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FormPage;
