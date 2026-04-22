import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  subject: { type: String },
  role: { type: String, default: 'teacher' }
}, { timestamps: true });

export default mongoose.model('Teacher', TeacherSchema);
