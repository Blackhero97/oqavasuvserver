import mongoose from 'mongoose';
import 'dotenv/config';
import { getReportStats } from './controllers/reports.controller.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function test() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        const req = {};
        const res = {
            json: (data) => {
                console.log('✅ Response:', JSON.stringify(data, null, 2));
                process.exit(0);
            },
            status: (code) => {
                console.log('❌ Error Status:', code);
                return res;
            }
        };

        await getReportStats(req, res);

    } catch (error) {
        console.error('🔥 Crash Detected:', error);
        process.exit(1);
    }
}

test();
