/* ==========================================================
   BONDSPACE - ACTIVIDADES COLABORATIVAS (RF03 / CU03)
   Sincronizacion en vivo con BroadcastChannel: funciona entre
   pestañas/ventanas del mismo navegador. Para usuarios en
   dispositivos distintos, solo hay que reemplazar enviar() y
   el receptor por un WebSocket (ver README).
========================================================== */

const RETOS = [
    "Cuéntale al grupo tu recuerdo favorito de este año.",
    "Envía tu mejor selfie con cara graciosa (descríbela aquí).",
    "Escribe tres cosas que admiras de cada integrante.",
    "Dibuja tu animal favorito en 30 segundos.",
    "Imita a otro integrante y que los demás adivinen quién es.",
    "Compartan una canción que los defina y expliquen por qué.",
    "Cada uno dice un deseo para el próximo mes.",
    "Reto de preguntas: ¿cuánto se conocen? Cada uno hace una pregunta."
];

const ACTIVIDADES = {
    musica: { titulo: "Escuchar música", icono: "fa-music" },
    video: { titulo: "Contenido audiovisual", icono: "fa-film" },
    dibujo: { titulo: "Dibujo colaborativo", icono: "fa-palette" },
    reto: { titulo: "Retos", icono: "fa-bullseye" }
};

let actividad = null;


function abrirActividad(tipo) {

    if (!ESPACIO_ACTUAL_ID || !USUARIO_ACTUAL) {
        return;
    }

    cerrarActividad(false);

    const info = ACTIVIDADES[tipo];

    actividad = {
        tipo: tipo,
        canal: new BroadcastChannel("bondspace_" + ESPACIO_ACTUAL_ID + "_" + tipo),
        pares: {},
        remoto: false,
        reto: { i: null, hechos: [] },
        latido: null
    };

    document.getElementById("tituloActividad").textContent = info.titulo;
    document.getElementById("iconoActividad").className = "fa-solid " + info.icono;
    document.getElementById("cuerpoActividad").innerHTML = plantillaActividad(tipo);

    actividad.canal.onmessage = function (e) { recibirActividad(e.data); };

    if (tipo === "dibujo") { iniciarLienzo(); }
    if (tipo === "musica" || tipo === "video") { iniciarMedia(); }
    if (tipo === "reto") { pintarReto(); }

    abrirModal("modalActividad");
    actualizarPresencia();

    enviarActividad({ t: "hola" });

    actividad.latido = setInterval(function () {
        enviarActividad({ t: "latido" });
        const limite = Date.now() - 9000;
        Object.keys(actividad.pares).forEach(function (id) {
            if (actividad.pares[id].visto < limite) { delete actividad.pares[id]; }
        });
        actualizarPresencia();
    }, 3000);
}

function plantillaActividad(tipo) {

    if (tipo === "musica" || tipo === "video") {
        const el = tipo === "musica"
            ? "<audio id=\"medio\" controls></audio>"
            : "<video id=\"medio\" controls></video>";

        const pantalla = tipo === "video"
            ? "<button id=\"btnPantalla\" class=\"btn btn-secundario\" onclick=\"alternarPantalla()\">" +
              "<i class=\"fa-solid fa-display\"></i> Compartir pantalla</button>" +
              "<video id=\"pantalla\" autoplay playsinline controls hidden></video>"
            : "";

        return pantalla + "<div class=\"fila-url\"><input type=\"url\" id=\"urlMedio\" placeholder=\"Pega un enlace de YouTube, Spotify o de un archivo " +
            (tipo === "musica" ? ".mp3" : ".mp4") + "\">" +
            "<button class=\"btn btn-principal\" onclick=\"cargarMedio()\">Cargar</button></div>" +
            el + "<div id=\"marco\" hidden></div>" +
            "<p class=\"ayuda-act\">YouTube y los archivos se sincronizan (play, pausa, adelantar). " +
            "Spotify se muestra a todos, pero cada quien lo reproduce en su propio reproductor.</p>";
    }

    if (tipo === "dibujo") {
        return "<div class=\"fila-url\"><input type=\"color\" id=\"colorTrazo\" value=\"#7c5cff\" aria-label=\"Color\">" +
            "<button class=\"btn btn-secundario\" onclick=\"limpiarLienzo(true)\">Limpiar pizarra</button></div>" +
            "<canvas id=\"lienzo\" width=\"640\" height=\"380\"></canvas>";
    }

    return "<div id=\"retoActual\" class=\"reto-actual\"></div>" +
        "<div class=\"fila-url\"><button class=\"btn btn-principal\" onclick=\"nuevoReto()\">" +
        "<i class=\"fa-solid fa-dice\"></i> Reto al azar</button>" +
        "<button class=\"btn btn-secundario\" onclick=\"completarReto()\">¡Lo hice!</button></div>" +
        "<div id=\"retoHechos\" class=\"ayuda-act\"></div>";
}


/* ---------- Comunicacion y presencia ---------- */

function enviarActividad(mensaje) {

    if (!actividad) { return; }

    mensaje.de = USUARIO_ACTUAL.id;
    mensaje.nombre = USUARIO_ACTUAL.nombre;

    try { actividad.canal.postMessage(mensaje); } catch (e) { /* canal cerrado */ }
}

function actualizarPresencia() {

    if (!actividad) { return; }

    const otros = Object.keys(actividad.pares).map(function (id) { return actividad.pares[id].nombre; });

    document.getElementById("presenciaActividad").textContent = otros.length === 0
        ? "Nadie más está conectado. Puedes comenzar sin acompañantes o cancelar."
        : "Conectados contigo: " + otros.join(", ");
}

function recibirActividad(m) {

    if (!actividad || m.de === USUARIO_ACTUAL.id) { return; }

    actividad.pares[m.de] = { nombre: m.nombre, visto: Date.now() };
    actualizarPresencia();

    switch (m.t) {

        case "hola":
            enviarActividad({ t: "estado", para: m.de, datos: instantanea() });
            if (streamPantalla) { ofrecerPantalla(m.de); }
            break;

        case "rtc":
            colaRtc[m.de] = (colaRtc[m.de] || Promise.resolve()).then(function () { return procesarRtc(m); });
            break;

        case "pantalla":
            if (!m.on) { limpiarRtc(); verPantalla(null); }
            break;

        case "estado":
            if (m.para === USUARIO_ACTUAL.id) { aplicarInstantanea(m.datos); }
            break;

        case "fin":
            cerrarActividad(false);
            mostrarNotificacion(m.nombre + " finalizó la actividad.");
            break;

        case "medio":
            if (m.accion === "src") {
                const e = parseEnlace(m.url);
                if (e) { mostrarEnlace(e); }
            } else {
                aplicarMedio(m);
            }
            break;
        case "trazo": dibujarTrazo(m.x0, m.y0, m.x1, m.y1, m.c); break;
        case "limpiar": limpiarLienzo(false); break;

        case "reto":
            actividad.reto = { i: m.i, hechos: [] };
            pintarReto();
            break;

        case "hecho":
            if (actividad.reto.hechos.indexOf(m.nombre) < 0) { actividad.reto.hechos.push(m.nombre); }
            pintarReto();
            break;
    }
}

/* Estado para quien entra tarde o recupera la conexion. */
function instantanea() {

    if (actividad.tipo === "dibujo") {
        return { img: document.getElementById("lienzo").toDataURL() };
    }

    if (actividad.tipo === "reto") {
        return actividad.reto;
    }

    const e = actividad.enlace;

    if (!e) { return {}; }

    let tiempo = 0, pausa = true;

    if (e.tipo === "archivo") {
        const el = document.getElementById("medio");
        tiempo = el.currentTime;
        pausa = el.paused;
    } else if (e.tipo === "youtube" && ytPlayer && ytPlayer.getCurrentTime) {
        tiempo = ytPlayer.getCurrentTime();
        pausa = ytPlayer.getPlayerState() !== 1;
    }

    return { url: e.url, tiempo: tiempo, pausa: pausa };
}

function aplicarInstantanea(d) {

    if (!d) { return; }

    if (actividad.tipo === "dibujo" && d.img) {
        const img = new Image();
        img.onload = function () {
            const c = document.getElementById("lienzo");
            if (c) { c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); }
        };
        img.src = d.img;
    } else if (actividad.tipo === "reto") {
        actividad.reto = d;
        pintarReto();
    } else if (d.url) {
        const e = parseEnlace(d.url);
        if (e) { mostrarEnlace(e, { tiempo: d.tiempo, pausa: d.pausa }); }
    }
}

function cerrarActividad(avisar) {

    if (!actividad) { return; }

    if (avisar) { enviarActividad({ t: "fin" }); }

    detenerPantalla();
    destruirYT();

    clearInterval(actividad.latido);
    actividad.canal.close();

    const medio = document.getElementById("medio");
    if (medio) { medio.pause(); }

    actividad = null;
    cerrarModal("modalActividad");
}

function finalizarActividad() {

    cerrarActividad(true);
    mostrarNotificacion("Actividad finalizada para todos.");
}


/* ---------- Musica y video ---------- */

function iniciarMedia() {

    const el = document.getElementById("medio");

    ["play", "pause", "seeked"].forEach(function (ev) {
        el.addEventListener(ev, function () {
            if (!actividad || actividad.remoto) { return; }
            enviarActividad({ t: "medio", accion: ev === "seeked" ? "seek" : (ev === "play" ? "play" : "pausa"), tiempo: el.currentTime });
        });
    });

    el.addEventListener("error", function () {
        if (el.getAttribute("src")) {
            mostrarNotificacion("El contenido no está disponible o el enlace no es válido.");
        }
    });
}

function cargarMedio() {

    const e = parseEnlace(document.getElementById("urlMedio").value.trim());

    if (!e) {
        mostrarNotificacion("Pega un enlace válido de YouTube, Spotify o de un archivo de audio o video.");
        return;
    }

    mostrarEnlace(e);
    enviarActividad({ t: "medio", accion: "src", url: e.url });
}

/* Detecta de que servicio es el enlace. */
function parseEnlace(url) {

    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);

    if (m) { return { tipo: "youtube", id: m[1], url: url }; }

    m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/i);

    if (m) { return { tipo: "spotify", clase: m[1].toLowerCase(), id: m[2], url: url }; }

    if (/^https?:\/\/\S+$/i.test(url)) { return { tipo: "archivo", url: url }; }

    return null;
}

let ytPlayer = null;
let ytApi = null;

function cargarYT() {

    if (ytApi) { return ytApi; }

    ytApi = new Promise(function (ok, fallo) {

        if (window.YT && window.YT.Player) { ok(); return; }

        window.onYouTubeIframeAPIReady = ok;

        const sc = document.createElement("script");
        sc.src = "https://www.youtube.com/iframe_api";
        sc.onerror = function () { ytApi = null; fallo(); };
        document.head.appendChild(sc);
    });

    return ytApi;
}

function destruirYT() {

    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) { /* ya no existe */ } }

    ytPlayer = null;
}

async function mostrarEnlace(e, ini) {

    const marco = document.getElementById("marco");
    const medio = document.getElementById("medio");

    if (!marco || !actividad) { return; }

    actividad.enlace = e;
    destruirYT();
    marco.innerHTML = "";

    if (e.tipo === "archivo") {

        marco.hidden = true;
        medio.hidden = false;
        aplicarMedio({ accion: "src", src: e.url });

        if (ini) { aplicarMedio({ accion: ini.pausa ? "pausa" : "play", tiempo: ini.tiempo }); }

        return;
    }

    medio.pause();
    medio.hidden = true;
    marco.hidden = false;

    if (e.tipo === "spotify") {

        const alto = (e.clase === "track" || e.clase === "episode") ? 152 : 352;

        marco.innerHTML = "<iframe src=\"https://open.spotify.com/embed/" + e.clase + "/" + e.id +
            "\" width=\"100%\" height=\"" + alto + "\" style=\"border:0;border-radius:12px\" " +
            "allow=\"autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture\" loading=\"lazy\"></iframe>" +
            "<p class=\"ayuda-act\"><a href=\"https://open.spotify.com/" + e.clase + "/" + e.id +
            "\" target=\"_blank\" rel=\"noopener\">Abrir completo en Spotify</a></p>";
        return;
    }

    if (location.protocol === "file:") {
        marco.hidden = true;
        mostrarNotificacion("YouTube no funciona abriendo el archivo directo. Usa un servidor local (http://localhost).");
        return;
    }

    marco.innerHTML = "<div id=\"ytDiv\"></div>";

    try {
        await cargarYT();
    } catch (x) {
        mostrarNotificacion("YouTube no está disponible en este momento.");
        return;
    }

    if (!actividad || actividad.enlace !== e) { return; }

    ytPlayer = new YT.Player("ytDiv", {
        width: "100%",
        height: "340",
        videoId: e.id,
        playerVars: { rel: 0, playsinline: 1 },
        events: {
            onReady: function () {
                if (ini) { aplicarYT({ accion: ini.pausa ? "pausa" : "play", tiempo: ini.tiempo }); }
            },
            onStateChange: function (ev) {
                if (!actividad || actividad.remoto) { return; }
                if (ev.data === 1 || ev.data === 2) {
                    enviarActividad({ t: "medio", accion: ev.data === 1 ? "play" : "pausa", tiempo: ytPlayer.getCurrentTime() });
                }
            },
            onError: function () { mostrarNotificacion("Ese video no se puede reproducir aquí."); }
        }
    });
}

function aplicarYT(m) {

    if (!ytPlayer || !ytPlayer.seekTo) { return; }

    actividad.remoto = true;

    if (typeof m.tiempo === "number" && Math.abs(ytPlayer.getCurrentTime() - m.tiempo) > 1.5) {
        ytPlayer.seekTo(m.tiempo, true);
    }

    if (m.accion === "play") { ytPlayer.playVideo(); }
    if (m.accion === "pausa") { ytPlayer.pauseVideo(); }

    setTimeout(function () { if (actividad) { actividad.remoto = false; } }, 700);
}

function aplicarMedio(m) {

    const el = document.getElementById("medio");

    if (!el || !actividad) { return; }

    if (actividad.enlace && actividad.enlace.tipo === "youtube") {
        aplicarYT(m);
        return;
    }

    actividad.remoto = true;

    if (m.accion === "src") {
        el.setAttribute("src", m.src);
    } else {
        if (typeof m.tiempo === "number" && Math.abs(el.currentTime - m.tiempo) > 0.7) { el.currentTime = m.tiempo; }
        if (m.accion === "play") { el.play().catch(function () {}); }
        if (m.accion === "pausa") { el.pause(); }
    }

    setTimeout(function () { if (actividad) { actividad.remoto = false; } }, 400);
}


/* ---------- Dibujo ---------- */

function iniciarLienzo() {

    const c = document.getElementById("lienzo");
    let previo = null;

    function punto(e) {
        const r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }

    c.addEventListener("pointerdown", function (e) { previo = punto(e); c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointerup", function () { previo = null; });

    c.addEventListener("pointermove", function (e) {
        if (!previo) { return; }
        const p = punto(e);
        const color = document.getElementById("colorTrazo").value;
        dibujarTrazo(previo.x, previo.y, p.x, p.y, color);
        enviarActividad({ t: "trazo", x0: previo.x, y0: previo.y, x1: p.x, y1: p.y, c: color });
        previo = p;
    });
}

function dibujarTrazo(x0, y0, x1, y1, color) {

    const c = document.getElementById("lienzo");

    if (!c) { return; }

    const ctx = c.getContext("2d");

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0 * c.width, y0 * c.height);
    ctx.lineTo(x1 * c.width, y1 * c.height);
    ctx.stroke();
}

function limpiarLienzo(difundir) {

    const c = document.getElementById("lienzo");

    if (c) { c.getContext("2d").clearRect(0, 0, c.width, c.height); }
    if (difundir) { enviarActividad({ t: "limpiar" }); }
}


/* ---------- Retos ---------- */

function nuevoReto() {

    actividad.reto = { i: Math.floor(Math.random() * RETOS.length), hechos: [] };
    pintarReto();
    enviarActividad({ t: "reto", i: actividad.reto.i });
}

function completarReto() {

    if (actividad.reto.i === null) {
        mostrarNotificacion("Primero saca un reto.");
        return;
    }

    if (actividad.reto.hechos.indexOf(USUARIO_ACTUAL.nombre) < 0) {
        actividad.reto.hechos.push(USUARIO_ACTUAL.nombre);
    }

    pintarReto();
    enviarActividad({ t: "hecho" });
}

function pintarReto() {

    const r = actividad.reto;

    document.getElementById("retoActual").textContent =
        r.i === null ? "Pulsa “Reto al azar” para empezar." : RETOS[r.i];

    document.getElementById("retoHechos").textContent =
        r.hechos.length ? "Completado por: " + r.hechos.join(", ") : "";
}


/* ---------- Cierre por ESC / clic afuera, y reconexion ---------- */

new MutationObserver(function () {
    const m = document.getElementById("modalActividad");
    if (actividad && !m.classList.contains("mostrar")) { cerrarActividad(false); }
}).observe(document.getElementById("modalActividad"), { attributes: true, attributeFilter: ["class"] });

window.addEventListener("online", function () {
    if (actividad) {
        enviarActividad({ t: "hola" });
        mostrarNotificacion("Conexión restablecida.");
    }
});

window.addEventListener("offline", function () {
    if (actividad) { mostrarNotificacion("Sin conexión. Intentaremos reconectarte."); }
});


/* ==========================================================
   COMPARTIR PANTALLA (WebRTC)
   Quien comparte envia su pantalla directamente a cada
   integrante conectado (peer-to-peer), sin subir ni descargar
   el archivo. La señalizacion viaja por el mismo canal.
   Requiere https o localhost.
========================================================== */

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let streamPantalla = null;
const pares = {};
const colaRtc = {};

function alternarPantalla() {

    if (streamPantalla) {
        detenerPantalla();
    } else {
        compartirPantalla();
    }
}

async function compartirPantalla() {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        mostrarNotificacion("Este navegador o dispositivo no permite compartir pantalla.");
        return;
    }

    try {
        streamPantalla = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch (e) {
        mostrarNotificacion("No se compartió la pantalla.");
        return;
    }

    streamPantalla.getVideoTracks()[0].onended = detenerPantalla;

    const medio = document.getElementById("medio");
    if (medio) { medio.pause(); }

    verPantalla(streamPantalla, true);
    document.getElementById("btnPantalla").innerHTML = "<i class=\"fa-solid fa-stop\"></i> Dejar de compartir";

    enviarActividad({ t: "pantalla", on: true });

    Object.keys(actividad.pares).forEach(function (id) { ofrecerPantalla(Number(id)); });
}

function verPantalla(stream, silenciar) {

    const v = document.getElementById("pantalla");

    if (!v) { return; }

    v.srcObject = stream;
    v.muted = !!silenciar;
    v.hidden = !stream;
}

function nuevoPar(id) {

    if (pares[id]) { pares[id].close(); }

    const pc = new RTCPeerConnection(ICE);

    pares[id] = pc;

    pc.onicecandidate = function (e) {
        if (e.candidate) { enviarActividad({ t: "rtc", para: id, cand: e.candidate }); }
    };

    pc.ontrack = function (e) { verPantalla(e.streams[0], false); };

    return pc;
}

async function ofrecerPantalla(id) {

    const pc = nuevoPar(id);

    streamPantalla.getTracks().forEach(function (t) { pc.addTrack(t, streamPantalla); });

    await pc.setLocalDescription(await pc.createOffer());

    enviarActividad({ t: "rtc", para: id, desc: pc.localDescription });
}

async function procesarRtc(m) {

    if (!actividad || m.para !== USUARIO_ACTUAL.id) { return; }

    let pc = pares[m.de];

    try {
        if (m.desc && m.desc.type === "offer") {

            pc = nuevoPar(m.de);
            await pc.setRemoteDescription(m.desc);
            await pc.setLocalDescription(await pc.createAnswer());
            enviarActividad({ t: "rtc", para: m.de, desc: pc.localDescription });

        } else if (m.desc && pc) {

            await pc.setRemoteDescription(m.desc);

        } else if (m.cand && pc) {

            await pc.addIceCandidate(m.cand);
        }
    } catch (e) {
        mostrarNotificacion("No se pudo conectar la pantalla compartida.");
    }
}

function limpiarRtc() {

    Object.keys(pares).forEach(function (id) {
        pares[id].close();
        delete pares[id];
    });
}

function detenerPantalla() {

    if (streamPantalla) {

        streamPantalla.getTracks().forEach(function (t) { t.stop(); });
        streamPantalla = null;

        enviarActividad({ t: "pantalla", on: false });
    }

    limpiarRtc();
    verPantalla(null);

    const b = document.getElementById("btnPantalla");

    if (b) { b.innerHTML = "<i class=\"fa-solid fa-display\"></i> Compartir pantalla"; }
}
