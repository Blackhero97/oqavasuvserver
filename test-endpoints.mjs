// Test alternative Hikvision endpoints
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const base = "https://192.168.100.193";
const auth = { username: 'admin', password: 'Parol8887' };

console.log("Testing Alternative Hikvision Endpoints\n");
console.log("========================================\n");

// Test 1: AcsWorkLog (attendance log)
console.log("1️⃣  Testing AcsWorkLog...");
try {
    const response = await axios.post(
        `${base}/ISAPI/AccessControl/AcsWorkLog?format=json`,
        {
            AcsWorkLogCond: {
                searchID: "1",
                searchResultPosition: 0,
                maxResults: 10
            }
        },
        { auth, httpsAgent, headers: { 'Content-Type': 'application/json' } }
    );
    console.log("✅ SUCCESS! Found", response.data?.AcsWorkLog?.InfoList?.length || 0, "records");
    console.log("Sample:", JSON.stringify(response.data?.AcsWorkLog?.InfoList?.[0], null, 2));
} catch (e) {
    console.log("❌ FAILED:", e.response?.status, e.response?.data?.errorMsg || e.message);
}

console.log("\n2️⃣  Testing UserInfo/Search...");
try {
    const response = await axios.post(
        `${base}/ISAPI/AccessControl/UserInfo/Search?format=json`,
        {
            UserInfoSearchCond: {
                searchID: "1",
                maxResults: 10
            }
        },
        { auth, httpsAgent, headers: { 'Content-Type': 'application/json' } }
    );
    console.log("✅ SUCCESS! Found", response.data?.UserInfoSearch?.UserInfo?.length || 0, "users");
    console.log("Sample:", JSON.stringify(response.data?.UserInfoSearch?.UserInfo?.[0], null, 2).substring(0, 300));
} catch (e) {
    console.log("❌ FAILED:", e.response?.status, e.response?.data?.errorMsg || e.message);
}

console.log("\n3️⃣  Testing Event/notification/httpHosts...");
try {
    const response = await axios.get(
        `${base}/ISAPI/Event/notification/httpHosts?format=json`,
        { auth, httpsAgent }
    );
    console.log("✅ SUCCESS!");
    console.log("Data:", JSON.stringify(response.data, null, 2).substring(0, 200));
} catch (e) {
    console.log("❌ FAILED:", e.response?.status, e.response?.data?.errorMsg || e.message);
}

console.log("\n========================================");
console.log("Tests completed!");
