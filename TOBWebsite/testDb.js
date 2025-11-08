require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUSTCERT === 'true'
    }
};

async function testConnection() {
    try {
        const pool = await sql.connect(sqlConfig);
        console.log('✅ Connected to database successfully!');

        const result = await pool.request().query('SELECT TOP 5 * FROM NewsArticles');
        console.log('Sample data:', result.recordset);

        await pool.close();
    } catch (err) {
        console.error('❌ DB Connection failed:', err.message);
    }
}

testConnection();
