import axios from "axios";
import https from "https";
import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

const HIKVISION_CONFIG = {
    ip: "192.168.100.193",
    username: "admin",
    password: "Parol8887",
    baseUrl: "https://192.168.100.193"
};

async function fetchAllEmployeesFromHikvision() {
    try {
        console.log("🔄 Fetching all employees from Hikvision...\n");

        const url = `${HIKVISION_CONFIG.baseUrl}/ISAPI/AccessControl/UserInfo/Search?format=json`;

        const requestBody = {
            UserInfoSearchCond: {
                searchID: "1",
                searchResultPosition: 0,
                maxResults: 100  // Get all employees
            }
        };

        const response = await axios.post(url, requestBody, {
            auth: {
                username: HIKVISION_CONFIG.username,
                password: HIKVISION_CONFIG.password
            },
            headers: {
                "Content-Type": "application/json"
            },
            httpsAgent: httpsAgent,
            timeout: 10000
        });

        if (response.data && response.data.UserInfoSearch) {
            const users = response.data.UserInfoSearch.UserInfo || [];
            console.log(`✅ Found ${users.length} employees in Hikvision\n`);
            return users;
        }

        return [];
    } catch (error) {
        console.error("❌ Failed to fetch employees from Hikvision:");
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
        return [];
    }
}

function parseHikvisionEmployee(hikvisionUser, index) {
    // Extract employee data from Hikvision format
    const employeeNoString = hikvisionUser.employeeNo || `${index + 1}`.padStart(8, '0');
    const name = hikvisionUser.name || `Employee ${index + 1}`;

    // Generate initials for avatar
    const nameParts = name.split(' ');
    const avatar = nameParts.length > 1
        ? nameParts[0][0] + nameParts[1][0]
        : name.substring(0, 2);

    return {
        employeeId: index + 1,
        name: name,
        department: hikvisionUser.departmentNo || "Xodim",
        role: "staff",
        faceId: `face_${employeeNoString}`,
        hikvisionEmployeeId: employeeNoString,
        avatar: avatar.toUpperCase(),
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@school.uz`,
        phone: `+99899${Math.floor(1000000 + Math.random() * 9000000)}`,
        status: "active"
    };
}

async function importToMongoDB() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Fetch employees from Hikvision
        const hikvisionUsers = await fetchAllEmployeesFromHikvision();

        if (hikvisionUsers.length === 0) {
            console.log("⚠️  No employees found or failed to fetch");
            process.exit(1);
        }

        // Parse and prepare employees for MongoDB
        const employees = hikvisionUsers.map((user, index) =>
            parseHikvisionEmployee(user, index)
        );

        console.log("🗑️  Clearing existing employees...");
        await Employee.deleteMany({});

        console.log("💾 Importing employees to MongoDB...\n");
        const result = await Employee.insertMany(employees);

        console.log(`✅ Successfully imported ${result.length} employees!\n`);

        // Show first 10 and last 5
        console.log("📋 First 10 employees:");
        result.slice(0, 10).forEach((emp, idx) => {
            console.log(`   ${idx + 1}. ${emp.name} (${emp.hikvisionEmployeeId})`);
        });

        if (result.length > 10) {
            console.log(`   ... and ${result.length - 10} more`);
            console.log("\n📋 Last 5 employees:");
            result.slice(-5).forEach((emp, idx) => {
                console.log(`   ${result.length - 5 + idx + 1}. ${emp.name} (${emp.hikvisionEmployeeId})`);
            });
        }

        console.log("\n🎉 Import completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Import failed:", error);
        process.exit(1);
    }
}

// Run import
importToMongoDB();
