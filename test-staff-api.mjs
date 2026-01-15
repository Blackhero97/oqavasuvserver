import axios from "axios";

const API_URL = "http://localhost:5000/api";

async function testStaffAPI() {
  try {
    console.log("🚀 Testing Staff API Endpoints...\n");

    // Test 1: Get all staff
    console.log("1️⃣  Getting all staff...");
    const allStaffResponse = await axios.get(`${API_URL}/all-staff`);
    console.log(
      `✅ All staff fetched: ${allStaffResponse.data.length} employees`
    );
    console.log("\nSample employees:");
    allStaffResponse.data.slice(0, 3).forEach((emp) => {
      console.log(`  - ${emp.name} (${emp.department})`);
    });

    // Test 2: Create a teacher
    console.log("\n2️⃣  Creating a new teacher...");
    const teacherData = {
      name: "Test O'qituvchi",
      subject: "Matematika",
      salary: 5000000,
      phone: "+998901234567",
      email: "teacher@test.com",
    };
    const teacherResponse = await axios.post(`${API_URL}/teacher`, teacherData);
    console.log(
      `✅ Teacher created: ${teacherResponse.data.name} (${teacherResponse.data.subject})`
    );
    const teacherId = teacherResponse.data._id;

    // Test 3: Create a guard
    console.log("\n3️⃣  Creating a new guard...");
    const guardData = {
      name: "Test Qorovul",
      shift: "kunuz",
      salary: 3000000,
      phone: "+998901234568",
      email: "guard@test.com",
    };
    const guardResponse = await axios.post(`${API_URL}/guard`, guardData);
    console.log(
      `✅ Guard created: ${guardResponse.data.name} (${guardResponse.data.shift})`
    );
    const guardId = guardResponse.data._id;

    // Test 4: Create a cook
    console.log("\n4️⃣  Creating a new cook...");
    const cookData = {
      name: "Test Oshpaz",
      specialty: "Palov",
      salary: 4000000,
      phone: "+998901234569",
      email: "cook@test.com",
    };
    const cookResponse = await axios.post(`${API_URL}/cook`, cookData);
    console.log(
      `✅ Cook created: ${cookResponse.data.name} (${cookResponse.data.specialty})`
    );
    const cookId = cookResponse.data._id;

    // Test 5: Get teachers
    console.log("\n5️⃣  Getting all teachers...");
    const teachersResponse = await axios.get(`${API_URL}/teachers`);
    console.log(`✅ Teachers fetched: ${teachersResponse.data.length}`);

    // Test 6: Get guards
    console.log("\n6️⃣  Getting all guards...");
    const guardsResponse = await axios.get(`${API_URL}/guards`);
    console.log(`✅ Guards fetched: ${guardsResponse.data.length}`);

    // Test 7: Get cooks
    console.log("\n7️⃣  Getting all cooks...");
    const cooksResponse = await axios.get(`${API_URL}/cooks`);
    console.log(`✅ Cooks fetched: ${cooksResponse.data.length}`);

    // Test 8: Update teacher
    console.log("\n8️⃣  Updating teacher...");
    const updateTeacherData = {
      subject: "Ingliz tili",
      salary: 5500000,
    };
    const updatedTeacher = await axios.put(
      `${API_URL}/teacher/${teacherId}`,
      updateTeacherData
    );
    console.log(
      `✅ Teacher updated: ${updatedTeacher.data.name} now teaches ${updatedTeacher.data.subject}`
    );

    // Test 9: Update guard
    console.log("\n9️⃣  Updating guard...");
    const updateGuardData = {
      shift: "tungi",
      salary: 3500000,
    };
    const updatedGuard = await axios.put(
      `${API_URL}/guard/${guardId}`,
      updateGuardData
    );
    console.log(
      `✅ Guard updated: ${updatedGuard.data.name} now works ${updatedGuard.data.shift} shift`
    );

    // Test 10: Update cook
    console.log("\n🔟 Updating cook...");
    const updateCookData = {
      specialty: "Somsa",
      salary: 4500000,
    };
    const updatedCook = await axios.put(
      `${API_URL}/cook/${cookId}`,
      updateCookData
    );
    console.log(
      `✅ Cook updated: ${updatedCook.data.name} now specializes in ${updatedCook.data.specialty}`
    );

    // Test 11: Get single teacher
    console.log("\n1️⃣ 1️⃣  Getting single teacher...");
    const singleTeacher = await axios.get(`${API_URL}/teacher/${teacherId}`);
    console.log(`✅ Teacher fetched: ${singleTeacher.data.name}`);

    // Test 12: Delete tests
    console.log("\n1️⃣ 2️⃣  Deleting test records...");
    await axios.delete(`${API_URL}/teacher/${teacherId}`);
    console.log("✅ Teacher deleted");

    await axios.delete(`${API_URL}/guard/${guardId}`);
    console.log("✅ Guard deleted");

    await axios.delete(`${API_URL}/cook/${cookId}`);
    console.log("✅ Cook deleted");

    console.log("\n✅ All API tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testStaffAPI();
