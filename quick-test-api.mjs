// Quick test to see if Hikvision API works with current setup
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

console.log("Testing Hikvision API...\n");

// Test with exact web interface credentials
const testUrl = "https://192.168.100.193/ISAPI/AccessControl/AcsEvent?format=json";

const requestBody = {
    AcsEventCond: {
        searchID: "1",
        searchResultPosition: 0,
        maxResults: 5
    }
};

console.log("URL:", testUrl);
console.log("Auth: admin / Parol8887");
console.log("Body:", JSON.stringify(requestBody, null, 2));

axios.post(testUrl, requestBody, {
    auth: {
        username: 'admin',
        password: 'Parol8887'
    },
    headers: {
        'Content-Type': 'application/json'
    },
    httpsAgent: httpsAgent,
    timeout: 10000
})
    .then(response => {
        console.log("\n✅ SUCCESS!");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
    })
    .catch(error => {
        console.log("\n❌ ERROR!");
        console.log("Status:", error.response?.status);
        console.log("Message:", error.message);
        console.log("Response:", error.response?.data);
        console.log("\nAuth Header:", error.response?.headers?.['www-authenticate']);
    });
