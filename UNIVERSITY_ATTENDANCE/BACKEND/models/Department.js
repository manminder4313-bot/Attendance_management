import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  head: { type: String },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model('Department', DepartmentSchema);
