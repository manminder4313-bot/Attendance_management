import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  teacherId: { type: String, required: true },
  teacherName: { type: String },
  subject: { type: String },
  semester: { type: String },
  course: { type: String }, // Added for stats filtering
  department: { type: String },
  session: { type: String },
  attendance: { type: Object, required: true }, // { studentId: "Present/Absent" }
  proofPhoto: { type: String },
  submissionDate: { type: String }
}, { timestamps: true });

export default mongoose.model('Attendance', AttendanceSchema);
