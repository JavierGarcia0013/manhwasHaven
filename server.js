import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import usersRoutes from "./routes/usersRoutes.js";
import manhwasRoutes from "./routes/manhwasRoutes.js";
import { db } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import { verificarToken } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== MIDDLEWARES ====================
app.set("trust proxy", true); // ✅ importante para Render
app.use(
  cors({
    origin: [
      "https://javiergarcia0013.github.io", // frontend principal
      "https://javiergarcia0013.github.io/manhwasHaven", // subruta segura
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Servir archivos estáticos con URL absoluta
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));
console.log("📂 Sirviendo archivos desde:", uploadsPath);

// ✅ Middleware para obtener dominio dinámico
app.use((req, res, next) => {
  res.locals.baseUrl = `${req.protocol}://${req.get("host")}`;
  next();
});

// ==================== RUTAS PRINCIPALES ====================
app.get("/", (req, res) => {
  res.send("🚀 API de Manhwas Haven funcionando correctamente!");
});

// 🔓 Rutas públicas
app.use("/api/users", usersRoutes);
app.use("/api/manhwas", manhwasRoutes);

// 🔒 Middleware global — protege rutas definidas después de aquí
app.use(verificarToken);

// (si luego agregas /api/admin o /api/config, irían aquí debajo)

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));


