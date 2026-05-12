import mongoose from 'mongoose';
import Attendance from './models/Attendance.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const records = await Attendance.find({}).limit(5);
    console.log('Sample Records:', JSON.stringify(records, null, 2));
    const semesters = await Attendance.distinct('semester');
    console.log('Available Semesters in DB:', semesters);
    process.exit(0);
}
check();
