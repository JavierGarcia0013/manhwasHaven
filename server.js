import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import usersRoutes from "./routes/usersRoutes.js";
import manhwasRoutes from "./routes/manhwasRoutes.js";
import { db } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Servir archivos estáticos de forma correcta
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));
console.log("📂 Sirviendo archivos desde:", uploadsPath);

// ==================== RUTAS PRINCIPALES ====================
app.use("/api/users", usersRoutes);
app.use("/api/manhwas", manhwasRoutes);

// ==================== RUTA BASE ====================
app.get("/", (req, res) => {
    res.send("🚀 API de Manhwas Haven funcionando correctamente!");
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
