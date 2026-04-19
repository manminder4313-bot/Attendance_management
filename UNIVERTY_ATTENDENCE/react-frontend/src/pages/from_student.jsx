import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function FormStudent() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'Select gender',
    dob: '',
    enrollmentNumber: '',
    course: 'Select course',
    semester: 'Select semester',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const username = (formData.fullName.split(' ')[0].toLowerCase() + formData.phone.slice(-4)).replace(/[^a-z0-9]/g, '');
      const password = Math.random().toString(36).slice(-8);

      const studentData = {
        ...formData,
        id: Date.now(),
        username,
        password,
        submissionDate: new Date().toLocaleString()
      };

      let submissions = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
      submissions.push(studentData);
      localStorage.setItem('studentSubmissions', JSON.stringify(submissions));

      alert(`Success! Account created for ${formData.fullName}.\n\n[ADMIN BACKUP]\nUsername: ${username}\nPassword: ${password}`);
      navigate('/');
    }, 1000);
  };

  return (
    <div className="auth-container" style={{ background: 'url("/IMAGES/mrsptu.webp") cover center no-repeat', attachment: 'fixed' }}>
      <div className="form-box" style={{ maxWidth: '900px', background: 'rgba(255, 255, 255, 0.95)' }}>
        <h1>Student Registration Form</h1>
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

          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Academic Information</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Enrollment / Roll Number</label>
              <input name="enrollmentNumber" type="text" placeholder="e.g. 123456789" onChange={handleChange} required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Course</label>
              <select name="course" onChange={handleChange}>
                <option>Select course</option>
                <option>B.Tech Computer Science</option>
                <option>B.Tech Mechanical</option>
                <option>B.Tech Civil</option>
                <option>B.Tech Electrical</option>
                <option>BCA</option>
                <option>MCA</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Semester</label>
              <select name="semester" onChange={handleChange}>
                <option>Select semester</option>
                <option>1st Semester</option>
                <option>2nd Semester</option>
                <option>3rd Semester</option>
                <option>4th Semester</option>
                <option>5th Semester</option>
                <option>6th Semester</option>
                <option>7th Semester</option>
                <option>8th Semester</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Submitting Details...' : 'Submit Details'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FormStudent;
