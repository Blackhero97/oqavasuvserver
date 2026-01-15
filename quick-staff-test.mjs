#!/usr/bin/env node

import axios from "axios";

const API_URL = "http://localhost:5000/api";

async function quickTest() {
  try {
    console.log("🔍 Testing API connectivity...\n");

    // Test all-staff endpoint
    console.log("📊 Testing GET /api/all-staff");
    const response = await axios.get(`${API_URL}/all-staff`);
    console.log(`✅ Success! Found ${response.data.length} employees\n`);

    // Show sample data
    if (response.data.length > 0) {
      console.log("📋 Sample employees:");
      response.data.slice(0, 5).forEach((emp) => {
        console.log(`   - ${emp.name} (${emp.department})`);
        if (emp.subject) console.log(`     📚 Fan: ${emp.subject}`);
        if (emp.shift) console.log(`     ⏰ Smena: ${emp.shift}`);
        if (emp.specialty)
          console.log(`     👨‍🍳 Mutaxassisligi: ${emp.specialty}`);
      });
    } else {
      console.log("⚠️  No employees in database");
    }

    console.log("\n✅ API is working correctly!");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error("❌ Cannot connect to server at http://localhost:5000");
      console.error("   Make sure the server is running");
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  }
}

quickTest();
