import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import api from '../services/api';
import { departments } from '../utils/departments';

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
    primarySubject: '',
    profilePhoto: '',
    documents: []
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if a Department HOD or Clerk is logged in
  const isClerkLoggedIn = sessionStorage.getItem('isClerkLoggedIn') === 'true';
  const isDepartmentLoggedIn = sessionStorage.getItem('isDepartmentLoggedIn') === 'true' || isClerkLoggedIn;
  const roleDepartmentData = isDepartmentLoggedIn ? (JSON.parse(sessionStorage.getItem('loggedInDepartment')) || JSON.parse(sessionStorage.getItem('loggedInClerk'))) : null;

  // If HOD is logged in, set their department automatically
  useEffect(() => {
    if (isDepartmentLoggedIn && roleDepartmentData?.department) {
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
    } else if (e.target.name === 'documents') {
      const files = Array.from(e.target.files);
      const docPromises = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => resolve({ name: file.name, data: event.target.result });
        });
      });
      Promise.all(docPromises).then(docs => {
        setFormData(prev => ({ ...prev, documents: docs }));
      });
    } else {
      let formattedValue = e.target.value;
      if (['fullName', 'qualification'].includes(e.target.name) && formattedValue.length > 0) {
        formattedValue = formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1).toLowerCase();
      }
      setFormData({ ...formData, [e.target.name]: formattedValue });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const username = (formData.fullName.split(' ')[0].toLowerCase() + formData.phone.slice(-4)).replace(/[^a-z0-9]/g, '');
    const password = "Mrsptu@12345";

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
      
      e.target.reset();
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        gender: 'Select gender',
        dob: '',
        qualification: '',
        experience: '',
        department: isDepartmentLoggedIn && roleDepartmentData?.department ? roleDepartmentData.department : 'Select Department',
        primarySubject: '',
        profilePhoto: '',
        documents: []
      });

      navigate('/admin');
    } catch (err) {
      console.error('Submission failed:', err);
      alert(`Account created in DB, but email failed to send or server error.\n\n[BACKUP]\nUsername: ${username}\nPassword: ${password}`);
      
      e.target.reset();
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        gender: 'Select gender',
        dob: '',
        qualification: '',
        experience: '',
        department: isDepartmentLoggedIn && roleDepartmentData?.department ? roleDepartmentData.department : 'Select Department',
        primarySubject: '',
        profilePhoto: '',
        documents: []
      });

      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="form-box" style={{ maxWidth: '900px' }}>
        <h1>Teacher Details Form</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>Please fill all required information carefully</p>

        <form onSubmit={handleSubmit}>
          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Personal Information</h2>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Full Name</label>
              <input name="fullName" type="text" placeholder="Enter full name" onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Email</label>
              <input name="email" type="email" placeholder="Enter email" onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Profile Photo</label>
              <input name="profilePhoto" type="file" accept="image/*" onChange={handleChange} />
            </div>
            <div className="form-group" style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {formData.profilePhoto && <img src={formData.profilePhoto} alt="Profile Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
            </div>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label>Educational Documents (Multiple)</label>
              <input name="documents" type="file" multiple onChange={handleChange} />
              {formData.documents.length > 0 && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                  {formData.documents.length} files selected
                </div>
              )}
            </div>
          </div>
          
          <div className="form-row">
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
          <div className="form-row">
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
            <select 
              name="department" 
              value={formData.department} 
              onChange={handleChange}
              disabled={isDepartmentLoggedIn}
              style={{ background: isDepartmentLoggedIn ? '#f5f5f5' : 'white', cursor: isDepartmentLoggedIn ? 'not-allowed' : 'pointer' }}
            >
              <option>Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Primary Subject</label>
            <select name="primarySubject" value={formData.primarySubject} onChange={handleChange} required>
              <option value="">Select subject</option>
              {api.departments.getSubjects(formData.department).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Sending Credentials Email...' : 'Submit Details'}
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

export default FormPage;