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
import AttendanceDay from './models/AttendanceDay.js';
import Course from './models/Course.js';
import Notice from './models/Notice.js';
import AttendanceEditRequest from './models/AttendanceEditRequest.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Global Exception Handlers
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

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

// TEST
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', time: new Date().toISOString() });
});

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
    const { studentId, teacherId, subject, semester, course } = req.query;
    console.log(`🔍 Attendance Query:`, { studentId, teacherId, subject, semester, course });
    let query = {};
    
    if (studentId) query[`attendance.${studentId}`] = { $exists: true };
    if (teacherId) query.teacherId = teacherId;
    if (subject && subject !== 'All') query.subject = subject;
    if (semester && semester !== 'All') {
      const semStr = semester.toLowerCase();
      if (semStr === 'odd semester' || semStr === 'odd') {
        query.semester = { $in: ["1", "3", "5", "7", "9", "1st Semester", "3rd Semester", "5th Semester", "7th Semester", "9th Semester", "Odd Semester"] };
      } else if (semStr === 'even semester' || semStr === 'even') {
        query.semester = { $in: ["2", "4", "6", "8", "10", "2nd Semester", "4th Semester", "6th Semester", "8th Semester", "10th Semester", "Even Semester"] };
      } else {
        const digits = semester.replace(/\D/g, '');
        if (digits) {
          const num = parseInt(digits, 10);
          const isOdd = num % 2 !== 0;
          query.semester = { $in: [
            digits,
            `${digits}st Semester`,
            `${digits}nd Semester`,
            `${digits}rd Semester`,
            `${digits}th Semester`,
            isOdd ? 'Odd Semester' : 'Even Semester'
          ] };
        } else {
          query.semester = semester;
        }
      }
    }
    if (course && course !== 'All') query.course = course;

    console.log(`📦 DB Query:`, JSON.stringify(query));
    const attendance = await Attendance.find(query).sort({ date: -1 });
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

// DELETE ROUTES
app.delete('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { username: id };
    const admin = await Admin.findOneAndDelete(query);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { username: id };
    const teacher = await Teacher.findOneAndDelete(query);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { $or: [{ enrollmentNumber: id }, { username: id }] };
    const student = await Student.findOneAndDelete(query);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { username: id };
    const dept = await Department.findOneAndDelete(query);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete attendance record: ${id}`);
    
    const record = await Attendance.findByIdAndDelete(id);
    if (!record) {
      console.warn(`⚠️ Attendance record not found for deletion: ${id}`);
      return res.status(404).json({ message: 'Record not found' });
    }
    
    console.log(`✅ Successfully deleted attendance record: ${id}`);
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    console.error(`💥 Error deleting attendance record (${id}):`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;
  console.log(`🔐 Login attempt for: ${id}`);

  if (!id || !password) {
    return res.status(400).json({ message: 'User ID and Password are required' });
  }
  
  // Quick check if DB is connected
  if (mongoose.connection.readyState !== 1) {
    console.error('❌ Database not connected at login attempt');
    return res.status(503).json({ message: 'Database connection in progress, please try again in a moment.' });
  }
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
    if (user) return res.json({ type: user.role || 'department', user });

    res.status(401).json({ message: 'Invalid credentials' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ATTENDANCE DAYS (Holidays / Force working days)
app.get('/api/attendance-days', async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};
    if (department && department !== 'All') {
      query = { $or: [{ department: 'All' }, { department }] };
    }
    const days = await AttendanceDay.find(query).sort({ date: -1 });
    res.json(days);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance-days', async (req, res) => {
  try {
    const { date, status, notice, department, createdBy, role } = req.body;
    if (!date || !status || !notice || !department || !createdBy || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Upsert to handle updates to an existing date/department combination
    const updatedRule = await AttendanceDay.findOneAndUpdate(
      { date, department },
      { status, notice, createdBy, role },
      { new: true, upsert: true }
    );

    // Create Notice
    const systemNotice = new Notice({
      title: status === 'off' ? 'Holiday Configured' : 'Special Working Day',
      message: `Date ${date} has been configured as a ${status === 'off' ? 'Holiday (No Classes)' : 'Force Working Day'} for ${department}. Reason: ${notice}. Created by: ${createdBy} (${role}).`,
      category: 'calendar',
      department
    });
    await systemNotice.save();

    res.status(201).json(updatedRule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/attendance-days/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await AttendanceDay.findById(id);
    if (rule) {
      const systemNotice = new Notice({
        title: 'Calendar Rule Removed',
        message: `Configuration for ${rule.date} (${rule.status === 'off' ? 'Holiday' : 'Working Day'}) has been deleted for ${rule.department}.`,
        category: 'calendar',
        department: rule.department
      });
      await systemNotice.save();
    }
    await AttendanceDay.findByIdAndDelete(id);
    res.json({ message: 'Day configuration deleted successfully' });
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

// =======================================
// 📌 NOTICES & ANNOUNCEMENTS API
// =======================================
app.get('/api/notices', async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};
    if (department && department !== 'All') {
      query = { $or: [{ department: 'All' }, { department }] };
    }
    const notices = await Notice.find(query).sort({ date: -1 }).limit(100);
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/notices', async (req, res) => {
  try {
    const notice = new Notice(req.body);
    await notice.save();
    res.status(201).json(notice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// =======================================
// 📌 COURSES MANAGEMENT API
// =======================================
app.get('/api/courses', async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};
    if (department && department !== 'All') {
      query = { department };
    }
    const courses = await Course.find(query).sort({ name: 1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { name, department } = req.body;
    if (!name || !department) {
      return res.status(400).json({ message: 'Course name and department are required' });
    }
    const existing = await Course.findOne({ name, department });
    if (existing) {
      return res.status(400).json({ message: 'Course already exists in this department' });
    }
    const course = new Course({ name, department });
    await course.save();

    // Create notice
    const notice = new Notice({
      title: 'New Course Added',
      message: `Course '${name}' has been successfully added to the ${department}.`,
      category: 'course',
      department
    });
    await notice.save();

    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Create notice
    const notice = new Notice({
      title: 'Course Removed',
      message: `Course '${course.name}' has been removed from the ${course.department}.`,
      category: 'course',
      department: course.department
    });
    await notice.save();

    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =======================================
// 📌 ATTENDANCE EDIT REQUESTS API (Clerk Approval Workflow)
// =======================================
app.get('/api/attendance-edit-requests', async (req, res) => {
  try {
    const { department, status } = req.query;
    let query = {};
    if (department && department !== 'All') query.department = department;
    if (status) query.status = status;
    const requests = await AttendanceEditRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance-edit-requests', async (req, res) => {
  try {
    const request = new AttendanceEditRequest(req.body);
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/attendance-edit-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { hodName } = req.body;
    if (!hodName) return res.status(400).json({ message: 'HOD Name is required' });

    const editReq = await AttendanceEditRequest.findById(id);
    if (!editReq) return res.status(404).json({ message: 'Edit request not found' });
    if (editReq.status !== 'pending') return res.status(400).json({ message: 'Request is already processed' });

    // Update original attendance record
    const attRecord = await Attendance.findById(editReq.attendanceId);
    if (!attRecord) return res.status(404).json({ message: 'Original attendance record not found' });

    const oldStatus = attRecord.attendance[editReq.studentId] || 'Absent';
    attRecord.attendance[editReq.studentId] = editReq.requestedStatus;
    attRecord.markModified('attendance');
    await attRecord.save();

    // Update edit request
    editReq.status = 'approved';
    editReq.processedBy = hodName;
    editReq.processedAt = new Date();
    await editReq.save();

    // Create a Notice for the notice board
    const notice = new Notice({
      title: 'Attendance Edit Approved',
      message: `HOD (${hodName}) approved Clerk's request to change attendance for ${editReq.studentName} on ${editReq.date} from ${oldStatus} to ${editReq.requestedStatus}. Proof: ${editReq.proofType} (${editReq.proofDescription})`,
      category: 'attendance',
      department: editReq.department
    });
    await notice.save();

    res.json({ message: 'Request approved and attendance updated successfully', editReq });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/attendance-edit-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { hodName } = req.body;
    if (!hodName) return res.status(400).json({ message: 'HOD Name is required' });

    const editReq = await AttendanceEditRequest.findById(id);
    if (!editReq) return res.status(404).json({ message: 'Edit request not found' });
    if (editReq.status !== 'pending') return res.status(400).json({ message: 'Request is already processed' });

    // Update edit request
    editReq.status = 'rejected';
    editReq.processedBy = hodName;
    editReq.processedAt = new Date();
    await editReq.save();

    // Create a Notice for the notice board
    const notice = new Notice({
      title: 'Attendance Edit Rejected',
      message: `HOD (${hodName}) rejected Clerk's request to change attendance for ${editReq.studentName} on ${editReq.date} to ${editReq.requestedStatus}.`,
      category: 'attendance',
      department: editReq.department
    });
    await notice.save();

    res.json({ message: 'Request rejected successfully', editReq });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Direct HOD Attendance Edit
app.put('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, studentName, newStatus, hodName, proofType, proofDescription, proofDocument } = req.body;

    const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    const oldStatus = record.attendance[studentId] || 'Absent';
    record.attendance[studentId] = newStatus;
    record.markModified('attendance');
    await record.save();

    // Create a Notice for the notice board
    const notice = new Notice({
      title: 'Attendance Corrected by HOD',
      message: `HOD (${hodName}) directly updated student ${studentName}'s status on ${record.date} from ${oldStatus} to ${newStatus}. Proof: ${proofType} (${proofDescription})`,
      category: 'attendance',
      department: record.department || 'All'
    });
    await notice.save();

    res.json({ message: 'Attendance updated successfully', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =======================================
// 📌 HOLIDAY PDF PARSING & BULK UPDATE API
// =======================================
app.post('/api/upload-holiday-pdf', async (req, res) => {
  try {
    const { pdfData } = req.body;
    if (!pdfData) {
      return res.status(400).json({ message: 'No PDF data provided' });
    }

    const pdfBuffer = Buffer.from(pdfData, 'base64');
    const parsedPdf = await pdfParse(pdfBuffer);
    
    // Helper function to parse text and match dates
    const parsedHolidays = parseHolidaysFromText(parsedPdf.text);
    console.log(`[PDF Loader] Parsed ${parsedHolidays.length} holidays from PDF text`);

    let createdCount = 0;
    const results = [];

    for (const item of parsedHolidays) {
      // Upsert to AttendanceDay
      const rule = await AttendanceDay.findOneAndUpdate(
        { date: item.date, department: 'All' },
        { status: 'off', notice: item.notice, createdBy: 'Admin (PDF Loader)', role: 'admin' },
        { new: true, upsert: true }
      );
      createdCount++;
      results.push(rule);

      // Create Notice
      const notice = new Notice({
        title: 'Holiday Configured',
        message: `System automatically marked ${item.date} as HOLIDAY (Notice: ${item.notice}) based on Holiday Calendar PDF.`,
        category: 'calendar',
        department: 'All'
      });
      await notice.save();
    }

    res.json({ message: `Successfully parsed and loaded ${createdCount} holidays from PDF.`, count: createdCount, holidays: parsedHolidays });
  } catch (err) {
    console.error('PDF parsing error:', err);
    res.status(500).json({ message: 'Failed to parse PDF: ' + err.message });
  }
});

// PDF Helper scanner
function parseHolidaysFromText(text) {
  const holidays = [];
  const lines = text.split('\n');
  
  // Regex to match dates in format DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD
  const dateRegex1 = /\b(\d{1,2})[-./](\d{1,2})[-./](\d{4})\b/;
  const dateRegex2 = /\b(\d{4})[-./](\d{1,2})[-./](\d{1,2})\b/;
  // Regex to match Month Name DD, YYYY or DD Month Name YYYY
  const monthRegex = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i;
  const monthRegexRev = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i;

  const monthsMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    let matchedDate = null;
    let desc = line;

    let match1 = line.match(dateRegex1);
    if (match1) {
      let day = match1[1].padStart(2, '0');
      let month = match1[2].padStart(2, '0');
      let year = match1[3];
      if (parseInt(month) > 12 && parseInt(day) <= 12) {
        const temp = day;
        day = month;
        month = temp;
      }
      matchedDate = `${year}-${month}-${day}`;
      desc = line.replace(match1[0], '').replace(/[-:,]/g, '').trim();
    } else {
      let match2 = line.match(dateRegex2);
      if (match2) {
        matchedDate = `${match2[1]}-${match2[2].padStart(2, '0')}-${match2[3].padStart(2, '0')}`;
        desc = line.replace(match2[0], '').replace(/[-:,]/g, '').trim();
      } else {
        let matchM = line.match(monthRegex);
        if (matchM) {
          let day = matchM[1].padStart(2, '0');
          let mName = matchM[2].toLowerCase().substring(0, 3);
          let month = monthsMap[mName] || '01';
          let year = matchM[3];
          matchedDate = `${year}-${month}-${day}`;
          desc = line.replace(matchM[0], '').replace(/[-:,]/g, '').trim();
        } else {
          let matchMRev = line.match(monthRegexRev);
          if (matchMRev) {
            let day = matchMRev[2].padStart(2, '0');
            let mName = matchMRev[1].toLowerCase().substring(0, 3);
            let month = monthsMap[mName] || '01';
            let year = matchMRev[3];
            matchedDate = `${year}-${month}-${day}`;
            desc = line.replace(matchMRev[0], '').replace(/[-:,]/g, '').trim();
          }
        }
      }
    }

    if (matchedDate) {
      let cleanDesc = desc.replace(/\s+/g, ' ').trim();
      if (!cleanDesc || cleanDesc.toLowerCase() === 'holiday' || cleanDesc.toLowerCase() === 'date') {
        cleanDesc = 'General Holiday';
      }
      holidays.push({ date: matchedDate, notice: cleanDesc });
    }
  }

  return holidays;
}

// ✅ Catch-all for API routes (Must be after all API routes)
app.all(/^\/api\/.*/, (req, res) => {
  res.status(404).json({ 
    message: `API Route ${req.method} ${req.url} not found`,
    availableRoutes: ['/api/login', '/api/health', '/api/admins', '/api/teachers', '/api/students', '/api/departments', '/api/attendance']
  });
});


// =======================
// 🚀 CONNECT DB & START SERVER
// =======================
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected');
});

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
            password: 'Maan@1234',
            role: 'admin'
          });
          await defaultAdmin.save();
          console.log('👤 Default admin created');
        }

        // Seed dynamic courses
        const courseCount = await Course.countDocuments();
        if (courseCount === 0) {
          const defaultCourses = [
            // Computer
            { name: 'B.Tech CSE', department: 'Department of Computer Science & Engineering' },
            { name: 'B.Tech AI&DS', department: 'Department of Computer Science & Engineering' },
            { name: 'BCA', department: 'Department of Computer Science & Engineering' },
            { name: 'MCA', department: 'Department of Computer Science & Engineering' },
            { name: 'BCA-MCA Integrated', department: 'Department of Computer Science & Engineering' },
            { name: 'BA in Computational Sciences', department: 'Department of Computer Science & Engineering' },
            { name: 'BSE. Graphic', department: 'Department of Computer Science & Engineering' },
            // Also seed computational science
            { name: 'B.Tech CSE', department: 'Department of computatioinal science' },
            { name: 'B.Tech AI&DS', department: 'Department of computatioinal science' },
            { name: 'BCA', department: 'Department of computatioinal science' },
            { name: 'MCA', department: 'Department of computatioinal science' },
            { name: 'BCA-MCA Integrated', department: 'Department of computatioinal science' },
            { name: 'BA in Computational Sciences', department: 'Department of computatioinal science' },
            { name: 'BSE. Graphic', department: 'Department of computatioinal science' },
            
            // Mechanical
            { name: 'B.Tech Mechanical', department: 'Department of Mechanical Engineering' },
            // Civil
            { name: 'B.Tech Civil', department: 'Department of Civil Engineering' },
            // Electrical
            { name: 'B.Tech Electrical', department: 'Department of Electrical Engineering' },
            // Electronics
            { name: 'B.Tech ECE', department: 'Department of Electronics & Communication Engineering' },
            // Agricultural
            { name: 'B.Tech Agricultural', department: 'Department of Agricultural Engineering' },
            // Chemical
            { name: 'B.Tech Chemical', department: 'Department of Chemical Engineering' },
            // Food Tech
            { name: 'B.Tech Food Tech', department: 'Department of Food Science & Technology' },
            // Textile
            { name: 'B.Tech Textile', department: 'Department of Textile Engineering' },
            // Architecture
            { name: 'B.Arch', department: 'Department of Architecture' },
            // Pharmacy
            { name: 'B.Pharmacy', department: 'Department of Pharmacy' },
            { name: 'M.Pharmacy', department: 'Department of Pharmacy' },
            // Management
            { name: 'MBA', department: 'Department of Management Studies' },
            { name: 'BBA', department: 'Department of Management Studies' },
            // Applied Sciences
            { name: 'B.Sc', department: 'Department of Applied Sciences (Physics, Chemistry, Maths)' },
            { name: 'M.Sc', department: 'Department of Applied Sciences (Physics, Chemistry, Maths)' }
          ];
          await Course.insertMany(defaultCourses);
          console.log('📚 Default courses seeded successfully');
        }
      } catch (err) {
        console.error('⚠️ Seeding Error:', err.message);
      }
})
.catch((err) => {
  console.error('❌ MongoDB Initial Connection Error:', err.message);
});

// ✅ Static Files (Serve Frontend)
let distPath = path.resolve(__dirname, '../react-frontend/dist');
if (!fs.existsSync(distPath)) {
  distPath = path.resolve(__dirname, 'dist');
}

console.log(`📂 Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// ✅ Wildcard route to serve React app for any non-API route
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`Frontend not found. Looked at: ${indexPath}`);
  }
});

// ✅ Global Error Handler (MUST BE LAST MIDDLEWARE)
app.use((err, req, res, next) => {
  console.error(`💥 [${new Date().toISOString()}] Global Error:`);
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ 
    message: err.message || 'Internal Server Error',
    path: req.url
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});