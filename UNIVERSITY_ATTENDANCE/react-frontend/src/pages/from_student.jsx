import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { subjectMapping } from '../utils/subjectMapping';
import { departments } from '../utils/departments';

function FormStudent() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'Select gender',
    dob: '',
    enrollmentNumber: '',
    department: '',
    course: '',
    semester: '',
    batchYear: '',
    profilePhoto: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if a Department HOD or Clerk is logged in to filter courses
  const isClerkLoggedIn = sessionStorage.getItem('isClerkLoggedIn') === 'true';
  const isDepartmentLoggedIn = sessionStorage.getItem('isDepartmentLoggedIn') === 'true' || isClerkLoggedIn;
  const roleDepartmentData = isDepartmentLoggedIn ? (JSON.parse(sessionStorage.getItem('loggedInDepartment')) || JSON.parse(sessionStorage.getItem('loggedInClerk'))) : null;
  
  // Autofill department if HOD is logged in
  useEffect(() => {
    if (isDepartmentLoggedIn && roleDepartmentData?.department) {
      setFormData(prev => ({ ...prev, department: roleDepartmentData.department }));
    }
  }, []);
  
  const allCourses = [
    'BCA', 'MCA', 'BCA-MCA Integrated', 'B.Tech CSE', 'BA in Computer science', 'BSE. Graphic',
    'B.Tech Mechanical', 'B.Tech Civil', 'B.Tech Electrical', 'B.Tech ECE',
    'B.Tech Agricultural', 'B.Tech Chemical', 'B.Tech Food Tech', 'B.Tech Textile',
    'B.Arch', 'B.Pharmacy', 'M.Pharmacy', 'MBA', 'BBA', 'B.Sc', 'M.Sc'
  ];

  const availableCourses = (isDepartmentLoggedIn && roleDepartmentData?.department) 
    ? api.departments.getCourses(roleDepartmentData.department)
    : (formData.department ? api.departments.getCourses(formData.department) : allCourses);

  const getMaxSem = (course) => {
    if (!course) return 8; // Default
    if (course === 'MCA') return 4;
    if (course === 'BCA-MCA Integrated') return 10;
    if (course.includes('B.Tech')) return 8;
    if (course.includes('B.Pharmacy')) return 8;
    if (course.includes('B.Arch')) return 10;
    if (course.includes('BCA')) return 6;
    if (course.includes('BBA') || course.includes('B.Sc')) return 6;
    if (course.includes('MBA') || course.includes('M.Sc')) return 4;
    return 8;
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
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'profilePhoto') {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, (compressedData) => {
          setFormData(prev => ({ ...prev, profilePhoto: compressedData }));
        });
      }
    } else {
      let formattedValue = value;
      // Capitalize first letter logic for fullName and other descriptive fields
      if (['fullName', 'primarySubject', 'qualification'].includes(name) && value.length > 0) {
        formattedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }

      let updatedData = { ...formData, [name]: formattedValue };

      // Auto-detect semester based on batchYear and current date
      if (name === 'batchYear' || name === 'course') {
        const bYear = name === 'batchYear' ? parseInt(value) : parseInt(formData.batchYear);
        const course = name === 'course' ? value : formData.course;

        if (bYear && course) {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth(); // 0-11
          
          let yearsPassed = currentYear - bYear;
          let semester = yearsPassed * 2;
          if (currentMonth >= 6) { // July onwards is odd semester
            semester += 1;
          }

          // Course duration logic
          let maxSem = getMaxSem(course);

          if (semester > maxSem) semester = maxSem;
          if (semester <= 0) semester = 1;

          updatedData.semester = semester.toString();
        }
      }
      setFormData(updatedData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const username = formData.enrollmentNumber;
    const password = "Mrsptu@12345";

    const studentData = {
      ...formData,
      username,
      password,
      submissionDate: new Date().toLocaleString()
    };

    try {
      await api.students.create(studentData);
      alert(`Success! Account created for ${formData.fullName}.\n\n[ADMIN BACKUP]\nUsername: ${username}\nPassword: ${password}`);
      
      e.target.reset();
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        gender: 'Select gender',
        dob: '',
        enrollmentNumber: '',
        department: isDepartmentLoggedIn && roleDepartmentData?.department ? roleDepartmentData.department : '',
        course: '',
        semester: '',
        batchYear: '',
        profilePhoto: ''
      });

      navigate('/admin');
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Error saving to database. Please check if server is running.');
      
      e.target.reset();
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        gender: 'Select gender',
        dob: '',
        enrollmentNumber: '',
        department: isDepartmentLoggedIn && roleDepartmentData?.department ? roleDepartmentData.department : '',
        course: '',
        semester: '',
        batchYear: '',
        profilePhoto: ''
      });

      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="form-box" style={{ maxWidth: '900px' }}>
        <h1>Student Registration Form</h1>
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
            <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {formData.profilePhoto && <img src={formData.profilePhoto} alt="Profile Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
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

          <h2 style={{ borderBottom: '2px solid #eaeaea', color: '#333', paddingBottom: '5px', margin: '25px 0 15px' }}>Academic Information</h2>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Enrollment / Roll Number</label>
              <input name="enrollmentNumber" type="text" placeholder="e.g. 123456789" onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Department</label>
              <select 
                name="department" 
                value={formData.department} 
                onChange={handleChange} 
                required
                disabled={isDepartmentLoggedIn}
                style={{ 
                  background: isDepartmentLoggedIn ? '#f5f5f5' : 'white', 
                  cursor: isDepartmentLoggedIn ? 'not-allowed' : 'pointer' 
                }}
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
              <label>Course</label>
              <select name="course" value={formData.course} onChange={handleChange} required>
                <option value="">Select course</option>
                {availableCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Semester</label>
              <select name="semester" value={formData.semester} onChange={handleChange} required>
                <option value="">Select semester</option>
                {Array.from({ length: getMaxSem(formData.course) }, (_, i) => i + 1)
                  .filter(n => {
                    const isOddSession = new Date().getMonth() >= 6;
                    return isOddSession ? (n % 2 !== 0) : (n % 2 === 0);
                  })
                  .map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Batch Year</label>
              <select 
                name="batchYear" 
                value={formData.batchYear}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}
                required
              >
                <option value="">Select Year</option>
                {Array.from({ length: new Date().getFullYear() - 2018 + 1 }, (_, i) => 2018 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.course && formData.semester && subjectMapping[formData.course]?.[formData.semester] && (
            <div className="form-group" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <label style={{ color: '#8a2c20', fontWeight: 'bold' }}>Auto-selected Subjects for {formData.course} Sem {formData.semester}:</label>
              <ul style={{ margin: '10px 0 0', paddingLeft: '20px', fontSize: '14px', color: '#555' }}>
                {subjectMapping[formData.course][formData.semester].map((sub, idx) => (
                  <li key={idx}>{sub}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Submitting Details...' : 'Submit Details'}
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

export default FormStudent;
