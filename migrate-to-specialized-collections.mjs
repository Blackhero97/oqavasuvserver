/**
 * Migration script to move employees to specialized collections
 * based on their department
 *
 * Usage: node server/migrate-to-specialized-collections.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";
import Teacher from "./models/Teacher.js";
import Guard from "./models/Guard.js";
import Cook from "./models/Cook.js";

dotenv.config();

async function migrateToSpecializedCollections() {
  try {
    console.log("🚀 Starting migration to specialized collections...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Fetch all employees
    const employees = await Employee.find();
    console.log(`📊 Found ${employees.length} employees to migrate\n`);

    let teacherCount = 0;
    let guardCount = 0;
    let cookCount = 0;
    let remainingCount = 0;

    // Migrate each employee
    for (const emp of employees) {
      if (emp.department === "O'qituvchi") {
        // Create teacher
        if (!emp.subject) {
          console.log(
            `⚠️  Teacher ${emp.name} has no subject, skipping subject-based migration`
          );
        } else {
          await Teacher.create({
            employeeId: emp.employeeId,
            name: emp.name,
            hikvisionEmployeeId: emp.hikvisionEmployeeId,
            subject: emp.subject,
            salary: emp.salary,
            phone: emp.phone,
            email: emp.email,
            status: emp.status,
          });
          console.log(`✅ Migrated Teacher: ${emp.name} (${emp.subject})`);
          teacherCount++;
        }
      } else if (emp.department === "Qorovul") {
        // Create guard
        if (!emp.shift) {
          console.log(
            `⚠️  Guard ${emp.name} has no shift, creating with default`
          );
        }
        await Guard.create({
          employeeId: emp.employeeId,
          name: emp.name,
          hikvisionEmployeeId: emp.hikvisionEmployeeId,
          shift: emp.shift || "kunuz",
          salary: emp.salary,
          phone: emp.phone,
          email: emp.email,
          status: emp.status,
        });
        console.log(`✅ Migrated Guard: ${emp.name}`);
        guardCount++;
      } else if (emp.department === "Oshpaz") {
        // Create cook
        if (!emp.specialty) {
          console.log(
            `⚠️  Cook ${emp.name} has no specialty, creating with empty field`
          );
        }
        await Cook.create({
          employeeId: emp.employeeId,
          name: emp.name,
          hikvisionEmployeeId: emp.hikvisionEmployeeId,
          specialty: emp.specialty || "",
          salary: emp.salary,
          phone: emp.phone,
          email: emp.email,
          status: emp.status,
        });
        console.log(`✅ Migrated Cook: ${emp.name}`);
        cookCount++;
      } else {
        // Keep in Employee collection (HR, Zavuch, Direktor, Hizmatchi)
        console.log(`✅ Kept in Employee: ${emp.name} (${emp.department})`);
        remainingCount++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   👨‍🏫 Teachers created: ${teacherCount}`);
    console.log(`   👮 Guards created: ${guardCount}`);
    console.log(`   👨‍🍳 Cooks created: ${cookCount}`);
    console.log(`   👥 Employees remaining: ${remainingCount}`);
    console.log(
      `   📈 Total: ${teacherCount + guardCount + cookCount + remainingCount}`
    );

    // Note: Original employees are still in Employee collection
    // You may want to remove them after verifying the migration
    console.log("\n⚠️  Note: Original records remain in Employee collection");
    console.log(
      "   You can safely delete them after verifying the migration\n"
    );

    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateToSpecializedCollections();
