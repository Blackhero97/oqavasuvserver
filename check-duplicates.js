import mongoose from 'mongoose';
import 'dotenv/config';
import Employee from './models/Employee.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function test() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    const hikId = '00000042';
    const employees = await Employee.find({ hikvisionEmployeeId: hikId });

    console.log(`🕵️ Searching for HIK ID: ${hikId}`);
    console.log(`🔍 Found ${employees.length} entries:`);

    employees.forEach(e => {
      console.log(`- ID: ${e._id}, Name: ${e.name}, Role: ${e.role}, Dept: ${e.department}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('🔥 Error:', error);
    process.exit(1);
  }
}

test();
