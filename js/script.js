/* ==========================================================
   BONDSPACE
   FUNCIONES JAVASCRIPT
========================================================== */


/* ==========================================================
   VARIABLES Y CONFIGURACION
========================================================== */

let nombreEspacioActual = "Nuestro espacio";

let codigoEspacio = "";

/*
    Datos de sesion de ejemplo. Cuando exista login con MySQL,
    estos valores vendran del usuario autenticado.
*/
let USUARIO_ACTUAL = null;
let ESPACIO_ACTUAL_ID = null;

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

/*
    Estado temporal de la interfaz.
*/
let recuerdoEditandoId = null;
let filtroRecuerdos = "todos";
let accionConfirmada = null;
let temporizadorNotificacion = null;

const fotosTemp = { Recuerdo: null, Capsula: null };


/* ==========================================================
   CAPA DE DATOS (BD)
   ----------------------------------------------------------
   Por ahora guarda en localStorage. Todas las funciones son
   asincronas (async) para que, al conectar MySQL, solo haya
   que cambiar el INTERIOR de estos metodos por fetch() a tu
   API. El resto del programa no se modifica.
========================================================== */

const BD = {

    prefijo: "bondspace_",

    _leer: function (tabla) {
        try {
            const texto = localStorage.getItem(this.prefijo + tabla);
            return texto ? JSON.parse(texto) : null;
        } catch (e) {
            return null;
        }
    },

    _escribir: function (tabla, lista) {
        localStorage.setItem(this.prefijo + tabla, JSON.stringify(lista));
    },

    existe: function (tabla) {
        return this._leer(tabla) !== null;
    },

    /* SELECT * FROM tabla */
    listar: async function (tabla) {
        return this._leer(tabla) || [];
    },

    /* SELECT * FROM tabla WHERE id = ? */
    obtener: async function (tabla, id) {
        const lista = await this.listar(tabla);
        return lista.find(function (r) { return r.id === id; }) || null;
    },

    /* INSERT (sin id) o UPDATE (con id) */
    guardar: async function (tabla, registro) {
        const lista = await this.listar(tabla);

        if (registro.id) {
            const posicion = lista.findIndex(function (r) {
                return r.id === registro.id;
            });

            if (posicion >= 0) {
                lista[posicion] = registro;
            } else {
                lista.push(registro);
            }
        } else {
            registro.id = Date.now();
            lista.push(registro);
        }

        this._escribir(tabla, lista);
        return registro;
    },

    /* DELETE FROM tabla WHERE id = ? */
    eliminar: async function (tabla, id) {
        const lista = await this.listar(tabla);

        this._escribir(
            tabla,
            lista.filter(function (r) { return r.id !== id; })
        );
    }
};


/* ==========================================================
   UTILIDADES
========================================================== */

/*
    Evita que un texto escrito por el usuario se interprete
    como HTML (proteccion basica contra XSS).
*/
function escapar(texto) {

    return String(texto === null || texto === undefined ? "" : texto)
        .replace(/[&<>"']/g, function (c) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#39;"
            }[c];
        });
}

/* Fecha de hoy a las 00:00 (hora local). */
function hoy() {

    const d = new Date();

    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* Convierte "2026-12-24" en un objeto Date local. */
function aFecha(texto) {

    const partes = texto.split("-").map(Number);

    return new Date(partes[0], partes[1] - 1, partes[2]);
}

/* Convierte un Date en "YYYY-MM-DD". */
function fechaISO(fecha) {

    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return fecha.getFullYear() + "-" + mes + "-" + dia;
}

/* "2026-08-15" -> "15 de agosto, 2026" */
function formatearFecha(texto) {

    const f = aFecha(texto);

    return f.getDate() + " de " + MESES[f.getMonth()] + ", " + f.getFullYear();
}

/* Dias que faltan desde hoy hasta una fecha (negativo si ya paso). */
function diasHasta(texto) {

    return Math.round((aFecha(texto) - hoy()) / 86400000);
}

function textoDias(dias) {

    return dias === 1 ? "Falta 1 dia" : "Faltan " + dias + " dias";
}

function abrirModal(id) {

    document
        .getElementById(id)
        .classList.add("mostrar");
}


/* ==========================================================
   MOSTRAR MODAL CREAR ESPACIO
========================================================== */

function mostrarCrearEspacio() {

    document
        .getElementById("modalCrear")
        .classList.add("mostrar");
}


/* ==========================================================
   MOSTRAR MODAL UNIRSE
========================================================== */

function mostrarUnirse() {

    document
        .getElementById("modalUnirse")
        .classList.add("mostrar");
}


/* ==========================================================
   CERRAR MODAL
========================================================== */

function cerrarModal(id) {

    document
        .getElementById(id)
        .classList.remove("mostrar");
}


/* ==========================================================
   CREAR ESPACIO
========================================================== */

async function crearEspacio(event) {

    event.preventDefault();

    const nombre = document.getElementById("nombreEspacio").value.trim();
    const tematica = document.getElementById("tematica").value;
    const alias = document.getElementById("aliasCrear").value.trim();
    const mensaje = document.getElementById("errorCrear");

    mensaje.textContent = "";

    if (nombre === "" || tematica === "" || alias === "") {
        mensaje.textContent = "Completa tu nombre, el nombre del espacio y la temática.";
        return;
    }

    try {
        const usuario = { id: Date.now(), nombre: alias };

        const espacio = await BD.guardar("espacios", {
            id: null,
            nombre: nombre,
            tematica: tematica,
            id_admin: usuario.id,
            codigo: await generarCodigo(),
            miembros: [{ id: usuario.id, nombre: alias, rol: "Administrador" }],
            creado_en: new Date().toISOString()
        });

        cerrarModal("modalCrear");
        entrarEspacio(espacio, usuario);
        mostrarNotificacion("¡Espacio privado creado correctamente!");

    } catch (e) {
        mensaje.textContent = "No fue posible crear el espacio. Inténtalo de nuevo.";
    }
}


/* ==========================================================
   INVITACIONES (RF02) - codigo unico con enlace
========================================================== */

async function generarCodigo() {

    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const usados = (await BD.listar("espacios")).map(function (e) { return e.codigo; });
    let codigo;

    do {
        codigo = "BS-";
        for (let i = 0; i < 6; i++) {
            codigo += letras[Math.floor(Math.random() * letras.length)];
        }
    } while (usados.includes(codigo));

    return codigo;
}

function enlaceInvitacion() {

    return location.href.split("#")[0] + "#unirse=" + codigoEspacio;
}

async function espacioActual() {

    return BD.obtener("espacios", ESPACIO_ACTUAL_ID);
}

function esAdmin(espacio) {

    return !!espacio && !!USUARIO_ACTUAL && espacio.id_admin === USUARIO_ACTUAL.id;
}

async function unirseEspacio() {

    const codigo = document.getElementById("codigoEntrada").value.trim().toUpperCase();
    const alias = document.getElementById("aliasUnirse").value.trim();
    const mensaje = document.getElementById("errorCodigo");

    mensaje.textContent = "";

    if (codigo === "" || alias === "") {
        mensaje.textContent = "Introduce tu nombre y el código de invitación.";
        return;
    }

    const espacios = await BD.listar("espacios");
    const espacio = espacios.find(function (e) { return e.codigo === codigo; });

    if (!espacio) {
        mensaje.textContent = "El código no es válido o ya no está disponible. Pide una invitación nueva.";
        return;
    }

    const usuario = { id: Date.now(), nombre: alias };

    espacio.miembros.push({ id: usuario.id, nombre: alias, rol: "Integrante" });
    await BD.guardar("espacios", espacio);

    cerrarModal("modalUnirse");
    entrarEspacio(espacio, usuario);
    mostrarNotificacion("¡Te has unido a " + espacio.nombre + "!");
}

/* Solo el administrador puede renovar el codigo; el anterior deja de servir. */
async function renovarCodigo() {

    const espacio = await espacioActual();

    if (!esAdmin(espacio)) {
        mostrarNotificacion("Solo el administrador puede generar invitaciones.");
        return;
    }

    espacio.codigo = await generarCodigo();
    await BD.guardar("espacios", espacio);

    codigoEspacio = espacio.codigo;
    document.getElementById("codigoInvitacion").textContent = codigoEspacio;
    mostrarNotificacion("Nuevo código generado. El anterior ya no funciona.");
}


/* ==========================================================
   ENTRAR AL ESPACIO (privacidad: solo miembros, RNF01)
========================================================== */

function entrarEspacio(espacio, usuario) {

    USUARIO_ACTUAL = usuario;
    ESPACIO_ACTUAL_ID = espacio.id;
    nombreEspacioActual = espacio.nombre;
    codigoEspacio = espacio.codigo;

    document.getElementById("nombreDashboard").textContent = espacio.nombre;
    document.getElementById("tituloDashboard").textContent = espacio.nombre;
    document.getElementById("temaDashboard").textContent = espacio.tematica;
    document.getElementById("nombreUsuario").textContent = usuario.nombre;
    document.getElementById("inicialUsuario").textContent = usuario.nombre.charAt(0).toUpperCase();

    document.getElementById("inicio").style.display = "none";
    document.getElementById("app").classList.add("mostrar");

    mostrarSeccion("inicioDashboard", document.querySelector(".menu-item"));

    renderIntegrantes();
    renderRecuerdos();
    renderCapsulas();

    if (typeof iniciarLlamadas === "function") {
        iniciarLlamadas();
    }

    setTimeout(revisarCapsulasListas, 3400);
}

async function renderIntegrantes() {

    const espacio = await espacioActual();

    if (!espacio) {
        return;
    }

    const admin = esAdmin(espacio);
    const yo = espacio.miembros.find(function (m) { return m.id === USUARIO_ACTUAL.id; });

    if (yo) {
        USUARIO_ACTUAL.nombre = yo.nombre;
        document.getElementById("nombreUsuario").textContent = yo.nombre;
        document.getElementById("inicialUsuario").innerHTML = avatarHTML(yo.nombre, yo.foto);
    }

    document.getElementById("rolUsuario").textContent = admin ? "Administrador" : "Integrante";
    document.getElementById("codigoInvitacion").textContent = admin ? espacio.codigo : "Solo el administrador";
    document.getElementById("panelInvitacion").hidden = !admin;
    document.getElementById("btnInvitar").hidden = !admin;
    document.getElementById("contadorIntegrantes").textContent = espacio.miembros.length;

    document.getElementById("listaIntegrantes").innerHTML = espacio.miembros.map(function (m) {
        return "<div class=\"integrante\">" +
            "<div class=\"integrante-avatar\">" + avatarHTML(m.nombre, m.foto) + "</div>" +
            "<div><strong>" + escapar(m.nombre) + (m.id === USUARIO_ACTUAL.id ? " (tú)" : "") + "</strong><span>" + escapar(m.rol) + "</span></div>" +
            "<i class=\"fa-solid " + (m.rol === "Administrador" ? "fa-crown" : "fa-user") + "\"></i>" +
            (m.id === USUARIO_ACTUAL.id ? "" :
                "<div class=\"integrante-acciones\">" +
                "<button class=\"btn-llamar\" title=\"Llamar\" aria-label=\"Llamar a " + escapar(m.nombre) + "\" onclick=\"llamar(" + m.id + ", false)\"><i class=\"fa-solid fa-phone\"></i></button>" +
                "<button class=\"btn-llamar\" title=\"Videollamada\" aria-label=\"Videollamada con " + escapar(m.nombre) + "\" onclick=\"llamar(" + m.id + ", true)\"><i class=\"fa-solid fa-video\"></i></button>" +
                "</div>") +
            "</div>";
    }).join("");
}


/* ==========================================================
   CAMBIAR SECCIÓN
========================================================== */

function mostrarSeccion(id, boton) {

    /*
        Ocultar todas las secciones.
    */

    const secciones =
        document.querySelectorAll(".seccion");

    secciones.forEach(function (seccion) {

        seccion.classList.remove("activa");

    });


    /*
        Mostrar la sección seleccionada.
    */

    const seccion =
        document.getElementById(id);

    if (seccion) {

        seccion.classList.add("activa");
    }


    /*
        Quitar estado activo del menú.
    */

    const botones =
        document.querySelectorAll(".menu-item");

    botones.forEach(function (item) {

        item.classList.remove("activo");

    });


    /*
        Activar el botón seleccionado.
    */

    if (boton) {

        boton.classList.add("activo");
    }


    /*
        Refrescar los datos al entrar (por ejemplo, para
        recalcular los días que faltan de una cápsula).
    */

    if (id === "recuerdos") {
        renderRecuerdos();
    }

    if (id === "capsulas") {
        renderCapsulas();
    }

    if (id === "integrantes") {
        renderIntegrantes();
    }

    if (id === "configuracion") {
        cargarPerfil();
    }
}


/* ==========================================================
   MOSTRAR SECCIÓN DESDE UNA TARJETA
========================================================== */

function mostrarSeccionPorNombre(id) {

    const botones =
        document.querySelectorAll(".menu-item");

    let botonCorrespondiente = null;


    botones.forEach(function (boton) {

        const texto =
            boton.textContent.toLowerCase();

        if (
            (id === "actividades" && texto.includes("actividades")) ||
            (id === "recuerdos" && texto.includes("recuerdos")) ||
            (id === "capsulas" && texto.includes("cápsulas")) ||
            (id === "integrantes" && texto.includes("integrantes"))
        ) {

            botonCorrespondiente = boton;
        }

    });


    mostrarSeccion(
        id,
        botonCorrespondiente
    );
}


/* ==========================================================
   VOLVER AL INICIO
========================================================== */

function volverInicio() {

    document.getElementById("app")
        .classList.remove("mostrar");

    document.getElementById("inicio")
        .style.display = "flex";

    if (typeof cerrarActividad === "function") {
        cerrarActividad(false);
    }

    if (typeof detenerLlamadas === "function") {
        detenerLlamadas();
    }

    USUARIO_ACTUAL = null;
    ESPACIO_ACTUAL_ID = null;

    mostrarNotificacion(
        "Has salido del espacio."
    );
}


/* ==========================================================
   NOTIFICACIÓN
========================================================== */

function mostrarNotificacion(texto) {

    const notificacion =
        document.getElementById("notificacion");

    const textoNotificacion =
        document.getElementById("textoNotificacion");


    textoNotificacion.textContent = texto;

    notificacion.classList.add("mostrar");


    /*
        Si ya había una notificación en curso,
        reiniciamos el temporizador.
    */

    clearTimeout(temporizadorNotificacion);

    temporizadorNotificacion = setTimeout(function () {

        notificacion.classList.remove("mostrar");

    }, 3000);
}


/* ==========================================================
   COPIAR CÓDIGO DE INVITACIÓN
========================================================== */

async function copiarCodigo() {

    const espacio = await espacioActual();

    if (!esAdmin(espacio)) {
        mostrarNotificacion("Solo el administrador puede compartir la invitación.");
        return;
    }

    const texto = enlaceInvitacion();

    try {
        await navigator.clipboard.writeText(texto);
        mostrarNotificacion("Enlace de invitación copiado.");
    } catch (e) {
        mostrarNotificacion("Código de invitación: " + codigoEspacio);
    }
}

function mostrarInvitacion() {

    mostrarSeccionPorNombre("integrantes");
}


/* ==========================================================
   FOTOS (compartido por recuerdos y cápsulas)
   El parámetro "tipo" es "Recuerdo" o "Capsula" y se usa
   para armar los ids: inputFotoRecuerdo, previewCapsula...
========================================================== */

/*
    Reduce la imagen a un máximo de 800 px y la convierte a JPEG.
    Así ocupa mucho menos espacio al guardarla.
*/
function comprimirImagen(archivo, maxLado, calidad) {

    maxLado = maxLado || 800;
    calidad = calidad || 0.75;

    return new Promise(function (resolve, reject) {

        const lector = new FileReader();

        lector.onerror = function () {
            reject(new Error("No se pudo leer el archivo."));
        };

        lector.onload = function () {

            const img = new Image();

            img.onerror = function () {
                reject(new Error("La imagen no es válida."));
            };

            img.onload = function () {

                const escala = Math.min(
                    1,
                    maxLado / Math.max(img.width, img.height)
                );

                const canvas = document.createElement("canvas");

                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);

                const ctx = canvas.getContext("2d");

                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", calidad));
            };

            img.src = lector.result;
        };

        lector.readAsDataURL(archivo);
    });
}

function mostrarPreview(tipo, dataUrl) {

    const contenedor = document.getElementById("preview" + tipo);
    const imagen = contenedor.querySelector("img");

    if (dataUrl) {
        imagen.src = dataUrl;
        contenedor.hidden = false;
    } else {
        imagen.removeAttribute("src");
        contenedor.hidden = true;
    }
}

async function seleccionarFoto(input, tipo) {

    const archivo = input.files[0];
    const error = document.getElementById("error" + tipo);

    if (!archivo) {
        return;
    }

    error.textContent = "";

    if (!archivo.type.startsWith("image/")) {

        error.textContent =
            "El archivo debe ser una imagen (JPG, PNG o WEBP).";

        input.value = "";
        return;
    }

    if (archivo.size > 8 * 1024 * 1024) {

        error.textContent =
            "La imagen pesa más de 8 MB. Elige una más ligera.";

        input.value = "";
        return;
    }

    try {

        fotosTemp[tipo] = await comprimirImagen(archivo);
        mostrarPreview(tipo, fotosTemp[tipo]);

    } catch (e) {

        error.textContent =
            "No se pudo cargar la imagen. Prueba con otra.";

        input.value = "";
    }
}

function quitarFoto(tipo) {

    fotosTemp[tipo] = null;

    document.getElementById("inputFoto" + tipo).value = "";

    mostrarPreview(tipo, null);
}


/* ==========================================================
   CONFIRMAR ACCIÓN (eliminar)
========================================================== */

function pedirConfirmacion(mensaje, accion) {

    document.getElementById("textoConfirmar").textContent = mensaje;

    accionConfirmada = accion;

    abrirModal("modalConfirmar");
}

async function confirmarAccion() {

    const accion = accionConfirmada;

    accionConfirmada = null;

    cerrarModal("modalConfirmar");

    if (accion) {
        await accion();
    }
}


/* ==========================================================
   RECUERDOS - DATOS INICIALES
========================================================== */

/* ==========================================================
   RECUERDOS - MOSTRAR EL ÁLBUM
========================================================== */

async function renderRecuerdos() {

    const contenedor = document.getElementById("albumRecuerdos");

    const todos = (await BD.listar("recuerdos")).filter(function (r) { return r.id_espacio === ESPACIO_ACTUAL_ID; });

    document.getElementById("contadorRecuerdos").textContent = todos.length;


    /*
        Orden: del más reciente al más antiguo.
    */

    let lista = todos.slice().sort(function (a, b) {
        return b.fecha.localeCompare(a.fecha) || b.id - a.id;
    });

    if (filtroRecuerdos === "favoritos") {
        lista = lista.filter(function (r) { return r.favorito; });
    }


    /*
        Estado visual de los filtros.
    */

    document.querySelectorAll(".chip").forEach(function (chip) {
        chip.classList.toggle(
            "activo",
            chip.dataset.filtro === filtroRecuerdos
        );
    });


    /*
        Álbum vacío.
    */

    if (lista.length === 0) {

        if (filtroRecuerdos === "favoritos") {

            contenedor.innerHTML =
                "<div class=\"estado-vacio\">" +
                "<i class=\"fa-regular fa-heart\"></i>" +
                "<h3>Aún no tienes favoritos</h3>" +
                "<p>Toca el corazón de un recuerdo para verlo aquí.</p>" +
                "</div>";

        } else {

            contenedor.innerHTML =
                "<div class=\"estado-vacio\">" +
                "<i class=\"fa-regular fa-image\"></i>" +
                "<h3>Todavía no hay recuerdos</h3>" +
                "<p>Guarda el primero con una foto y unas palabras.</p>" +
                "<button class=\"btn btn-principal\" onclick=\"agregarRecuerdo()\">" +
                "<i class=\"fa-solid fa-plus\"></i> Agregar recuerdo</button>" +
                "</div>";
        }

        return;
    }


    contenedor.innerHTML = lista.map(plantillaRecuerdo).join("");
}

function plantillaRecuerdo(r) {

    const id = Number(r.id);

    const imagen = r.foto
        ? "<img src=\"" + escapar(r.foto) + "\" alt=\"" + escapar(r.titulo) + "\">"
        : "<div class=\"foto-placeholder\"><i class=\"fa-solid " +
          escapar(r.icono || "fa-image") + "\"></i></div>";

    const corazon = r.favorito ? "fa-solid" : "fa-regular";

    return (
        "<article class=\"recuerdo\">" +

            "<div class=\"foto-recuerdo\" onclick=\"verRecuerdo(" + id + ")\">" +
                imagen +
                "<button class=\"btn-favorito" + (r.favorito ? " activo" : "") + "\" " +
                    "onclick=\"alternarFavorito(event, " + id + ")\" " +
                    "aria-label=\"Marcar como favorito\">" +
                    "<i class=\"" + corazon + " fa-heart\"></i>" +
                "</button>" +
            "</div>" +

            "<div class=\"recuerdo-info\">" +
                "<span>" + formatearFecha(r.fecha) + "</span>" +
                "<h3>" + escapar(r.titulo) + "</h3>" +
                "<p>" + escapar(r.descripcion) + "</p>" +

                "<div class=\"recuerdo-acciones\">" +
                    "<button class=\"btn-icono\" onclick=\"abrirModalRecuerdo(" + id + ")\" " +
                        "aria-label=\"Editar recuerdo\"><i class=\"fa-solid fa-pen\"></i></button>" +
                    "<button class=\"btn-icono peligro\" onclick=\"eliminarRecuerdo(" + id + ")\" " +
                        "aria-label=\"Eliminar recuerdo\"><i class=\"fa-solid fa-trash\"></i></button>" +
                "</div>" +
            "</div>" +

        "</article>"
    );
}

function filtrarRecuerdos(filtro) {

    filtroRecuerdos = filtro;

    renderRecuerdos();
}


/* ==========================================================
   RECUERDOS - AGREGAR / EDITAR
========================================================== */

function agregarRecuerdo() {

    abrirModalRecuerdo(null);
}

async function abrirModalRecuerdo(id) {

    recuerdoEditandoId = id || null;

    document.getElementById("formRecuerdo").reset();
    document.getElementById("errorRecuerdo").textContent = "";

    fotosTemp.Recuerdo = null;
    mostrarPreview("Recuerdo", null);

    /*
        No se permiten fechas futuras en un recuerdo.
    */

    document.getElementById("fechaRecuerdo").max = fechaISO(hoy());

    if (recuerdoEditandoId) {

        const r = await BD.obtener("recuerdos", recuerdoEditandoId);

        if (!r) {
            return;
        }

        document.getElementById("tituloRecuerdo").value = r.titulo;
        document.getElementById("fechaRecuerdo").value = r.fecha;
        document.getElementById("descripcionRecuerdo").value = r.descripcion;

        fotosTemp.Recuerdo = r.foto;
        mostrarPreview("Recuerdo", r.foto);

        document.getElementById("tituloModalRecuerdo").textContent = "Editar recuerdo";
        document.getElementById("btnGuardarRecuerdo").textContent = "Guardar cambios";

    } else {

        document.getElementById("fechaRecuerdo").value = fechaISO(hoy());

        document.getElementById("tituloModalRecuerdo").textContent = "Nuevo recuerdo";
        document.getElementById("btnGuardarRecuerdo").textContent = "Guardar recuerdo";
    }

    abrirModal("modalRecuerdo");
}

async function guardarRecuerdo(event) {

    event.preventDefault();

    const titulo = document.getElementById("tituloRecuerdo").value.trim();
    const fecha = document.getElementById("fechaRecuerdo").value;
    const descripcion = document.getElementById("descripcionRecuerdo").value.trim();
    const error = document.getElementById("errorRecuerdo");

    error.textContent = "";


    /*
        Validaciones.
    */

    if (titulo === "" || fecha === "") {

        error.textContent =
            "Escribe un título y elige la fecha del recuerdo.";

        return;
    }

    if (aFecha(fecha) > hoy()) {

        error.textContent =
            "La fecha no puede ser futura. Para eso existen las cápsulas del tiempo.";

        return;
    }


    try {

        let registro;

        if (recuerdoEditandoId) {

            const existente = await BD.obtener("recuerdos", recuerdoEditandoId);

            registro = Object.assign({}, existente, {
                titulo: titulo,
                fecha: fecha,
                descripcion: descripcion,
                foto: fotosTemp.Recuerdo
            });

        } else {

            registro = {
                id: null,
                id_espacio: ESPACIO_ACTUAL_ID,
                id_usuario: USUARIO_ACTUAL.id,
                autor: USUARIO_ACTUAL.nombre,
                titulo: titulo,
                descripcion: descripcion,
                fecha: fecha,
                foto: fotosTemp.Recuerdo,
                favorito: false,
                creado_en: new Date().toISOString()
            };
        }

        await BD.guardar("recuerdos", registro);

    } catch (e) {

        error.textContent =
            "No se pudo guardar. Puede que el almacenamiento esté lleno; prueba con una foto más ligera.";

        return;
    }


    const eraEdicion = recuerdoEditandoId !== null;

    cerrarModal("modalRecuerdo");

    await renderRecuerdos();

    mostrarNotificacion(
        eraEdicion ? "Recuerdo actualizado." : "¡Recuerdo guardado en el álbum!"
    );
}


/* ==========================================================
   RECUERDOS - VER, FAVORITO Y ELIMINAR
========================================================== */

async function verRecuerdo(id) {

    const r = await BD.obtener("recuerdos", id);

    if (!r) {
        return;
    }

    const imagen = document.getElementById("fotoVerRecuerdo");

    if (r.foto) {
        imagen.src = r.foto;
        imagen.alt = r.titulo;
        imagen.hidden = false;
    } else {
        imagen.removeAttribute("src");
        imagen.hidden = true;
    }

    document.getElementById("tituloVerRecuerdo").textContent = r.titulo;

    document.getElementById("metaVerRecuerdo").textContent =
        formatearFecha(r.fecha) + " - Guardado por " + r.autor;

    document.getElementById("textoVerRecuerdo").textContent =
        r.descripcion || "Sin descripción.";

    abrirModal("modalVerRecuerdo");
}

async function alternarFavorito(event, id) {

    /*
        Evita que el clic abra también el recuerdo.
    */

    event.stopPropagation();

    const r = await BD.obtener("recuerdos", id);

    if (!r) {
        return;
    }

    r.favorito = !r.favorito;

    await BD.guardar("recuerdos", r);

    await renderRecuerdos();
}

async function eliminarRecuerdo(id) {

    const r = await BD.obtener("recuerdos", id);

    if (!r) {
        return;
    }

    pedirConfirmacion(
        "¿Eliminar el recuerdo \"" + r.titulo + "\"? Esta acción no se puede deshacer.",
        async function () {

            await BD.eliminar("recuerdos", id);

            await renderRecuerdos();

            mostrarNotificacion("Recuerdo eliminado.");
        }
    );
}


/* ==========================================================
   CÁPSULAS - MOSTRAR
========================================================== */

/*
    Una cápsula puede estar en 3 estados:
    - bloqueada: todavía no llega la fecha.
    - lista:     llegó la fecha, falta abrirla.
    - abierta:   ya fue abierta.
*/
function estadoCapsula(c) {

    if (c.abierta) {
        return "abierta";
    }

    return diasHasta(c.fecha_apertura) <= 0 ? "lista" : "bloqueada";
}

async function renderCapsulas() {

    const contenedor = document.getElementById("capsulasGrid");

    const todas = (await BD.listar("capsulas")).filter(function (c) { return c.id_espacio === ESPACIO_ACTUAL_ID; });

    const pendientes = todas.filter(function (c) { return !c.abierta; });

    document.getElementById("contadorCapsulas").textContent = pendientes.length;


    if (todas.length === 0) {

        contenedor.innerHTML =
            "<div class=\"estado-vacio\">" +
            "<i class=\"fa-solid fa-hourglass-half\"></i>" +
            "<h3>No hay cápsulas todavía</h3>" +
            "<p>Escribe un mensaje hoy y elige cuándo abrirlo.</p>" +
            "<button class=\"btn btn-principal\" onclick=\"crearCapsula()\">" +
            "<i class=\"fa-solid fa-plus\"></i> Crear cápsula</button>" +
            "</div>";

        return;
    }


    /*
        Orden: primero las listas para abrir, luego las bloqueadas
        (la más próxima primero) y al final las ya abiertas.
    */

    const prioridad = { lista: 0, bloqueada: 1, abierta: 2 };

    const ordenadas = todas.slice().sort(function (a, b) {

        const diferencia = prioridad[estadoCapsula(a)] - prioridad[estadoCapsula(b)];

        return diferencia || a.fecha_apertura.localeCompare(b.fecha_apertura);
    });

    contenedor.innerHTML = ordenadas.map(plantillaCapsula).join("");
}

function plantillaCapsula(c) {

    const id = Number(c.id);
    const estado = estadoCapsula(c);
    const dias = diasHasta(c.fecha_apertura);

    let icono, etiqueta, pie, atributos = "";

    if (estado === "bloqueada") {

        icono = "fa-lock";
        etiqueta = "Desbloqueo";
        pie = "<small>" + textoDias(dias) + "</small>";
        atributos = " onclick=\"avisarCapsulaBloqueada(" + id + ")\"";

    } else if (estado === "lista") {

        icono = "fa-lock-open";
        etiqueta = "Lista para abrir";
        pie = "<button class=\"btn btn-principal\" onclick=\"abrirCapsula(" + id + ")\">" +
              "<i class=\"fa-solid fa-envelope-open\"></i> Abrir cápsula</button>";

    } else {

        icono = "fa-envelope-open";
        etiqueta = "Abierta";
        pie = "<button class=\"btn btn-secundario\" onclick=\"abrirCapsula(" + id + ")\">" +
              "Volver a leer</button>";
    }

    return (
        "<div class=\"capsula-card " + estado + "\"" + atributos + ">" +

            "<button class=\"btn-eliminar-capsula\" " +
                "onclick=\"eliminarCapsula(event, " + id + ")\" " +
                "aria-label=\"Eliminar cápsula\"><i class=\"fa-solid fa-trash\"></i></button>" +

            "<div class=\"candado\"><i class=\"fa-solid " + icono + "\"></i></div>" +

            "<span>" + etiqueta + "</span>" +

            "<strong>" + formatearFecha(c.fecha_apertura) + "</strong>" +

            "<p>" + escapar(c.titulo) + "</p>" +

            pie +

        "</div>"
    );
}

async function avisarCapsulaBloqueada(id) {

    const c = await BD.obtener("capsulas", id);

    if (!c) {
        return;
    }

    mostrarNotificacion(
        "Esta cápsula se abrirá el " + formatearFecha(c.fecha_apertura) + "."
    );
}

/*
    Al entrar al espacio avisa si hay cápsulas esperando.
*/
async function revisarCapsulasListas() {

    const todas = (await BD.listar("capsulas")).filter(function (c) { return c.id_espacio === ESPACIO_ACTUAL_ID; });

    const listas = todas.filter(function (c) {
        return estadoCapsula(c) === "lista";
    }).length;

    if (listas > 0) {

        mostrarNotificacion(
            listas === 1
                ? "Tienes 1 cápsula lista para abrir."
                : "Tienes " + listas + " cápsulas listas para abrir."
        );
    }
}


/* ==========================================================
   CÁPSULAS - CREAR
========================================================== */

function crearCapsula() {

    document.getElementById("formCapsula").reset();
    document.getElementById("errorCapsula").textContent = "";

    fotosTemp.Capsula = null;
    mostrarPreview("Capsula", null);

    /*
        La fecha mínima de apertura es mañana.
    */

    const manana = hoy();
    manana.setDate(manana.getDate() + 1);

    document.getElementById("fechaCapsula").min = fechaISO(manana);

    abrirModal("modalCapsula");
}

async function guardarCapsula(event) {

    event.preventDefault();

    const titulo = document.getElementById("tituloCapsula").value.trim();
    const mensaje = document.getElementById("mensajeCapsula").value.trim();
    const fecha = document.getElementById("fechaCapsula").value;
    const error = document.getElementById("errorCapsula");

    error.textContent = "";


    /*
        Validaciones.
    */

    if (titulo === "" || mensaje === "" || fecha === "") {

        error.textContent =
            "Completa el título, el mensaje y la fecha de apertura.";

        return;
    }

    if (diasHasta(fecha) < 1) {

        error.textContent =
            "La fecha de apertura debe ser posterior a hoy.";

        return;
    }


    try {

        await BD.guardar("capsulas", {
            id: null,
            id_espacio: ESPACIO_ACTUAL_ID,
            id_usuario: USUARIO_ACTUAL.id,
            autor: USUARIO_ACTUAL.nombre,
            titulo: titulo,
            mensaje: mensaje,
            fecha_apertura: fecha,
            foto: fotosTemp.Capsula,
            abierta: false,
            abierta_en: null,
            creado_en: new Date().toISOString()
        });

    } catch (e) {

        error.textContent =
            "No se pudo guardar. Puede que el almacenamiento esté lleno; prueba con una foto más ligera.";

        return;
    }


    cerrarModal("modalCapsula");

    await renderCapsulas();

    mostrarNotificacion(
        "Cápsula guardada. Se abrirá el " + formatearFecha(fecha) + "."
    );
}


/* ==========================================================
   CÁPSULAS - ABRIR Y ELIMINAR
========================================================== */

async function abrirCapsula(id) {

    const c = await BD.obtener("capsulas", id);

    if (!c) {
        return;
    }


    /*
        Regla de negocio: la fecha se vuelve a comprobar aquí
        y no solo al dibujar el botón. En MySQL esta misma
        regla debe repetirse en el servidor.
    */

    if (diasHasta(c.fecha_apertura) > 0) {

        mostrarNotificacion("Esta cápsula todavía no se puede abrir.");

        await renderCapsulas();

        return;
    }


    /*
        Primera apertura: se marca como abierta.
    */

    if (!c.abierta) {

        c.abierta = true;
        c.abierta_en = new Date().toISOString();

        await BD.guardar("capsulas", c);

        await renderCapsulas();
    }


    mostrarContenidoCapsula(c);
}

function mostrarContenidoCapsula(c) {

    document.getElementById("tituloVerCapsula").textContent = c.titulo;

    document.getElementById("metaVerCapsula").textContent =
        "Escrita por " + c.autor + " el " +
        formatearFecha(c.creado_en.slice(0, 10));

    document.getElementById("mensajeVerCapsula").textContent = c.mensaje;

    const imagen = document.getElementById("fotoVerCapsula");

    if (c.foto) {
        imagen.src = c.foto;
        imagen.hidden = false;
    } else {
        imagen.removeAttribute("src");
        imagen.hidden = true;
    }

    abrirModal("modalVerCapsula");
}

async function eliminarCapsula(event, id) {

    event.stopPropagation();

    const c = await BD.obtener("capsulas", id);

    if (!c) {
        return;
    }

    pedirConfirmacion(
        "¿Eliminar la cápsula \"" + c.titulo + "\"? Se perderá su mensaje.",
        async function () {

            await BD.eliminar("capsulas", id);

            await renderCapsulas();

            mostrarNotificacion("Cápsula eliminada.");
        }
    );
}


/* ==========================================================
   CERRAR MODALES AL HACER CLIC AFUERA
========================================================== */

window.addEventListener("click", function(event) {

    const modales =
        document.querySelectorAll(".modal");


    modales.forEach(function(modal) {

        if (event.target === modal) {

            modal.classList.remove("mostrar");
        }

    });

});


/* ==========================================================
   CERRAR MODALES CON LA TECLA ESC
========================================================== */

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        document
            .querySelectorAll(".modal.mostrar")
            .forEach(function (modal) {
                modal.classList.remove("mostrar");
            });
    }
});


/* ==========================================================
   INICIO DE LA APLICACIÓN
========================================================== */

document.addEventListener("DOMContentLoaded", function () {

    /* Enlace de invitacion: abre el modal con el codigo ya escrito. */

    const m = location.hash.match(/unirse=([A-Z0-9-]+)/i);

    if (m) {
        document.getElementById("codigoEntrada").value = m[1].toUpperCase();
        mostrarUnirse();
    }
});
