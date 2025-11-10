import express from "express";
import {
    register,
    login,
    changePassword,
    recoverPassword,
    verifyCode,
    resetPassword,
} from "../controllers/usersController.js";
import { getPerfil, actualizarUsuario } from "../controllers/usersController.js";
import { verificarToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/perfil", verificarToken, getPerfil);
router.put("/actualizar", verificarToken, actualizarUsuario);


// ==================== RUTAS DE USUARIOS ====================

// Registro
router.post("/register", register);

// Inicio de sesión
router.post("/login", login);

// Cambiar contraseña desde perfil
router.put("/change-password", changePassword);

// Recuperar contraseña (envío de correo con código)
router.post("/recover-password", recoverPassword);

// Verificar código enviado por correo
router.post("/verify-code", verifyCode);

// Restablecer contraseña luego de verificar código
router.post("/reset-password", resetPassword);

export default router;
