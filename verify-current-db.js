
import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 DIAGNOSTIC TOOL: Database Connection Verifier');
console.log('='.repeat(50));

const uri = process.env.MONGODB_URI;
console.log(`📂 Loading .env from: ${path.resolve(process.cwd(), '.env')}`);
console.log(`🔑 MONGODB_URI found: ${uri ? 'YES' : 'NO'}`);

if (uri) {
    // Hide password for log safety
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`🌐 Connection String: ${maskedUri}`);

    // Check for specific database name in URI
    const dbNameMatch = uri.match(/\/([^/?]+)\?/);
    const dbNameInUri = dbNameMatch ? dbNameMatch[1] : 'unknown';
    console.log(`📝 Database in URI: ${dbNameInUri}`);
} else {
    console.error('❌ ERROR: MONGODB_URI is missing!');
    process.exit(1);
}

console.log('='.repeat(50));
console.log('🔌 Connecting to MongoDB...');

try {
    await mongoose.connect(uri);
    console.log(`🏠 Host: ${mongoose.connection.host}`);
    console.log(`🗄️  Active Database Name: ${mongoose.connection.name}`);

    // Topology info
    if (mongoose.connection.db.s && mongoose.connection.db.s.topology) {
        const topology = mongoose.connection.db.s.topology;
        console.log(`🔗 Replica Set: ${topology.s.options.replicaSet || 'unknown'}`);
        console.log(`🖥️  Servers: ${Array.from(topology.s.servers.keys()).join(', ')}`);
    }

    console.log('='.repeat(50));
    console.log('📊 CHECKING COLLECTIONS:');

    const collections = await mongoose.connection.db.listCollections().toArray();

    if (collections.length === 0) {
        console.log('   ℹ️  Database is COMPLETELY EMPTY (0 collections).');
    } else {
        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`   - ${col.name}: ${count} docs`);

            // Peek at first document if it's employees or students
            if (['employees', 'students', 'users'].includes(col.name) && count > 0) {
                const firstDoc = await mongoose.connection.db.collection(col.name).findOne({});
                console.log(`     > Sample: ${JSON.stringify(firstDoc.name || firstDoc.username || 'unknown')}`);
            }
        }
    }

    console.log('='.repeat(50));
    console.log('✅ DIAGNOSIS COMPLETE');
    await mongoose.connection.close();

} catch (error) {
    console.error('❌ Connection Failed:', error.message);
}
