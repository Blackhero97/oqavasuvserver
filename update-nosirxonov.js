import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function updateSpecificEmployee() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('employees');
  
  // Find Nosirxonov Muhammadsolix
  const target = await collection.findOne({ name: 'Nosirxonov Muhammadsolix' });
  if (!target) {
    console.log(' Xodim topilmadi');
    process.exit(1);
  }
  
  console.log(` Topildi: ${target.name}`);
  console.log(`   Joriy rol: ${target.role}`);
  
  // Update with raw MongoDB
  await collection.updateOne(
    { _id: target._id },
    { $set: { role: 'student' } }
  );
  
  // Verify
  const updated = await collection.findOne({ _id: target._id });
  console.log(` Yangilandi: ${updated.role}`);
  
  // Count students
  const students = await collection.find({ role: 'student' }).toArray();
  console.log(`\n Jami o'quvchilar: ${students.length}`);
  students.forEach(s => console.log(`   - ${s.name}`));
  
  await mongoose.connection.close();
}

updateSpecificEmployee();
