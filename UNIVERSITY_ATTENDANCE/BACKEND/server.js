import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
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

// ✅ Request Logger
// ✅ Request Logger (MUST BE FIRST)
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ Check ENV variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://manminder_2002:Maan%404313@ac-26w7ddf-shard-00-00.1htdj3m.mongodb.net:27017,ac-26w7ddf-shard-00-01.1htdj3m.mongodb.net:27017,ac-26w7ddf-shard-00-02.1htdj3m.mongodb.net:27017/userDB?ssl=true&authSource=admin&retryWrites=true&w=majority';

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set in environment variables");
  process.exit(1);
}

// ✅ Health routes
app.get('/api/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ status, v: '2026-04-27-01:10' });
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', time: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    server: 'Running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting/Error',
    env: process.env.NODE_ENV || 'production'
  });
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

app.put('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { username: id };
    const admin = await Admin.findOneAndUpdate(query, updateData, { new: true });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (err) {
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

app.put('/api/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { username: id };
    const teacher = await Teacher.findOneAndUpdate(query, updateData, { new: true });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
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
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { $or: [{ enrollmentNumber: id }, { username: id }] };
    const student = await Student.findOneAndUpdate(query, updateData, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
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

app.put('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { username: id };
    const department = await Department.findOneAndUpdate(query, updateData, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
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
  console.log(`🔐 Login attempt for: ${id}`);

  try {
    let user = await Admin.findOne({
      $or: [{ username: id }, { email: id }],
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

// SYNC (Migration)
app.post('/api/sync', async (req, res) => {
  const { type, data } = req.body;
  console.log(`📡 Sync request received for type: ${type} with ${data?.length} items`);
  if (!Array.isArray(data)) return res.status(400).json({ message: 'Data must be an array' });

  try {
    let result;
    if (type === 'admins') {
      result = await Promise.all(data.map(item => 
        Admin.findOneAndUpdate({ email: item.email }, item, { upsert: true, new: true })
      ));
    } else if (type === 'teachers') {
      result = await Promise.all(data.map(item => 
        Teacher.findOneAndUpdate({ email: item.email }, item, { upsert: true, new: true })
      ));
    } else if (type === 'students') {
      result = await Promise.all(data.map(item => 
        Student.findOneAndUpdate({ enrollmentNumber: item.enrollmentNumber }, item, { upsert: true, new: true })
      ));
    } else if (type === 'departments') {
      result = await Promise.all(data.map(item => 
        Department.findOneAndUpdate({ headName: item.headName, email: item.email }, item, { upsert: true, new: true })
      ));
    } else if (type === 'attendance') {
      // For attendance, we check for exact match to avoid duplicates
      result = await Promise.all(data.map(item => 
        Attendance.findOneAndUpdate({ 
          date: item.date, 
          teacherId: item.teacherId, 
          subject: item.subject,
          semester: item.semester 
        }, item, { upsert: true, new: true })
      ));
    } else {
      return res.status(400).json({ message: 'Invalid sync type' });
    }
    res.json({ message: `Successfully synced ${data.length} items for ${type}`, count: result.length });
  } catch (err) {
    console.error(`Sync Error (${type}):`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// 🚀 START SERVER
// =======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// =======================
// 🚀 CONNECT DB
// =======================
console.log('⏳ Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  console.log('✅ MongoDB Connected');
  // Seed default admin
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new Admin({
        username: 'Adminmanminder',
        fullName: 'Manminder Maan',
        email: 'manminder4313@gmail.com',
        password: 'admin@1234',
        contact: '9915955319',
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
  // Don't exit, let the server stay alive to show status
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error(`💥 [${new Date().toISOString()}] Global Error at ${req.method} ${req.url}:`);
  console.error(err.stack);
  
  const status = err.status || 500;
  res.status(status).json({ 
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.url
  });
});

// ✅ Static Files (Serve Frontend)
let distPath = path.resolve(__dirname, '../react-frontend/dist');

// Diagnostic: Check if path exists, if not try sibling
if (!fs.existsSync(distPath)) {
  const altPath = path.resolve(__dirname, 'dist'); // Maybe it was copied?
  if (fs.existsSync(altPath)) {
    distPath = altPath;
  }
}

console.log(`📂 Serving static files from: ${distPath}`);
if (!fs.existsSync(distPath)) {
  console.error(`❌ CRITICAL: dist folder not found at ${distPath}`);
  console.log(`Current __dirname: ${__dirname}`);
}

app.use(express.static(distPath));

// ✅ Wildcard route to serve React app for any non-API route
// This MUST be the last route
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`Frontend not found. Looked at: ${indexPath}`);
  }
});