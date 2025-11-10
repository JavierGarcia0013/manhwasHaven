import express from "express";
import {
    subirManhwa,
    obtenerManhwas,
    eliminarManhwa,
    listarCapitulos,
    obtenerImagenesCapitulo,
    actualizarMetadata,
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

// ==================== FAVORITOS ====================
// (Colocadas antes de las rutas dinámicas /:nombre para evitar conflictos)
router.get("/favoritos/:id_usuario", obtenerFavoritos);
router.post("/favoritos", agregarFavorito);
router.delete("/favoritos", eliminarFavorito);

// ==================== CAPÍTULOS ====================

// 📖 Listar capítulos de un manhwa (carpetas capitulo-1, capitulo-2, etc.)
router.get("/:nombre/capitulos", listarCapitulos);

// 🖼️ Obtener imágenes de un capítulo específico
router.get("/:nombre/:capitulo", obtenerImagenesCapitulo);

// 📝 Actualizar metadata de un manhwa
router.put("/:nombre/metadata", actualizarMetadata);

export default router;
