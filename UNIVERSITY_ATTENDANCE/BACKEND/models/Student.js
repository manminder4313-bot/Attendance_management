import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  department: { type: String, required: true },
  faceData: { type: String }, // Storing base64 for now as per current localStorage implementation
  registrationDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Student', StudentSchema);
