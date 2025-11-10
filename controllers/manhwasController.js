import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import db from "../db.js";

const baseDir = path.join(process.cwd(), "uploads", "manhwas");

// ============================================================
// 🔹 Limpieza de nombres de carpetas
// ============================================================
function sanitizeName(name) {
    return String(name)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .replace(/\s+/g, "_")
        .trim();
}

// ============================================================
// 🟢 SUBIR MANHWA (ahora guarda portada con dominio Render)
// ============================================================
export const subirManhwa = (req, res) => {
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
            return res
                .status(403)
                .json({ msg: "❌ Solo los administradores pueden subir manhwas" });
        }

        const { titulo, tipo, demografia, estado, erotico, generos, descripcion, portada, id_usuario } = req.body;
        if (!titulo) return res.status(400).json({ msg: "Título requerido" });

        const generosArr = Array.isArray(generos)
            ? generos
            : (typeof generos === "string" && generos.length
                ? generos.split(",").map((g) => g.trim()).filter(Boolean)
                : []);

        const safeName = sanitizeName(titulo);
        const dir = path.join(baseDir, safeName);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(path.join(dir, "descripcion.txt"), descripcion || "Sin descripción disponible.");

        const meta = {
            tipo: tipo || "Desconocido",
            demografia: demografia || "N/A",
            estado: estado || "N/A",
            erotico: !!erotico,
            generos: generosArr,
        };
        fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(meta, null, 2));

        let portadaUrl = null;
        if (typeof portada === "string" && portada.startsWith("data:image")) {
            const base64Data = portada.split(",")[1];
            const portadaPath = path.join(dir, "portada.png");
            fs.writeFileSync(portadaPath, Buffer.from(base64Data, "base64"));
            portadaUrl = `${res.locals.baseUrl}/uploads/manhwas/${safeName}/portada.png`;
        }

        const sql = `
      INSERT INTO manhwas (titulo, tipo, demografia, estado, erotico, descripcion, portada, id_usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db.query(sql, [titulo, tipo, demografia, estado, !!erotico, descripcion, portadaUrl, id_usuario], (err) => {
            if (err) {
                console.error("Error al subir manhwa:", err);
                return res.status(500).json({ msg: "Error al subir manhwa" });
            }

            res.json({
                msg: "✅ Manhwa subido correctamente",
                portada: portadaUrl,
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ msg: "Error interno" });
    }
};

// ============================================================
// 📚 LISTAR MANHWAS (URLs absolutas)
// ============================================================
export const obtenerManhwas = (req, res) => {
    try {
        const carpetas = fs.existsSync(baseDir)
            ? fs.readdirSync(baseDir, { withFileTypes: true })
                .filter((d) => d.isDirectory())
                .map((d) => d.name)
            : [];

        const { tipo, demografia, estado, erotico, generos } = req.query;
        const tipoArr = tipo ? tipo.split(",").map((s) => s.trim()) : [];
        const demoArr = demografia ? demografia.split(",").map((s) => s.trim()) : [];
        const estadoArr = estado ? estado.split(",").map((s) => s.trim()) : [];
        const generosArr = generos ? generos.split(",").map((s) => s.trim()) : [];
        const eroticoBool = erotico === "true" ? true : erotico === "false" ? false : null;

        const manhwas = carpetas.map((nombre) => {
            const dir = path.join(baseDir, nombre);
            const descPath = path.join(dir, "descripcion.txt");
            const desc = fs.existsSync(descPath)
                ? fs.readFileSync(descPath, "utf8").trim()
                : "Sin descripción disponible.";

            const portada = fs.existsSync(path.join(dir, "portada.png"))
                ? `${res.locals.baseUrl}/uploads/manhwas/${nombre}/portada.png`
                : null;

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

        const filtrados = manhwas.filter((m) => {
            const tipoOk = !tipoArr.length || tipoArr.includes(m.tipo);
            const demoOk = !demoArr.length || demoArr.includes(m.demografia);
            const estadoOk = !estadoArr.length || estadoArr.includes(m.estado);
            const eroticoOk = eroticoBool === null || m.erotico === eroticoBool;
            const generoOk = !generosArr.length || m.generos.some((g) => generosArr.includes(g));
            return tipoOk && demoOk && estadoOk && eroticoOk && generoOk;
        });

        res.json(filtrados);
    } catch (err) {
        console.error("Error listando manhwas:", err);
        res.status(500).json({ msg: "Error al listar manhwas" });
    }
};

// ============================================================
// 📖 LISTAR CAPÍTULOS
// ============================================================
export const listarCapitulos = (req, res) => {
    const { nombre } = req.params;
    const dir = path.join(baseDir, nombre);
    if (!fs.existsSync(dir)) return res.status(404).json({ msg: "Manhwa no encontrado" });

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
};

// ============================================================
// 🖼️ OBTENER IMÁGENES DE CAPÍTULO
// ============================================================
export const obtenerImagenesCapitulo = (req, res) => {
    const { nombre, capitulo } = req.params;
    const capDir = path.join(baseDir, nombre, capitulo);

    if (!fs.existsSync(capDir)) return res.status(404).json({ msg: "Capítulo no encontrado" });

    const imagenes = fs.readdirSync(capDir)
        .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => `${res.locals.baseUrl}/uploads/manhwas/${nombre}/${capitulo}/${f}`);

    res.json({ nombre, capitulo, total: imagenes.length, imagenes });
};

// ============================================================
// 📝 ACTUALIZAR METADATA
// ============================================================
export const actualizarMetadata = (req, res) => {
    const { nombre } = req.params;
    const dir = path.join(baseDir, nombre);

    if (!fs.existsSync(dir)) return res.status(404).json({ msg: "❌ Manhwa no encontrado" });

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
// === OBTENER MANHWAS FAVORITOS DE UN USUARIO ===
export const obtenerFavoritos = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const [rows] = await db.query(
            `SELECT m.id, m.nombre, m.portada, m.tipo, m.demografia
       FROM favoritos f
       INNER JOIN manhwas m ON f.id_manhwa = m.id
       WHERE f.id_usuario = $1
       ORDER BY m.nombre ASC`,
            [id_usuario]
        );

        if (!rows || rows.length === 0)
            return res.status(200).json([]);

        res.status(200).json(rows);
    } catch (err) {
        console.error("❌ Error al obtener favoritos:", err);
        res.status(500).json({ msg: "Error al obtener manhwas favoritos" });
    }
};

// === AGREGAR UN MANHWA A FAVORITOS ===
export const agregarFavorito = async (req, res) => {
    try {
        const { id_usuario, id_manhwa } = req.body;

        // 🔹 1️⃣ Obtener ID real del manhwa por nombre
        const [manhwa] = await db.query(
            `SELECT id FROM manhwas WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
            [id_manhwa]
        );

        if (!manhwa.length)
            return res.status(404).json({ msg: "No se encontró el manhwa especificado" });

        const manhwaId = manhwa[0].id;

        // 🔹 2️⃣ Verificar duplicado
        const [existe] = await db.query(
            `SELECT 1 FROM favoritos WHERE id_usuario = $1 AND id_manhwa = $2`,
            [id_usuario, manhwaId]
        );

        if (existe.length > 0)
            return res.status(200).json({ msg: "El manhwa ya está en favoritos" });

        // 🔹 3️⃣ Insertar nuevo
        await db.query(
            `INSERT INTO favoritos (id_usuario, id_manhwa) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
            [id_usuario, manhwaId]
        );

        res.status(201).json({ msg: "Manhwa agregado a favoritos" });
    } catch (err) {
        console.error("❌ Error al agregar favorito:", err);
        res.status(500).json({ msg: "Error al agregar favorito" });
    }
};

// === ELIMINAR UN MANHWA DE FAVORITOS ===
export const eliminarFavorito = async (req, res) => {
    try {
        const { id_usuario, id_manhwa } = req.body;

        // 🔹 1️⃣ Obtener ID real del manhwa por nombre
        const [manhwa] = await db.query(
            `SELECT id FROM manhwas WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
            [id_manhwa]
        );

        if (!manhwa.length)
            return res.status(404).json({ msg: "No se encontró el manhwa especificado" });

        const manhwaId = manhwa[0].id;

        // 🔹 2️⃣ Eliminar favorito
        const [resultado] = await db.query(
            `DELETE FROM favoritos WHERE id_usuario = $1 AND id_manhwa = $2`,
            [id_usuario, manhwaId]
        );

        if (resultado.rowCount === 0)
            return res.status(200).json({ msg: "Este manhwa no estaba en tus favoritos" });

        res.status(200).json({ msg: "Manhwa eliminado de favoritos" });
    } catch (err) {
        console.error("❌ Error al eliminar favorito:", err);
        res.status(500).json({ msg: "Error al eliminar favorito" });
    }
};
// 🗑️ Eliminar un manhwa por su ID
export const eliminarManhwa = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM manhwas WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "No se encontró el manhwa a eliminar" });
    }

    res.json({ msg: "✅ Manhwa eliminado correctamente", eliminado: result.rows[0] });
  } catch (err) {
    console.error("Error al eliminar manhwa:", err);
    res.status(500).json({ msg: "Error al eliminar manhwa" });
  }
};




