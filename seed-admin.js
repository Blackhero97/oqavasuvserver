import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db';

/**
 * Default admin user yaratish
 */
async function createDefaultAdmin() {
    try {
        // MongoDB'ga ulanish
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Admin mavjudligini tekshirish
        const existingAdmin = await User.findOne({ username: 'admin' });

        if (existingAdmin) {
            console.log('ℹ️  Admin user allaqachon mavjud');
            console.log('Username: admin');
            console.log('Email:', existingAdmin.email);
            await mongoose.connection.close();
            return;
        }

        // Yangi admin yaratish
        const admin = new User({
            username: 'admin',
            password: 'admin123', // Pre-save hook hash qiladi
            email: 'admin@bmcrm.uz',
            fullName: 'System Administrator',
            role: 'admin'
        });

        await admin.save();

        console.log('🎉 Default admin user yaratildi!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Email: admin@bmcrm.uz');
        console.log('Role: admin');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  MUHIM: Production\'da parolni o\'zgartiring!');

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Xato:', error.message);
        process.exit(1);
    }
}

createDefaultAdmin();;
