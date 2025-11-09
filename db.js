import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
});

pool.connect()
    .then(() => console.log("✅ Conectado a la base de datos Supabase"))
    .catch((err) => console.error("❌ Error al conectar a Supabase:", err.message));

/**
 * Exportar tanto default como con nombre.
 * Así funcionan ambos tipos de import:
 *  import db from "../db.js";
 *  import { db } from "../db.js";
 */
export const db = pool;
export default pool;



