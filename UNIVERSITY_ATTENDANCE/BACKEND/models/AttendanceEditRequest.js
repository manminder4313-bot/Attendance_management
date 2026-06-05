import mongoose from 'mongoose';

const AttendanceEditRequestSchema = new mongoose.Schema({
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  date: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  course: { type: String, required: true },
  department: { type: String, required: true },
  previousStatus: { type: String, required: true },
  requestedStatus: { type: String, required: true },
  proofType: { type: String, required: true },
  proofDescription: { type: String, required: true },
  proofDocument: { type: String }, // Base64
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedBy: { type: String, required: true },
  requestedByRole: { type: String, required: true },
  processedBy: { type: String },
  processedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('AttendanceEditRequest', AttendanceEditRequestSchema);
