const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL is not configured.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

pool.on("error", (error) => {
  console.error("Database pool error:", error);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function testDatabase() {
  const result = await pool.query("SELECT NOW() AS time");
  return result.rows[0];
}

module.exports = {
  pool,
  query,
  testDatabase,
};
