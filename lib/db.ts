import { Pool } from "pg";

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "bkarogyam",
  password: "5432",
  port: 5432,
});