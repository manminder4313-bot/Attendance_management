import mongoose from 'mongoose';

const NoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['attendance', 'course', 'calendar', 'general'], required: true },
  department: { type: String, default: 'All' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Notice', NoticeSchema);
