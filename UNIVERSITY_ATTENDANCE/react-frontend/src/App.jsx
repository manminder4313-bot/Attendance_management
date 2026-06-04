import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FormPage from './pages/Form';
import Admin from './pages/Admin';
import StudentService from './pages/Student_sevice';
import Attendence_home from './Attendance_model/Attendence_home';
import TeacherProfile from './pages/TeacherProfile';
import FormStudent from './pages/from_student';
import FormDepartment from './pages/from_department';
import FormClerk from './pages/from_clerk';
import StudentFaceUpload from './pages/StudentFaceUpload';
import StudentDashboard from './pages/StudentDashboard';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/student-dashboard';
  
  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/form" element={<FormPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/student-services" element={<StudentService />} />
        <Route path="/Attendance_Management" element={<Attendence_home />} />
        <Route path="/teacher-profile" element={<TeacherProfile />} />
        <Route path="/student-form" element={<FormStudent />} />
        <Route path="/department-form" element={<FormDepartment />} />
        <Route path="/clerk-form" element={<FormClerk />} />
        <Route path="/upload-face" element={<StudentFaceUpload />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Routes>
    </>
  );
}

export default App;
