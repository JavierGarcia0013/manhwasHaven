import express from "express";
import {
    subirManhwa,
    obtenerManhwas,
    eliminarManhwa,
    listarCapitulos,
    obtenerImagenesCapitulo
} from "../controllers/manhwasController.js";
import {
    obtenerFavoritos,
    agregarFavorito,
    eliminarFavorito
} from "../controllers/manhwasController.js";

const router = express.Router();

// ==================== RUTAS PRINCIPALES ====================

// 📚 Obtener todos los manhwas o mangas (BD + filesystem)
router.get("/", obtenerManhwas);

// ⬆️ Subir nuevo manhwa (solo admin)
router.post("/subir", subirManhwa);

// 🗑️ Eliminar manhwa (solo en BD)
router.delete("/:id", eliminarManhwa);

// ==================== CAPÍTULOS ====================

// 📖 Listar capítulos de un manhwa (carpetas capitulo-1, capitulo-2, etc.)
router.get("/:nombre/capitulos", listarCapitulos);

// 🖼️ Obtener imágenes de un capítulo específico
router.get("/:nombre/:capitulo", obtenerImagenesCapitulo);

import { actualizarMetadata } from "../controllers/manhwasController.js";

// 📝 Actualizar metadata de un manhwa
router.put("/:nombre/metadata", actualizarMetadata);

// Ruta para obtener los manhwas favoritos del usuario
router.get("/favoritos/:id_usuario", obtenerFavoritos);
router.post("/favoritos", agregarFavorito);
router.delete("/favoritos", eliminarFavorito);

export default router;



