import mongoose from 'mongoose';

const AttendanceDaySchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, required: true, enum: ['on', 'off'] }, // 'on' = Force Working Day, 'off' = Holiday/Day Off
  notice: { type: String, required: true }, // Notice description or proof link
  department: { type: String, required: true, default: 'All' }, // 'All' for all departments, or specific department name
  createdBy: { type: String, required: true },
  role: { type: String, required: true } // 'admin', 'hod', 'clerk'
}, { timestamps: true });

// Ensure unique configuration per date per department
AttendanceDaySchema.index({ date: 1, department: 1 }, { unique: true });

export default mongoose.model('AttendanceDay', AttendanceDaySchema);
