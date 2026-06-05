import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  department: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Course', CourseSchema);
