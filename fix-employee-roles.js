// Fix all employees - remove default role constraint
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function fixEmployees() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected!");

    // Get the raw collection (bypass Mongoose model)
    const collection = mongoose.connection.collection("employees");

    console.log("\n📊 Current state:");
    const stats = await collection
      .aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    console.log("Role distribution:");
    stats.forEach((stat) => {
      console.log(`  ${stat._id || "null"}: ${stat.count}`);
    });

    // Get first employee for testing
    const testEmployee = await collection.findOne();
    console.log(`\n🧪 Test employee: ${testEmployee.name}`);
    console.log(`   Current role: ${testEmployee.role}`);
    console.log(`   ID: ${testEmployee._id}`);

    // Update using raw MongoDB
    console.log(`\n🔄 Updating to 'student'...`);
    const result = await collection.updateOne(
      { _id: testEmployee._id },
      { $set: { role: "student" } }
    );

    console.log(`✅ Update result:`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);

    // Verify
    const updated = await collection.findOne({ _id: testEmployee._id });
    console.log(`\n📋 Verified:`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   Role: ${updated.role}`);

    if (updated.role === "student") {
      console.log(`\n🎉 SUCCESS!`);

      // Count students
      const studentCount = await collection.countDocuments({ role: "student" });
      console.log(`\n📚 Total students in database: ${studentCount}`);
    } else {
      console.log(`\n❌ FAILED! Still: ${updated.role}`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixEmployees();
