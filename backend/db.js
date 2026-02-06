const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "mkulimalink",
  password: "Malax001",
  port: 5432
});

module.exports = pool;
