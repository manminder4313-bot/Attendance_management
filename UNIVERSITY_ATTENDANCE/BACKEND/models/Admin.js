import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true }, // For custom admin username
  fullName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contact: { type: String },
  profilePhoto: { type: String },
  role: { type: String, default: 'admin' }
}, { timestamps: true, id: false });

export default mongoose.model('Admin', AdminSchema);
