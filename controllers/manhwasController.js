import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const baseDir = path.join(process.cwd(), "uploads", "manhwas");

// ============================================================
// 🔹 Función auxiliar para limpiar nombres de carpetas
// ============================================================
function sanitizeName(name) {
    return String(name)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")   // elimina tildes
        .replace(/[^a-zA-Z0-9 _-]/g, "")   // deja solo letras/números/espacios/_/-
        .replace(/\s+/g, "_")              // espacios -> _
        .trim();
}

// ============================================================
// 🟢 SUBIR MANHWA (con validación JWT y géneros dinámicos)
// ============================================================
export const subirManhwa = (req, res) => {
    try {
        // 1️⃣ Validar token y rol
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
            return res.status(403).json({ msg: "❌ Solo los administradores pueden subir manhwas" });
        }

        // 2️⃣ Extraer campos del body
        const { titulo, tipo, demografia, estado, erotico, generos, descripcion, portada, id_usuario } = req.body;
        if (!titulo) return res.status(400).json({ msg: "Título requerido" });

        const generosArr = Array.isArray(generos)
            ? generos
            : (typeof generos === "string" && generos.length
                ? generos.split(",").map(g => g.trim()).filter(Boolean)
                : []);

        // 3️⃣ Insertar en base de datos
        const sql = `
      INSERT INTO manhwas (titulo, tipo, demografia, estado, erotico, descripcion, portada, id_usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db.query(sql, [titulo, tipo, demografia, estado, !!erotico, descripcion, null, id_usuario], (err) => {
            if (err) {
                console.error("Error al subir manhwa:", err);
                return res.status(500).json({ msg: "Error al subir manhwa" });
            }

            // 4️⃣ Crear carpeta, metadata y portada
            try {
                const safeName = sanitizeName(titulo);
                const dir = path.join(baseDir, safeName);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                // Descripción
                fs.writeFileSync(path.join(dir, "descripcion.txt"), descripcion || "Sin descripción disponible.");

                // Metadata
                const meta = {
                    tipo: tipo || "Desconocido",
                    demografia: demografia || "N/A",
                    estado: estado || "N/A",
                    erotico: !!erotico,
                    generos: generosArr,
                };
                fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(meta, null, 2));

                // Portada
                if (typeof portada === "string" && portada.startsWith("data:image")) {
                    const base64Data = portada.split(",")[1];
                    fs.writeFileSync(path.join(dir, "portada.png"), Buffer.from(base64Data, "base64"));
                }
            } catch (e) {
                console.error("⚠️ Error creando carpeta o metadata:", e);
            }

            res.json({ msg: "✅ Manhwa subido correctamente y carpeta creada con metadata" });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ msg: "Error interno" });
    }
};

// ============================================================
// ==================== LISTAR MANHWAS ====================
export const obtenerManhwas = (req, res) => {
    try {
        const carpetas = fs.existsSync(baseDir)
            ? fs.readdirSync(baseDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name)
            : [];

        const { tipo, demografia, estado, erotico, generos } = req.query;

        const tipoArr = tipo ? tipo.split(",").map(s => s.trim()) : [];
        const demoArr = demografia ? demografia.split(",").map(s => s.trim()) : [];
        const estadoArr = estado ? estado.split(",").map(s => s.trim()) : [];
        const generosArr = generos ? generos.split(",").map(s => s.trim()) : [];
        const eroticoBool = erotico === "true" ? true : erotico === "false" ? false : null;

        const manhwas = carpetas.map(nombre => {
            const dir = path.join(baseDir, nombre);

            // Leer descripción
            const descPath = path.join(dir, "descripcion.txt");
            const desc = fs.existsSync(descPath)
                ? fs.readFileSync(descPath, "utf8").trim()
                : "Sin descripción disponible.";

            // Leer portada
            const portada = fs.existsSync(path.join(dir, "portada.png"))
                ? `/uploads/manhwas/${nombre}/portada.png`
                : null;

            // Leer metadata
            let meta = {};
            const metaPath = path.join(dir, "metadata.json");
            if (fs.existsSync(metaPath)) {
                try {
                    meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
                } catch {
                    meta = {};
                }
            }

            return {
                nombre,
                descripcion: desc,
                portada,
                tipo: meta.tipo || "Desconocido",
                demografia: meta.demografia || "N/A",
                estado: meta.estado || "Sin definir",
                erotico: meta.erotico || false,
                generos: meta.generos || [],
            };
        });

        // Filtros dinámicos
        const filtrados = manhwas.filter(m => {
            const tipoOk = !tipoArr.length || tipoArr.includes(m.tipo);
            const demoOk = !demoArr.length || demoArr.includes(m.demografia);
            const estadoOk = !estadoArr.length || estadoArr.includes(m.estado);
            const eroticoOk = eroticoBool === null || m.erotico === eroticoBool;
            const generoOk = !generosArr.length || m.generos.some(g => generosArr.includes(g));
            return tipoOk && demoOk && estadoOk && eroticoOk && generoOk;
        });

        res.json(filtrados);
    } catch (err) {
        console.error("Error listando manhwas:", err);
        res.status(500).json({ msg: "Error al listar manhwas" });
    }
};


// ============================================================
// 🗑️ ELIMINAR MANHWA (solo BD)
// ============================================================
export const eliminarManhwa = (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM manhwas WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: "Error al eliminar manhwa" });
        }
        res.json({ msg: "🗑️ Manhwa eliminado correctamente" });
    });
};

// ============================================================
// 📖 LISTAR CAPÍTULOS POR CARPETA
// ============================================================
export const listarCapitulos = (req, res) => {
    const { nombre } = req.params;
    const dir = path.join(baseDir, nombre);

    if (!fs.existsSync(dir)) {
        return res.status(404).json({ msg: "Manhwa no encontrado" });
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });
    const capitulos = items
        .filter(d => d.isDirectory() && /^cap[ií]tulo[-_\s]?\d+$/i.test(d.name))
        .map(d => {
            const capDir = path.join(dir, d.name);
            const imagenes = fs.readdirSync(capDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
            return {
                nombre: d.name,
                portada: imagenes.length > 0 ? `/uploads/manhwas/${nombre}/${d.name}/${imagenes[0]}` : null,
            };
        })
        .sort((a, b) => parseInt(a.nombre.replace(/\D/g, "")) - parseInt(b.nombre.replace(/\D/g, "")));

    res.json({ total: capitulos.length, capitulos });
};

// ============================================================
// 🖼️ OBTENER IMÁGENES DE UN CAPÍTULO
// ============================================================
export const obtenerImagenesCapitulo = (req, res) => {
    const { nombre, capitulo } = req.params;
    const capDir = path.join(baseDir, nombre, capitulo);

    if (!fs.existsSync(capDir)) {
        return res.status(404).json({ msg: "Capítulo no encontrado" });
    }

    const imagenes = fs.readdirSync(capDir)
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map(f => `/uploads/manhwas/${nombre}/${capitulo}/${f}`);

    res.json({ nombre, capitulo, total: imagenes.length, imagenes });
};

// ============================================================
// 📝 ACTUALIZAR METADATA DE UN MANHWA
// ============================================================
export const actualizarMetadata = (req, res) => {
    const { nombre } = req.params;
    const dir = path.join(baseDir, nombre);

    if (!fs.existsSync(dir)) {
        return res.status(404).json({ msg: "❌ Manhwa no encontrado" });
    }

    const metaPath = path.join(dir, "metadata.json");
    let meta = {};

    if (fs.existsSync(metaPath)) {
        try {
            meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        } catch {
            meta = {};
        }
    }

    const { tipo, demografia, estado, erotico, generos } = req.body;

    meta.tipo = tipo || meta.tipo || "Desconocido";
    meta.demografia = demografia || meta.demografia || "N/A";
    meta.estado = estado || meta.estado || "N/A";
    meta.erotico = erotico !== undefined ? erotico : meta.erotico || false;
    meta.generos = Array.isArray(generos)
        ? generos
        : (generos ? [generos] : meta.generos || []);

    try {
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        res.json({ msg: "✅ Metadata actualizada correctamente", meta });
    } catch (err) {
        console.error("Error actualizando metadata:", err);
        res.status(500).json({ msg: "Error al guardar metadata" });
    }
};
