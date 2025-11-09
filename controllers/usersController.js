import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ==================== CONFIGURAR NODEMAILER ====================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ==================== REGISTRO ====================
export const register = (req, res) => {
    // acepta ambos nombres para compatibilidad
    const user = req.body.user || req.body.usuario;
    const email = req.body.email;
    const pass = req.body.pass || req.body.contrasena;

    if (!user || !email || !pass) {
        return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    db.query(
        "SELECT * FROM usuarios WHERE email = ? OR user = ?",
        [email, user],
        async (err, results) => {
            if (err) return res.status(500).json({ msg: "Error interno" });
            if (results.length > 0)
                return res.status(400).json({ msg: "El usuario o email ya existen" });

            const hashedPass = await bcrypt.hash(pass, 10);
            db.query(
                "INSERT INTO usuarios (user, email, pass) VALUES (?, ?, ?)",
                [user, email, hashedPass],
                (err) => {
                    if (err) return res.status(500).json({ msg: "Error al registrar usuario" });
                    res.json({ msg: "✅ Registro exitoso" });
                }
            );
        }
    );
};


// ==================== LOGIN ====================
export const login = (req, res) => {
    const user = req.body.user || req.body.email || req.body.usuario;
    const pass = req.body.pass || req.body.contrasena;

    if (!user || !pass)
        return res.status(400).json({ msg: "Usuario y contraseña requeridos" });

    db.query(
        "SELECT * FROM usuarios WHERE email = ? OR user = ?",
        [user, user],
        async (err, results) => {
            if (err) return res.status(500).json({ msg: "Error interno" });
            if (results.length === 0)
                return res.status(404).json({ msg: "Usuario no encontrado" });

            const usuario = results[0];
            const valid = await bcrypt.compare(pass, usuario.pass);
            if (!valid) return res.status(401).json({ msg: "Contraseña incorrecta" });

            const token = jwt.sign(
                { id: usuario.id, rol: usuario.rol },
                process.env.JWT_SECRET,
                { expiresIn: "2h" }
            );

            res.json({
                msg: "Inicio de sesión exitoso",
                user: {
                    id: usuario.id,
                    user: usuario.user,
                    email: usuario.email,
                    rol: usuario.rol,
                    token,
                },
            });
        }
    );
};


// ==================== CAMBIAR CONTRASEÑA ====================
export const changePassword = (req, res) => {
    const { user, actual, nueva } = req.body;

    db.query("SELECT * FROM usuarios WHERE user = ?", [user], async (err, results) => {
        if (err) return res.status(500).json({ msg: "Error interno" });
        if (results.length === 0)
            return res.status(404).json({ msg: "Usuario no encontrado" });

        const usuario = results[0];
        const valid = await bcrypt.compare(actual, usuario.pass);
        if (!valid) return res.status(401).json({ msg: "Contraseña actual incorrecta" });

        const hashed = await bcrypt.hash(nueva, 10);
        db.query("UPDATE usuarios SET pass = ? WHERE id = ?", [hashed, usuario.id], (err) => {
            if (err) return res.status(500).json({ msg: "Error al actualizar contraseña" });
            res.json({ msg: "✅ Contraseña actualizada correctamente" });
        });
    });
};

// ==================== RECUPERAR CONTRASEÑA ====================
export const recoverPassword = (req, res) => {
    const { email } = req.body;

    db.query("SELECT * FROM usuarios WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ msg: "Error interno" });
        if (results.length === 0)
            return res.status(404).json({ msg: "No se encontró el correo" });

        const codigo = Math.floor(100000 + Math.random() * 900000);
        const usuario = results[0];

        await transporter.sendMail({
            from: `"Manhwas Haven" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: "🔐 Recuperación de contraseña - Manhwas Haven",
            html: `
        <div style="font-family: Arial; background-color: #111; color: #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #b073ff;">Hola, ${usuario.user}</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Tu código de verificación es:</p>
          <h3 style="color: #c59cff; font-size: 24px;">${codigo}</h3>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      `,
        });

        db.query(
            "UPDATE usuarios SET codigo_recuperacion = ? WHERE id = ?",
            [codigo, usuario.id]
        );
        res.json({ msg: "✅ Código enviado al correo registrado" });
    });
};

// ==================== VERIFICAR CÓDIGO ====================
export const verifyCode = (req, res) => {
    const { email, codigo } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE email = ? AND codigo_recuperacion = ?",
        [email, codigo],
        (err, results) => {
            if (err) return res.status(500).json({ msg: "Error interno" });
            if (results.length === 0)
                return res.status(400).json({ msg: "Código inválido o expirado" });

            res.json({ msg: "✅ Código verificado correctamente" });
        }
    );
};

// ==================== RESTABLECER CONTRASEÑA ====================
export const resetPassword = async (req, res) => {
    const { email, nuevaPass } = req.body;

    if (!email || !nuevaPass) {
        return res.status(400).json({ msg: "Faltan datos" });
    }

    try {
        const hashedPass = await bcrypt.hash(nuevaPass, 10);
        db.query(
            "UPDATE usuarios SET pass = ? WHERE email = ?",
            [hashedPass, email],
            (err, result) => {
                if (err) return res.status(500).json({ msg: "Error al actualizar contraseña" });
                if (result.affectedRows === 0)
                    return res.status(404).json({ msg: "Usuario no encontrado" });
                return res.json({ msg: "✅ Contraseña actualizada correctamente" });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};
