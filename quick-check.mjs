// Quick MongoDB check
import('mongodb').then(async ({ MongoClient }) => {
    const uri = "mongodb+srv://hasanboyleo97_db_user:N1TE1f0EakdNjUeg@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db("attendance_db");
        const employees = await db.collection("employees").find({}).toArray();

        console.log(`\n📊 Total employees in MongoDB: ${employees.length}\n`);
        employees.forEach((emp, i) => {
            console.log(`${i + 1}. ${emp.name} (ID: ${emp.hikvisionEmployeeId})`);
        });

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await client.close();
    }
});
