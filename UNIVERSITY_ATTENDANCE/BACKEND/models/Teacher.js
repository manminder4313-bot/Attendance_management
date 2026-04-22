import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  gender: { type: String },
  dob: { type: String },
  qualification: { type: String },
  experience: { type: String },
  department: { type: String, required: true },
  primarySubject: { type: String },
  profilePhoto: { type: String },
  username: { type: String },
  role: { type: String, default: 'teacher' }
}, { timestamps: true });

export default mongoose.model('Teacher', TeacherSchema);
