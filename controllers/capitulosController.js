import fs from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "uploads", "manhwas");

// ============================================================
// 📖 LISTAR CAPÍTULOS (URLs absolutas con dominio Render)
// ============================================================
export const listarCapitulos = (req, res) => {
    try {
        const { nombre } = req.params;
        const dir = path.join(baseDir, nombre);
        if (!fs.existsSync(dir)) return res.status(404).json({ msg: "❌ Manhwa no encontrado" });

        const items = fs.readdirSync(dir, { withFileTypes: true });
        const capitulos = items
            .filter((d) => d.isDirectory() && /^cap[ií]tulo[-_\s]?\d+$/i.test(d.name))
            .map((d) => {
                const capDir = path.join(dir, d.name);
                const imagenes = fs.readdirSync(capDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
                return {
                    nombre: d.name,
                    portada: imagenes.length > 0
                        ? `${res.locals.baseUrl}/uploads/manhwas/${nombre}/${d.name}/${imagenes[0]}`
                        : null,
                };
            })
            .sort((a, b) => parseInt(a.nombre.replace(/\D/g, "")) - parseInt(b.nombre.replace(/\D/g, "")));

        res.json({ total: capitulos.length, capitulos });
    } catch (err) {
        console.error("Error listando capítulos:", err);
        res.status(500).json({ msg: "Error al listar capítulos" });
    }
};

// ============================================================
// 🖼️ OBTENER IMÁGENES DE CAPÍTULO
// ============================================================
export const obtenerImagenesCapitulo = (req, res) => {
    try {
        const { nombre, capitulo } = req.params;
        const capDir = path.join(baseDir, nombre, capitulo);

        if (!fs.existsSync(capDir)) return res.status(404).json({ msg: "❌ Capítulo no encontrado" });

        const imagenes = fs.readdirSync(capDir)
            .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((f) => `${res.locals.baseUrl}/uploads/manhwas/${nombre}/${capitulo}/${f}`);

        res.json({ nombre, capitulo, total: imagenes.length, imagenes });
    } catch (err) {
        console.error("Error obteniendo imágenes del capítulo:", err);
        res.status(500).json({ msg: "Error al obtener imágenes del capítulo" });
    }
};
