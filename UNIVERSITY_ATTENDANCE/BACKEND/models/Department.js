import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  department: { type: String, required: true },
  headName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  profilePhoto: { type: String },
  username: { type: String },
  password: { type: String },
  role: { type: String, default: 'department' }
}, { timestamps: true });

export default mongoose.model('Department', DepartmentSchema);
