import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../db.js";

const router = express.Router();

// === CONFIGURAR MULTER PARA SUBIR IMÁGENES ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { id_manhwa, numero } = req.body;
        const dir = `uploads/manhwas/${id_manhwa}/capitulo-${numero}`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// === SUBIR CAPÍTULO CON IMÁGENES ===
router.post("/subir", upload.array("imagenes", 50), (req, res) => {
    const { id_manhwa, numero, titulo } = req.body;

    // Crear registro del capítulo
    db.query(
        "INSERT INTO capitulos (id_manhwa, numero, titulo) VALUES (?, ?, ?)",
        [id_manhwa, numero, titulo],
        (err, result) => {
            if (err) return res.status(500).json({ msg: "Error al crear capítulo" });
            const capituloId = result.insertId;

            // Guardar rutas de imágenes
            const imagenes = req.files.map((file, index) => [
                capituloId,
                file.path.replace(/\\/g, "/"),
                index + 1,
            ]);

            db.query(
                "INSERT INTO imagenes_capitulo (id_capitulo, url_imagen, orden) VALUES ?",
                [imagenes],
                (err2) => {
                    if (err2) return res.status(500).json({ msg: "Error al guardar imágenes" });
                    res.json({ msg: "✅ Capítulo subido correctamente" });
                }
            );
        }
    );
});

// === OBTENER CAPÍTULOS POR MANHWA ===
router.get("/:id_manhwa", (req, res) => {
    const { id_manhwa } = req.params;
    db.query(
        "SELECT * FROM capitulos WHERE id_manhwa = ? ORDER BY numero ASC",
        [id_manhwa],
        (err, results) => {
            if (err) return res.status(500).json({ msg: "Error al obtener capítulos" });
            res.json(results);
        }
    );
});

// === OBTENER IMÁGENES DE UN CAPÍTULO ===
router.get("/imagenes/:id_capitulo", (req, res) => {
    const { id_capitulo } = req.params;
    db.query(
        "SELECT * FROM imagenes_capitulo WHERE id_capitulo = ? ORDER BY orden ASC",
        [id_capitulo],
        (err, results) => {
            if (err) return res.status(500).json({ msg: "Error al obtener imágenes" });
            res.json(results);
        }
    );
});

export default router;
