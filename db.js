import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// ==================== CONFIGURACIÓN DE CONEXIÓN ====================
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

// ==================== RECONEXIÓN AUTOMÁTICA ====================
export let db;

function handleDisconnect() {
    db = mysql.createConnection(dbConfig);

    db.connect(err => {
        if (err) {
            console.error("❌ Error al conectar con MySQL:", err.message);
            // Reintentar conexión cada 2 segundos
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log("✅ Conectado a MySQL correctamente.");
        }
    });

    db.on("error", err => {
        console.error("⚠️ Error de conexión MySQL:", err.code);
        if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET") {
            console.log("🔄 Intentando reconectar a MySQL...");
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

// ==================== PING AUTOMÁTICO CADA 5 MINUTOS ====================
setInterval(() => {
    if (db) {
        db.query("SELECT 1", err => {
            if (err) console.error("⚠️ Ping fallido:", err.message);
            else console.log("💓 Conexión viva (ping OK)");
        });
    }
}, 1000 * 60 * 5); // 5 minutos
