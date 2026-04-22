import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

// Models
import Admin from './models/Admin.js';
import Teacher from './models/Teacher.js';
import Student from './models/Student.js';
import Department from './models/Department.js';
import Attendance from './models/Attendance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for face images
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// --- API ROUTES ---

// 1. ADMIN ROUTES
app.get('/api/admins', async (req, res) => {
  try {
    const admins = await Admin.find();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/admins', async (req, res) => {
  try {
    const admin = new Admin(req.body);
    await admin.save();
    res.status(201).json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 2. TEACHER ROUTES
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. STUDENT ROUTES
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. DEPARTMENT ROUTES
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const department = new Department(req.body);
    await department.save();
    res.status(201).json(department);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. ATTENDANCE ROUTES
app.get('/api/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const record = new Attendance(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk sync endpoint for migration
app.post('/api/sync', async (req, res) => {
  const { type, data } = req.body;
  try {
    let result;
    switch (type) {
      case 'admins':
        result = await Admin.insertMany(data, { ordered: false });
        break;
      case 'teachers':
        result = await Teacher.insertMany(data, { ordered: false });
        break;
      case 'students':
        result = await Student.insertMany(data, { ordered: false });
        break;
      case 'departments':
        result = await Department.insertMany(data, { ordered: false });
        break;
      case 'attendance':
        result = await Attendance.insertMany(data, { ordered: false });
        break;
      default:
        return res.status(400).json({ message: 'Invalid type' });
    }
    res.status(201).json({ message: `Synced ${result.length} records` });
  } catch (err) {
    res.status(400).json({ message: err.message, partial: err.writeErrors });
  }
});

// 6. LOGIN ENDPOINT
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;
  try {
    // Check Admin (id field)
    let user = await Admin.findOne({ email: id, password });
    if (user) return res.json({ type: 'admin', user });

    // Check Teacher (username/email field)
    user = await Teacher.findOne({ 
      $or: [{ email: id }, { name: id }], 
      password 
    });
    if (user) return res.json({ type: 'teacher', user });

    // Check Department
    user = await Department.findOne({ name: id, password }); // Assuming name is used as ID for dept
    if (user) return res.json({ type: 'department', user });

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
