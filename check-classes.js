import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/Student.js";
import Class from "./models/Class.js";

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");

    // Check students
    const students = await Student.find({});
    console.log(`📚 Found ${students.length} students:`);
    students.forEach((student) => {
      console.log(
        `  - ${student.name} (${student.className}) - ${student._id}`
      );
    });

    // Check classes
    const classes = await Class.find({});
    console.log(`\n🏫 Found ${classes.length} classes:`);
    classes.forEach((classDoc) => {
      console.log(
        `  - ${classDoc.name} (${classDoc.studentCount} students) - ${classDoc._id}`
      );
    });

    // Check for missing classes
    const uniqueClassNames = [...new Set(students.map((s) => s.className))];
    console.log(
      `\n🔍 Unique class names from students: ${uniqueClassNames.join(", ")}`
    );

    for (const className of uniqueClassNames) {
      const classExists = await Class.findOne({ name: className });
      if (!classExists) {
        console.log(
          `⚠️  Class ${className} exists in students but NOT in classes collection!`
        );

        // Create missing class
        const [grade, section] = className.split("-");
        const newClass = new Class({
          name: className,
          grade: parseInt(grade) || 0,
          section: section || "A",
        });
        await newClass.save();

        // Update student count
        const count = await Student.countDocuments({
          className,
          status: "active",
        });
        await Class.findByIdAndUpdate(newClass._id, { studentCount: count });

        console.log(
          `✅ Created missing class: ${className} with ${count} students`
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDatabase();
