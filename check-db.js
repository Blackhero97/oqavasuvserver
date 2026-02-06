import mongoose from 'mongoose';
import 'dotenv/config';

console.log('\n🔍 DATABASE INSPECTION\n');
console.log('='.repeat(60));

try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Connected to: ${mongoose.connection.name}\n`);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Total collections: ${collections.length}\n`);

    if (collections.length === 0) {
        console.log('✅ Database is EMPTY - no collections exist\n');
    } else {
        console.log('📋 Collections found:\n');

        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`   ${col.name}: ${count} records`);
        }
    }

    console.log('\n' + '='.repeat(60));

} catch (error) {
    console.error('❌ Error:', error.message);
} finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
    process.exit(0);
}
