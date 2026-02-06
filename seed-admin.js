import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Strict: Database Connection from Environment Only
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env');
    process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;

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

        // Create Teacher user
        const teacher = await User.findOne({ username: 'teacher' });
        if (!teacher) {
            await new User({
                username: 'teacher',
                password: 'teacher123',
                email: 'teacher@bmcrm.uz',
                fullName: 'O\'qituvchi',
                role: 'teacher'
            }).save();
            console.log('🎉 Teacher user yaratildi!');
        }

        // Create Director user
        const director = await User.findOne({ username: 'director' });
        if (!director) {
            await new User({
                username: 'director',
                password: 'director123',
                email: 'director@bmcrm.uz',
                fullName: 'Direktor',
                role: 'admin' // Director as admin for now
            }).save();
            console.log('🎉 Director user yaratildi!');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Default foydalanuvchilar:');
        console.log('1. admin / admin123');
        console.log('2. teacher / teacher123');
        console.log('3. director / director123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Xato:', error.message);
        process.exit(1);
    }
}

createDefaultAdmin();;
