import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Models
import Admin from './models/Admin.js';
import Teacher from './models/Teacher.js';
import Student from './models/Student.js';
import Department from './models/Department.js';
import Attendance from './models/Attendance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ✅ Check ENV variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://manminder_2002:Maan%404313@ac-26w7ddf-shard-00-00.1htdj3m.mongodb.net:27017,ac-26w7ddf-shard-00-01.1htdj3m.mongodb.net:27017,ac-26w7ddf-shard-00-02.1htdj3m.mongodb.net:27017/userDB?ssl=true&authSource=admin&retryWrites=true&w=majority';

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set in environment variables");
  process.exit(1);
}

// ✅ Static Files (Serve Frontend)
const distPath = path.join(__dirname, '../react-frontend/dist');
app.use(express.static(distPath));

// ✅ Health routes
app.get('/api/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ status });
});

// ✅ Wildcard route to serve React app for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'API Route Not Found' });
  }
});

// =======================
// 🚀 CONNECT DB + START SERVER
// =======================

console.log('⏳ Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  console.log('✅ MongoDB Connected');

  // ✅ Start server ONLY after DB connects
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  // ✅ Seed default admin
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new Admin({
        id: 'Adminmanminder',
        fullName: 'Manminder Maan',
        email: 'manminder4313@gmail.com',
        password: 'admin@1234',
        contact: '9915955319',
        profilePhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEU…',
        role: 'admin'
      });
      await defaultAdmin.save();
      console.log('👤 Default admin created');
    }
  } catch (err) {
    console.error('⚠️ Seeding Error:', err.message);
  }

})
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});

// =======================
// 📌 API ROUTES
// =======================

// ADMIN
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
    console.error('Admin Registration Error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// TEACHERS
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

// STUDENTS
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

// DEPARTMENTS
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

// ATTENDANCE
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

// LOGIN
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;

  try {
    let user = await Admin.findOne({
      $or: [{ id: id }, { email: id }],
      password
    });
    if (user) return res.json({ type: 'admin', user });

    user = await Teacher.findOne({
      $or: [{ username: id }, { email: id }],
      password
    });
    if (user) return res.json({ type: 'teacher', user });

    user = await Student.findOne({
      $or: [{ enrollmentNumber: id }, { username: id }, { email: id }],
      password
    });
    if (user) return res.json({ type: 'student', user });

    user = await Department.findOne({
      $or: [{ username: id }, { email: id }],
      password
    });
    if (user) return res.json({ type: 'department', user });

    res.status(401).json({ message: 'Invalid credentials' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});