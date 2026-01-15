import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';

dotenv.config();

async function cleanDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Employee collection'ni butunlay tozalash
        const result = await Employee.deleteMany({});
        console.log(`\n🗑️  Deleted ${result.deletedCount} employees from database`);

        console.log('\n✅ Database cleaned!');
        console.log('📋 Next steps:');
        console.log('   1. Terminal orqali o\'ting (Hikvision terminal)');
        console.log('   2. isup-server.js avtomatik Employee collection\'ga yozadi');
        console.log('   3. Attendance sahifasida rol bering');
        console.log('   4. Students sahifasida vaqt ko\'rinadi!\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanDatabase();
