/**
 * Quick HTTP Webhook Test
 * Simulates Hikvision sending attendance event
 */

const testEvent = {
    event: {
        employeeNoString: "00000008",  // ASHUROVA OMINAJON
        time: new Date().toISOString(),
        eventType: "face_recognition"
    }
};

console.log('🧪 Testing HTTP Webhook...\n');
console.log('Sending test event for employee: 00000008 (ASHUROVA OMINAJON)\n');

fetch('http://localhost:5000/webhook/hikvision', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testEvent)
})
    .then(res => res.json())
    .then(data => {
        console.log('✅ Webhook Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n🎉 SUCCESS! Webhook is working!');
            console.log(`   Employee: ${data.employee}`);
            console.log(`   Time: ${data.time}`);
        } else {
            console.log('\n⚠️  Webhook received but:', data.message);
        }
    })
    .catch(err => {
        console.error('\n❌ Error:', err.message);
        console.log('\nMake sure server is running:');
        console.log('  node index.js');
    });
