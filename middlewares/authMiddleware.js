import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ msg: "Token no proporcionado" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ msg: "Formato de token inválido" });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // ← Aquí guardamos los datos del usuario
        next();
    } catch (error) {
        console.error("Error en verificación de token:", error.message);
        return res.status(403).json({ msg: "Token inválido o expirado" });
    }
};
