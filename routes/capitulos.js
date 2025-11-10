import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();
const baseDir = path.join(process.cwd(), "uploads", "manhwas");

// === CONFIGURAR MULTER PARA SUBIR IMÁGENES ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { id_manhwa, numero } = req.body;
        const dir = path.join(baseDir, `${id_manhwa}`, `capitulo-${numero}`);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// ============================================================
// 🟢 SUBIR CAPÍTULO CON IMÁGENES (solo admin)
// ============================================================
router.post("/subir", upload.array("imagenes", 50), (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return res.status(401).json({ msg: "No autenticado" });

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ msg: "Token inválido" });
        }

        if (payload?.rol !== "admin") {
            return res.status(403).json({ msg: "❌ Solo los administradores pueden subir capítulos" });
        }

        const { id_manhwa, numero, titulo } = req.body;
        if (!id_manhwa || !numero)
            return res.status(400).json({ msg: "Faltan datos obligatorios" });

        // Crear registro del capítulo
        db.query(
            "INSERT INTO capitulos (id_manhwa, numero, titulo) VALUES (?, ?, ?)",
            [id_manhwa, numero, titulo],
            (err, result) => {
                if (err) return res.status(500).json({ msg: "Error al crear capítulo" });
                const capituloId = result.insertId;

                // Guardar rutas de imágenes con URL completa
                const imagenes = req.files.map((file, index) => [
                    capituloId,
                    `${res.locals.baseUrl}/${file.path.replace(/\\/g, "/")}`,
                    index + 1,
                ]);

                db.query(
                    "INSERT INTO imagenes_capitulo (id_capitulo, url_imagen, orden) VALUES ?",
                    [imagenes],
                    (err2) => {
                        if (err2)
                            return res.status(500).json({ msg: "Error al guardar imágenes" });
                        res.json({ msg: "✅ Capítulo subido correctamente" });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Error al subir capítulo:", error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
});

// ============================================================
// 📘 OBTENER CAPÍTULOS POR MANHWA (con URLs completas)
// ============================================================
router.get("/:id_manhwa", (req, res) => {
    const { id_manhwa } = req.params;
    db.query(
        "SELECT * FROM capitulos WHERE id_manhwa = ? ORDER BY numero ASC",
        [id_manhwa],
        (err, results) => {
            if (err) return res.status(500).json({ msg: "Error al obtener capítulos" });

            // Asegurar que las portadas sean absolutas
            const capitulos = results.map((cap) => ({
                ...cap,
                portada: cap.portada
                    ? cap.portada.replace(
                        /^\/?uploads/,
                        `${res.locals.baseUrl}/uploads`
                    )
                    : null,
            }));

            res.json(capitulos);
        }
    );
});

// ============================================================
// 🖼️ OBTENER IMÁGENES DE UN CAPÍTULO
// ============================================================
router.get("/imagenes/:id_capitulo", (req, res) => {
    const { id_capitulo } = req.params;
    db.query(
        "SELECT * FROM imagenes_capitulo WHERE id_capitulo = ? ORDER BY orden ASC",
        [id_capitulo],
        (err, results) => {
            if (err)
                return res.status(500).json({ msg: "Error al obtener imágenes" });

            const imagenes = results.map((img) => ({
                ...img,
                url_imagen: img.url_imagen.replace(
                    /^\/?uploads/,
                    `${res.locals.baseUrl}/uploads`
                ),
            }));

            res.json(imagenes);
        }
    );
});

export default router;

