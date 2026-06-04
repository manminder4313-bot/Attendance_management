import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  gender: { type: String },
  dob: { type: String },
  enrollmentNumber: { type: String, required: true, unique: true },
  department: { type: String },
  course: { type: String },
  semester: { type: String },
  batchYear: { type: String },
  profilePhoto: { type: String },
  username: { type: String },
  password: { type: String },
  enrolledFace: { type: String },
  lastEnrollmentUpdate: { type: Date },
  faceData: { type: String }, 
  enrolledFingerprint: { type: String }, // Base64 or string fingerprint pattern
  fingerprintData: { type: String }, // Biometric signature hash/data
  registrationDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Student', StudentSchema);
