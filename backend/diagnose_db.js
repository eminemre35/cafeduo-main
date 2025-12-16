const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log("\n🔍 FINAL CONNECTION CHECK");
console.log("================================================");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ DATABASE_URL missing.");
    process.exit(1);
}

// Mask sensitive info
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`Checking: ${maskedUrl}`);
// console.log(`Debug Password: ${process.env.DATABASE_URL.split(':')[2].split('@')[0]}`);

async function connectWithRetry(attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
        const client = new Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });

        try {
            if (i > 1) console.log(`\n🔄 Attempt ${i}/${attempts}...`);
            await client.connect();
            console.log("\n✅ CONNECTION SUCCESSFUL! 🎉");
            console.log("================================================");
            console.log("Password is CORRECT. Server accepted the connection.");

            const res = await client.query('SELECT NOW()');
            console.log(`🕒 Server Time: ${res.rows[0].now}`);

            await client.end();
            return true;
        } catch (err) {
            await client.end();

            if (err.message.includes('password')) {
                console.log("\n❌ HATA: Şifre Yanlış (Auth Failed).");
                return false; // Stop retrying if password is wrong
            }

            if (err.message.includes('terminated unexpectedly') || err.code === 'ECONNRESET') {
                console.log(`⚠️  Warning: Connection dropped (Attempt ${i}). This is common with Supabase Idle mode.`);
                if (i < attempts) {
                    console.log("   Waiting 2 seconds before retry...");
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
            } else {
                console.log(`❌ Error: ${err.message}`);
                console.log(`   Code: ${err.code}`);
            }
        }
    }
    return false;
}

connectWithRetry().then(success => {
    if (success) {
        process.exit(0);
    } else {
        console.log("\n❌ Failed after retries.");
        console.log("💡 ADVICE: If the error was 'terminated unexpectedly', try running 'npm run dev' anyway.");
        console.log("   The real app might handle connection persistence better than this script.");
        process.exit(1);
    }
});
