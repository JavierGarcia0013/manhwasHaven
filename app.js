document.addEventListener("DOMContentLoaded", () => {
    const API_USERS = "http://localhost:3000/api/users";
    const API = "https://manhwashaven.onrender.com/api";


    // ==================== REGISTRO ====================
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const usuario = document.getElementById("nuevo-usuario").value.trim();
            const email = document.getElementById("nuevo-email").value.trim();
            const contrasena = document.getElementById("nuevo-contrasena").value.trim();

            const res = await fetch(`${API_USERS}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario, email, contrasena }),
            });

            const data = await res.json();
            alert(data.msg);
            if (res.ok) window.location.href = "iniciar-sesion.html";
        });
    }

    // ==================== LOGIN ====================
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("usuario").value.trim();
            const contrasena = document.getElementById("contrasena").value.trim();

            const res = await fetch(`${API_USERS}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, contrasena }),
            });

            const data = await res.json();
            alert(data.msg);

            if (res.ok) {
                // data.user = { id, usuario, email, rol, token }
                localStorage.setItem("usuarioActual", JSON.stringify(data.user));
                window.location.href = "index.html";
            }
        });
    }
    // ==================== RECUPERAR CONTRASEÑA ====================
    const recoverForm = document.getElementById("recover-form");
    if (recoverForm) {
        recoverForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();

            if (!email) {
                alert("Por favor ingresa tu correo registrado.");
                return;
            }

            try {
                const res = await fetch(`${API_USERS}/recover-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });

                const data = await res.json();
                alert(data.msg);

                if (res.ok) {
                    // Guarda el email para usarlo en la página reset.html
                    localStorage.setItem("recoverEmail", email);
                    window.location.href = "verificar.html";
                }
            } catch (err) {
                console.error("Error al recuperar contraseña:", err);
                alert("❌ Error al conectar con el servidor.");
            }
        });
    }
    // ==================== VERIFICAR CÓDIGO DE RECUPERACIÓN ====================
    const verifyForm = document.getElementById("verify-form");
    if (verifyForm) {
        verifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const codigo = document.getElementById("codigo").value.trim();
            const email = localStorage.getItem("recoverEmail");

            if (!codigo || !email) {
                alert("Por favor ingresa el código recibido.");
                return;
            }

            try {
                const res = await fetch(`${API_USERS}/verify-code`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, codigo }),
                });

                const data = await res.json();
                alert(data.msg);

                if (res.ok) {
                    // Si el código es correcto, pasa a restablecer contraseña
                    window.location.href = "reset.html";
                }
            } catch (err) {
                console.error("Error al verificar código:", err);
                alert("❌ Error al conectar con el servidor.");
            }
        });
    }


    // ==================== RESTABLECER CONTRASEÑA ====================
    const resetForm = document.getElementById("reset-form");
    if (resetForm) {
        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = localStorage.getItem("recoverEmail") || document.getElementById("email").value.trim();
            const nuevaPass = document.getElementById("nuevaPass").value.trim();

            if (!email || !nuevaPass) {
                alert("Por favor completa todos los campos.");
                return;
            }

            try {
                const res = await fetch(`${API_USERS}/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, nuevaPass }),
                });

                const data = await res.json();
                alert(data.msg);

                if (res.ok) {
                    localStorage.removeItem("recoverEmail");
                    window.location.href = "iniciar-sesion.html";
                }
            } catch (err) {
                console.error("Error al restablecer contraseña:", err);
                alert("❌ No se pudo restablecer la contraseña.");
            }
        });
    }


    // ==================== HEADER / SESIÓN ====================
    const userActions = document.getElementById("user-actions");
    const subirBtn = document.getElementById("btn-subir-manhwa"); // puede existir o no
    const usuarioActual = JSON.parse(localStorage.getItem("usuarioActual") || "null");

    if (userActions) {
        if (usuarioActual) {
            userActions.innerHTML = `
        <div class="user-info">
          <span class="user-name">👋 ${usuarioActual.usuario}</span>
          <a href="#" class="logout-btn" id="logout-btn">Cerrar sesión</a>
        </div>
      `;
            const logoutBtn = document.getElementById("logout-btn");
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("usuarioActual");
                window.location.href = "index.html";
            });
            if (subirBtn) {
                subirBtn.style.display = usuarioActual.rol === "admin" ? "inline-block" : "none";
            }
        } else {
            userActions.innerHTML = `
        <a href="iniciar-sesion.html" class="user-btn">Iniciar Sesión</a>
        <a href="registrarse.html" class="user-btn highlight">Registrar</a>
      `;
            if (subirBtn) subirBtn.style.display = "none";
        }
    }

    // ==================== PERFIL ====================
    const perfilDiv = document.getElementById("perfil-info");
    if (perfilDiv) {
        const usuario = JSON.parse(localStorage.getItem("usuarioActual") || "null");
        if (!usuario) {
            perfilDiv.innerHTML = `<p>Debes iniciar sesión para ver tu perfil. 
        <a href="iniciar-sesion.html" class="highlight-link">Iniciar sesión</a></p>`;
        } else {
            perfilDiv.innerHTML = `
        <p><strong>Nombre de usuario:</strong> ${usuario.usuario}</p>
        <p><strong>Correo:</strong> ${usuario.email}</p>
        <p><strong>Rol:</strong> ${usuario.rol}</p>
        <button id="btn-cambiar-pass" class="auth-btn">Cambiar contraseña</button>
        <div id="form-cambio" style="display:none;margin-top:10px;">
          <label>Contraseña actual:</label><input type="password" id="pass-actual">
          <label>Nueva contraseña:</label><input type="password" id="pass-nueva">
          <button id="guardar-pass" class="auth-btn">Guardar cambio</button>
        </div>
      `;
            const btnCambiar = document.getElementById("btn-cambiar-pass");
            const formCambio = document.getElementById("form-cambio");
            btnCambiar.addEventListener("click", () => {
                formCambio.style.display = formCambio.style.display === "none" ? "block" : "none";
            });
            const btnGuardar = document.getElementById("guardar-pass");
            btnGuardar.addEventListener("click", async () => {
                const actual = document.getElementById("pass-actual").value;
                const nueva = document.getElementById("pass-nueva").value;
                const res = await fetch(`${API_USERS}/change-password`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ usuario: usuario.usuario, actual, nueva }),
                });
                const data = await res.json();
                alert(data.msg);
            });
        }
    }

    // ==================== BIBLIOTECA: filtros + búsqueda + orden ====================
    const contenedor = document.getElementById("contenedor-manhwas");
    const mensaje = document.getElementById("mensaje");
    const searchInput = document.getElementById("search-input");
    const applyBtn = document.getElementById("apply-filters");
    const clearBtn = document.getElementById("clear-filters");
    const orderBySel = document.getElementById("order-by");

    // Dropdowns (tipo, demografia, estado, erotico, generos)
    const dropdowns = document.querySelectorAll(".filter-dropdown");

    // Solo ejecutamos esta parte si estamos en biblioteca.html
    if (contenedor) {
        let allManhwas = [];
        let filtered = [];

        // Cerrar otros dropdowns cuando uno se abre
        dropdowns.forEach((dd) => {
            const trigger = dd.querySelector(".filter-trigger");
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                const isOpen = dd.classList.contains("open");
                dropdowns.forEach(d2 => d2.classList.remove("open"));
                if (!isOpen) dd.classList.add("open");
            });
        });
        // Cerrar si clic fuera
        document.addEventListener("click", () => dropdowns.forEach(d => d.classList.remove("open")));

        function getCheckedValuesFor(key) {
            // key = data-key: tipo/demografia/estado/erotico/generos
            const dd = document.querySelector(`.filter-dropdown[data-key="${key}"]`);
            if (!dd) return [];
            return Array.from(dd.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
        }

        function renderList(list) {
            contenedor.innerHTML = "";
            if (!list.length) {
                mensaje.textContent = "⚠️ No se encontraron resultados con esos filtros.";
                return;
            }
            mensaje.textContent = "";
            list.forEach(m => {
                const card = document.createElement("div");
                card.className = "card";

                // portada puede ser ruta relativa servida desde backend
                const imgSrc = m.portada ? `http://localhost:3000/${m.portada}` : "img/sin-portada.png";

                card.innerHTML = `
          <img src="${imgSrc}" alt="${m.titulo}">
          <div class="card-content">
            <h3 title="${m.titulo}">${m.titulo}</h3>
            <div class="meta">
              <span><strong>Tipo:</strong> ${m.tipo || "N/D"}</span>
              <span><strong>Demografía:</strong> ${m.demografia || "N/D"}</span>
              <span><strong>Estado:</strong> ${m.estado || "N/D"}</span>
              <span><strong>Erótico:</strong> ${m.erotico || "N/D"}</span>
            </div>
            <a href="detalle.html?id=${m.id}" class="btn-detalle">Ver detalles</a>
          </div>
        `;
                contenedor.appendChild(card);
            });
        }

        function applyFilters() {
            const q = (searchInput?.value || "").toLowerCase().trim();
            const tipos = getCheckedValuesFor("tipo");
            const demos = getCheckedValuesFor("demografia");
            const estados = getCheckedValuesFor("estado");
            const eroticos = getCheckedValuesFor("erotico");
            const generos = getCheckedValuesFor("generos"); // si luego guardas generos en BD

            filtered = allManhwas.filter(m => {
                // búsqueda por título
                if (q && !m.titulo?.toLowerCase().includes(q)) return false;

                // filtros exactos si hay selección
                if (tipos.length && !tipos.includes(m.tipo)) return false;
                if (demos.length && !demos.includes(m.demografia)) return false;
                if (estados.length && !estados.includes(m.estado)) return false;
                if (eroticos.length && !eroticos.includes(m.erotico)) return false;

                // géneros (si los manejas como un string separado por comas en m.generos)
                if (generos.length) {
                    const mg = (m.generos || "").split(",").map(s => s.trim());
                    const hasAll = generos.every(g => mg.includes(g));
                    if (!hasAll) return false;
                }
                return true;
            });

            // orden
            const orderBy = orderBySel?.value || "titulo";
            const dir = (document.querySelector('input[name="dir"]:checked')?.value || "asc").toLowerCase();

            filtered.sort((a, b) => {
                let A = a[orderBy] ?? "";
                let B = b[orderBy] ?? "";
                // fecha_subida si viene como string/fecha
                if (orderBy === "fecha_subida") {
                    A = new Date(A).getTime() || 0;
                    B = new Date(B).getTime() || 0;
                } else {
                    A = ("" + A).toLowerCase();
                    B = ("" + B).toLowerCase();
                }
                if (A < B) return dir === "asc" ? -1 : 1;
                if (A > B) return dir === "asc" ? 1 : -1;
                return 0;
            });

            renderList(filtered);
        }

        function clearFilters() {
            if (searchInput) searchInput.value = "";
            dropdowns.forEach(dd => {
                dd.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
            });
            if (orderBySel) orderBySel.value = "titulo";
            const asc = document.querySelector('input[name="dir"][value="asc"]');
            if (asc) asc.checked = true;
            applyFilters();
        }

        async function loadManhwas() {
            try {
                const res = await fetch(API_MANHWAS);
                allManhwas = await res.json();
            } catch (err) {
                console.error("Error cargando manhwas:", err);
                allManhwas = [];
            }
            filtered = [...allManhwas];
            renderList(filtered);
        }

        // Eventos
        if (applyBtn) applyBtn.addEventListener("click", applyFilters);
        if (clearBtn) clearBtn.addEventListener("click", clearFilters);
        if (searchInput) searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") applyFilters();
        });

        loadManhwas();
    }

});
