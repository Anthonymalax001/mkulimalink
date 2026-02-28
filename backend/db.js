const { Pool } = require("pg");

const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_o6l9ROtYCIFg@ep-lucky-pine-ai5av055-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL
});

module.exports = pool;
