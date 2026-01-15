import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanLegacyCollections() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Drop old collections
        const db = mongoose.connection.db;

        // Check and drop students collection
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        let dropped = 0;

        if (collectionNames.includes('students')) {
            await db.collection('students').drop();
            console.log('🗑️  Dropped "students" collection');
            dropped++;
        }

        if (collectionNames.includes('classes')) {
            await db.collection('classes').drop();
            console.log('🗑️  Dropped "classes" collection');
            dropped++;
        }

        if (dropped === 0) {
            console.log('✅ No legacy collections found');
        } else {
            console.log(`\n✅ Cleaned ${dropped} legacy collection(s)`);
        }

        console.log('\n📋 Current collections:');
        const remainingCollections = await db.listCollections().toArray();
        remainingCollections.forEach(col => {
            console.log(`   - ${col.name}`);
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanLegacyCollections();
