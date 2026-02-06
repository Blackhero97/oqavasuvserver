/**
 * Clean Water Management Database
 * Remove school-related collections, keep only water management collections
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const SCHOOL_COLLECTIONS = [
    'students',
    'classes',
    'telegramusers',
    'notificationlogs',
    'users',
    'organizationconfigs',
    'organizationinfos',
    'employees',
    'attendances'
];

const WATER_COLLECTIONS = [];

async function cleanDatabase() {
    try {
        console.log('\n🧹 CLEANING WATER MANAGEMENT DATABASE\n');
        console.log('='.repeat(60));

        // Connect
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ Connected to: ${mongoose.connection.name}\n`);

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        console.log(`📊 Current collections (${collections.length}):`);
        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            const isSchool = SCHOOL_COLLECTIONS.includes(col.name);
            const marker = isSchool ? '❌' : '✅';
            console.log(`   ${marker} ${col.name}: ${count} records`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🗑️  REMOVING SCHOOL COLLECTIONS...\n');

        let removedCount = 0;
        for (const collectionName of SCHOOL_COLLECTIONS) {
            if (collectionNames.includes(collectionName)) {
                await mongoose.connection.db.dropCollection(collectionName);
                console.log(`   ✅ Dropped: ${collectionName}`);
                removedCount++;
            }
        }

        if (removedCount === 0) {
            console.log('   ℹ️  No school collections found to remove');
        }

        console.log('\n' + '='.repeat(60));
        console.log('📋 REMAINING COLLECTIONS:\n');

        const finalCollections = await mongoose.connection.db.listCollections().toArray();
        for (const col of finalCollections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`   ✅ ${col.name}: ${count} records`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE CLEANUP COMPLETE!');
        console.log(`   Removed: ${removedCount} school collections`);
        console.log(`   Remaining: ${finalCollections.length} water management collections\n`);

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanDatabase();
