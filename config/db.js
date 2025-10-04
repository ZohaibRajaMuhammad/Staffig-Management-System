const sql = require('mssql');
require('dotenv').config();

// SQL Server configuration
const dbConfig = {
  server: process.env.DB_SERVER || "MUHAMMADZOHAIB\\SQLEXPRESS", // instance name
  database: process.env.DB_NAME || "staffing_management",
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,                  // local dev doesn’t need encryption
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  // 🔹 Use SQL Authentication if you create a SQL login:
  authentication: {
    type: "default",
    options: {
      userName: process.env.DB_USER || "sa",  // fallback user
      password: process.env.DB_PASSWORD || "" // fallback password
    }
  }
};

// Create connection pool
let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    console.log("🔧 Connecting to SQL Server...");
    console.log("📋 Connection Details:", {
      server: dbConfig.server,
      user: dbConfig.authentication.options.userName,
      database: dbConfig.database,
      port: dbConfig.port,
    });

    try {
      poolPromise = sql.connect(dbConfig);
      const pool = await poolPromise;
      console.log("✅ Connected to SQL Server successfully!");
      return pool;
    } catch (err) {
      console.error("❌ Database Connection Failed:", err.message);
      poolPromise = undefined;
      throw err;
    }
  }
  return poolPromise;
};

// Test database connection
const testConnection = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT DB_NAME() AS db, @@VERSION AS version");
    console.log("✅ SQL Server connection test successful");
    console.log("📊 Connected DB:", result.recordset[0].db);
    console.log("📊 SQL Server Version:", result.recordset[0].version);
    return true;
  } catch (error) {
    console.error("❌ SQL Server connection test failed:", error.message);

    if (error.code === "ELOGIN") {
      console.log("\n🔧 Authentication Issue:");
      console.log("   - Check username/password in .env");
      console.log("   - Ensure SQL Server is in Mixed Mode (SQL + Windows Auth)");
    }

    if (error.code === "ESOCKET" || error.message.includes("connect")) {
      console.log("\n🔧 Network/Connection Issue:");
      console.log("   - Ensure SQL Server service is running");
      console.log("   - Enable TCP/IP in SQL Server Configuration Manager");
      console.log("   - Open port 1433 in firewall if needed");
    }

    return false;
  }
};

// Simple query function
const query = async (queryText, params = []) => {
  try {
    const pool = await getPool();
    const request = pool.request();

    params.forEach((param, index) => {
      if (param !== undefined && param !== null) {
        request.input(`param${index}`, param);
      }
    });

    const result = await request.query(queryText);
    return result;
  } catch (error) {
    console.error("❌ Database Query Error:", error.message);
    throw error;
  }
};

// Close pool
const closePool = async () => {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      console.log("✅ SQL Server connection pool closed");
    }
  } catch (error) {
    console.error("❌ Error closing connection pool:", error.message);
  }
};

module.exports = {
  sql,
  getPool,
  testConnection,
  closePool,
  query,
  dbConfig,
};
