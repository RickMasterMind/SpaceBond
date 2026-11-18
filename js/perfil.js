/* Estilos de perfil, llamadas y visor de fotos. Se inyectan desde aqui
   para que funcionen aunque el navegador tenga guardado un CSS viejo. */
(function () {
    const st = document.createElement("style");
    st.id = "bondspace-estilos-perfil";
    st.textContent = "/* ==========================================================\n   CONFIGURACION Y PERFIL\n========================================================== */\n\n.avatar-img { width: 100%; height: 100%; max-width: 100%; object-fit: cover; border-radius: 50%; display: block; cursor: zoom-in; }\n.usuario-avatar, .integrante-avatar, .llamada-avatar, .perfil-avatar { overflow: hidden; border-radius: 50%; flex: none; }\n.usuario-avatar { width: 42px; height: 42px; }\n.integrante-avatar { width: 46px; height: 46px; }\n\n.perfil-grid { display: grid; grid-template-columns: 290px 1fr; gap: 24px; max-width: 960px; align-items: start; }\n\n.perfil-resumen { background: white; border: 1px solid var(--borde); border-radius: 22px; overflow: hidden; text-align: center; padding-bottom: 26px; box-shadow: var(--sombra); }\n.perfil-banner { height: 96px; background: linear-gradient(135deg, var(--principal), var(--rosa)); }\n.perfil-avatar-btn { position: relative; display: block; width: 108px; height: 108px; margin: -54px auto 12px; cursor: pointer; }\n.perfil-avatar { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: #eeeaff; color: var(--principal); font-size: 40px; font-weight: 700; border: 5px solid white; box-shadow: 0 6px 18px rgba(55, 45, 100, 0.18); }\n.perfil-camara { cursor: pointer; position: absolute; right: 2px; bottom: 4px; width: 34px; height: 34px; border-radius: 50%; background: var(--principal); color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 3px solid white; transition: 0.2s; }\n.perfil-avatar-btn:hover .perfil-camara { transform: scale(1.12); background: var(--principal-oscuro); }\n.perfil-resumen h3 { font-size: 20px; padding: 0 16px; word-break: break-word; }\n.perfil-rol { display: inline-block; margin-top: 8px; padding: 4px 14px; border-radius: 20px; background: #eeeaff; color: var(--principal); font-size: 12px; font-weight: 700; }\n.perfil-espacio { margin-top: 12px; color: var(--texto-secundario); font-size: 13px; padding: 0 16px; }\n.perfil-resumen-acc { display: flex; flex-direction: column; gap: 10px; padding: 22px 22px 0; }\n.perfil-resumen-acc .btn { width: 100%; justify-content: center; cursor: pointer; }\n\n.perfil-form { display: flex; flex-direction: column; gap: 20px; }\n.perfil-bloque { background: white; border: 1px solid var(--borde); border-radius: 22px; padding: 24px; box-shadow: var(--sombra); }\n.bloque-titulo { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }\n.bloque-titulo h3 { font-size: 17px; }\n.bloque-titulo p { color: var(--texto-secundario); font-size: 13px; margin-top: 2px; }\n.bloque-icono { width: 42px; height: 42px; border-radius: 12px; background: #eeeaff; color: var(--principal); display: flex; align-items: center; justify-content: center; flex: none; }\n.bloque-icono.privado { background: #e6f7ee; color: #35a866; }\n\n.perfil-bloque .campo { margin-top: 14px; }\n.perfil-bloque .campo:first-of-type { margin-top: 0; }\n.perfil-bloque .campo label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; color: var(--texto); }\n.campo-input { position: relative; }\n.campo-input > i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--texto-secundario); font-size: 14px; pointer-events: none; transition: 0.2s; }\n.campo-input input { width: 100%; padding: 13px 14px 13px 40px; border-radius: 12px; border: 1px solid var(--borde); background: #fbfbfe; font-size: 14px; font-family: inherit; outline: none; transition: 0.2s; }\n.campo-input input:focus { border-color: var(--principal); background: white; box-shadow: 0 0 0 4px rgba(124, 92, 255, 0.12); }\n.campo-input:focus-within > i { color: var(--principal); }\n.perfil-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }\n.perfil-fila .campo { margin-top: 0; }\n\n.perfil-error { color: #e5484d; font-size: 13px; min-height: 18px; }\n.btn-guardar { align-self: flex-start; padding-left: 28px; padding-right: 28px; }\n\n@media (max-width: 800px) { .perfil-grid { grid-template-columns: 1fr; } }\n@media (max-width: 550px) { .perfil-fila { grid-template-columns: 1fr; } }\n\n\n/* ==========================================================\n   LLAMADAS A INTEGRANTES\n========================================================== */\n\n.integrante-acciones { display: flex; gap: 8px; margin-left: 12px; }\n.btn-llamar { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--borde); background: white; color: var(--principal); cursor: pointer; transition: 0.2s; }\n.btn-llamar:hover { background: var(--principal); color: white; border-color: var(--principal); transform: translateY(-2px); }\n.btn-llamar:focus-visible { outline: 3px solid rgba(124, 92, 255, 0.45); outline-offset: 2px; }\n\n.modal-contenido.llamada { max-width: 420px; text-align: center; background: #1f1d33; color: white; padding: 26px; }\n.llamada-escenario { position: relative; height: 260px; border-radius: 18px; overflow: hidden; background: #2b2946; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }\n.llamada-avatar { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; background: #3a3760; color: white; font-size: 46px; font-weight: 700; display: flex; align-items: center; justify-content: center; animation: latido-llamada 1.8s ease-in-out infinite; }\n.llamada.conectada .llamada-avatar { animation: none; }\n#videoRemoto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }\n#videoLocal { position: absolute; right: 10px; bottom: 10px; width: 92px; height: 120px; object-fit: cover; border-radius: 12px; border: 2px solid white; background: #000; }\n.llamada h2 { color: white; font-size: 20px; }\n.llamada-estado { color: #bdb9e0; font-size: 14px; margin: 6px 0 20px; }\n.llamada-botones { display: flex; justify-content: center; gap: 18px; }\n.llamada-botones[hidden] { display: none; }\n.llamada-btn { width: 56px; height: 56px; border: none; border-radius: 50%; color: white; font-size: 18px; cursor: pointer; transition: 0.2s; }\n.llamada-btn:hover { transform: scale(1.08); }\n.llamada-btn.aceptar { background: #35a866; }\n.llamada-btn.rechazar { background: #e5484d; }\n.llamada-btn.neutro { background: #3a3760; }\n.llamada-btn.neutro.apagado { background: white; color: #1f1d33; }\n.llamada-btn:focus-visible { outline: 3px solid rgba(255, 255, 255, 0.6); outline-offset: 3px; }\n\n@keyframes latido-llamada { 0%, 100% { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0.5); } 50% { box-shadow: 0 0 0 22px rgba(124, 92, 255, 0); } }\n@media (prefers-reduced-motion: reduce) { .llamada-avatar { animation: none; } }\n\n\n/* ==========================================================\n   VISOR DE FOTO (estilo WhatsApp)\n========================================================== */\n\n.visor-avatar { position: fixed; inset: 0; z-index: 3000; background: rgba(12, 11, 24, 0.94); display: flex; flex-direction: column; animation: aparecer-visor 0.2s ease; }\n.visor-avatar[hidden] { display: none; }\n.visor-barra { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 18px; color: white; }\n.visor-barra strong { font-size: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.visor-cerrar { width: 42px; height: 42px; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.12); color: white; font-size: 18px; cursor: pointer; flex: none; transition: 0.2s; }\n.visor-cerrar:hover { background: rgba(255, 255, 255, 0.25); }\n.visor-cuerpo { flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px 16px 28px; min-height: 0; }\n.visor-cuerpo img { max-width: min(94vw, 760px); max-height: 100%; object-fit: contain; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); animation: zoom-visor 0.25s ease; }\n\n@keyframes aparecer-visor { from { opacity: 0; } to { opacity: 1; } }\n@keyframes zoom-visor { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }\n@media (prefers-reduced-motion: reduce) { .visor-avatar, .visor-cuerpo img { animation: none; } }\n";
    document.head.appendChild(st);
})();

/* ==========================================================
   BONDSPACE - CONFIGURACION DE LA CUENTA
   Publico (lo ven los integrantes): nombre de usuario y foto,
   guardados en el integrante del espacio.
   Privado: nombre real, edad y celular, tabla "perfiles".
========================================================== */

function avatarHTML(nombre, foto) {

    if (foto) {
        return "<img class=\"avatar-img\" src=\"" + escapar(foto) + "\" data-nombre=\"" + escapar(nombre || "") + "\" alt=\"Foto de " + escapar(nombre || "") + "\" " +
            "style=\"width:100%;height:100%;max-width:100%;object-fit:cover;border-radius:50%;display:block;cursor:zoom-in\">";
    }

    return escapar((nombre || "?").charAt(0).toUpperCase());
}


/* ---------- Visor de foto a pantalla completa ---------- */

function crearVisor() {

    let v = document.getElementById("visorAvatar");

    if (v) { return v; }

    v = document.createElement("div");
    v.id = "visorAvatar";
    v.className = "visor-avatar";
    v.hidden = true;
    v.setAttribute("role", "dialog");
    v.setAttribute("aria-modal", "true");
    v.innerHTML = "<div class=\"visor-barra\"><strong id=\"visorNombre\"></strong>" +
        "<button type=\"button\" class=\"visor-cerrar\" aria-label=\"Cerrar\"><i class=\"fa-solid fa-xmark\"></i></button></div>" +
        "<div class=\"visor-cuerpo\"><img id=\"visorImagen\" alt=\"\"></div>";

    v.addEventListener("click", function (e) {
        if (e.target.id !== "visorImagen") { cerrarVisor(); }
    });

    document.body.appendChild(v);

    return v;
}

function verFoto(src, nombre) {

    const v = crearVisor();

    document.getElementById("visorNombre").textContent = nombre || "";
    document.getElementById("visorImagen").src = src;

    v.hidden = false;
    v.querySelector(".visor-cerrar").focus();
}

function cerrarVisor() {

    const v = document.getElementById("visorAvatar");

    if (v) { v.hidden = true; }
}

/* Un solo escuchador: cualquier foto de perfil se puede ampliar. */
document.addEventListener("click", function (e) {

    const img = e.target.closest ? e.target.closest("img.avatar-img") : null;

    if (img) { verFoto(img.src, img.dataset.nombre); }
});

document.addEventListener("keydown", function (e) {

    if (e.key === "Escape") { cerrarVisor(); }
});

/* Recorta al centro y reduce a 256 px para que pese poco. */
function reducirAvatar(archivo) {

    return new Promise(function (ok, fallo) {

        const url = URL.createObjectURL(archivo);
        const img = new Image();

        img.onload = function () {
            const lado = Math.min(img.width, img.height);
            const c = document.createElement("canvas");
            c.width = c.height = 256;
            c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
            URL.revokeObjectURL(url);
            ok(c.toDataURL("image/jpeg", 0.85));
        };

        img.onerror = function () { URL.revokeObjectURL(url); fallo(); };
        img.src = url;
    });
}

async function actualizarMiembro(cambios) {

    const espacio = await espacioActual();
    const yo = espacio && espacio.miembros.find(function (m) { return m.id === USUARIO_ACTUAL.id; });

    if (!yo) { return false; }

    Object.assign(yo, cambios);
    await BD.guardar("espacios", espacio);
    await renderIntegrantes();
    pintarAvatarPerfil(yo);

    return true;
}

function pintarAvatarPerfil(yo) {

    document.getElementById("avatarPerfil").innerHTML = avatarHTML(yo.nombre, yo.foto);
    document.getElementById("resumenNombre").textContent = yo.nombre;
}

async function cargarPerfil() {

    const espacio = await espacioActual();
    const yo = espacio && espacio.miembros.find(function (m) { return m.id === USUARIO_ACTUAL.id; });

    if (!yo) { return; }

    const p = (await BD.obtener("perfiles", USUARIO_ACTUAL.id)) || {};

    document.getElementById("perfilUsuario").value = yo.nombre;
    document.getElementById("perfilReal").value = p.nombreReal || "";
    document.getElementById("perfilEdad").value = p.edad || "";
    document.getElementById("perfilCelular").value = p.celular || "";
    document.getElementById("errorPerfil").textContent = "";
    document.getElementById("resumenRol").textContent = esAdmin(espacio) ? "Administrador" : "Integrante";
    document.getElementById("resumenEspacio").textContent = espacio.nombre;

    pintarAvatarPerfil(yo);
}

async function cambiarFotoPerfil(input) {

    const archivo = input.files[0];

    input.value = "";

    if (!archivo) { return; }

    if (!archivo.type.startsWith("image/")) {
        mostrarNotificacion("El archivo debe ser una imagen (JPG, PNG o WEBP).");
        return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
        mostrarNotificacion("La imagen pesa más de 8 MB. Elige una más ligera.");
        return;
    }

    try {
        const foto = await reducirAvatar(archivo);
        await actualizarMiembro({ foto: foto });
        mostrarNotificacion("Foto de perfil actualizada.");
    } catch (e) {
        mostrarNotificacion("No se pudo cargar la imagen. Prueba con otra.");
    }
}

async function quitarFotoPerfil() {

    await actualizarMiembro({ foto: null });
    mostrarNotificacion("Foto de perfil eliminada.");
}

async function guardarPerfil(event) {

    event.preventDefault();

    const error = document.getElementById("errorPerfil");
    const usuario = document.getElementById("perfilUsuario").value.trim();
    const real = document.getElementById("perfilReal").value.trim();
    const edad = document.getElementById("perfilEdad").value.trim();
    const celular = document.getElementById("perfilCelular").value.trim();

    error.textContent = "";

    if (usuario.length < 2) {
        error.textContent = "El nombre de usuario debe tener al menos 2 caracteres.";
        return;
    }

    if (edad !== "" && !(/^\d{1,3}$/.test(edad) && +edad >= 1 && +edad <= 120)) {
        error.textContent = "Escribe una edad válida (entre 1 y 120).";
        return;
    }

    if (celular !== "" && !/^\+?[0-9 ()-]{7,20}$/.test(celular)) {
        error.textContent = "El celular solo puede tener números, espacios, + ( ) y guiones.";
        return;
    }

    const espacio = await espacioActual();
    const repetido = espacio.miembros.some(function (m) {
        return m.id !== USUARIO_ACTUAL.id && m.nombre.toLowerCase() === usuario.toLowerCase();
    });

    if (repetido) {
        error.textContent = "Ya hay un integrante con ese nombre de usuario en este espacio.";
        return;
    }

    await BD.guardar("perfiles", { id: USUARIO_ACTUAL.id, nombreReal: real, edad: edad, celular: celular });
    await actualizarMiembro({ nombre: usuario });

    mostrarNotificacion("Cambios guardados.");
}

/* Si otra pestaña/persona cambia su nombre o foto, se refleja aqui. */
window.addEventListener("storage", function (e) {

    if (e.key === "bondspace_espacios" && ESPACIO_ACTUAL_ID && USUARIO_ACTUAL) {
        renderIntegrantes();
    }
});
