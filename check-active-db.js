import mongoose from 'mongoose';
import 'dotenv/config';

console.log('\n🔍 ACTIVE SERVER DATABASE CHECK\n');
console.log('='.repeat(60));
console.log(`📊 Current database: ${mongoose.connection.name || 'NOT CONNECTED'}`);
console.log(`🔗 Ready state: ${mongoose.connection.readyState}`);
console.log(`📍 Host: ${mongoose.connection.host || 'UNKNOWN'}`);

if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📋 Collections: ${collections.length}`);

    for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`   ${col.name}: ${count} records`);
    }
} else {
    console.log('\n⚠️ Not connected to database');
}

console.log('\n' + '='.repeat(60));
process.exit(0);
