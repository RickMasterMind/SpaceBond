/* ==========================================================
   BONDSPACE - LLAMADAS Y VIDEOLLAMADAS ENTRE INTEGRANTES
   Audio/video directo (WebRTC). La señalizacion viaja por un
   BroadcastChannel, igual que las actividades: hoy funciona
   entre pestañas del mismo navegador; para dispositivos
   distintos se cambia por un WebSocket. Requiere https o
   localhost para usar micro y camara.
========================================================== */

let llamada = null;
let llCanal = null;
const llCola = {};

function iniciarLlamadas() {

    detenerLlamadas();

    llCanal = new BroadcastChannel("bondspace_llamadas_" + ESPACIO_ACTUAL_ID);
    llCanal.onmessage = function (e) { recibirLlamada(e.data); };
}

function detenerLlamadas() {

    if (llamada) { colgar(true); }

    if (llCanal) {
        llCanal.close();
        llCanal = null;
    }
}

function enviarLl(m) {

    if (!llCanal) { return; }

    m.de = USUARIO_ACTUAL.id;
    m.nombre = USUARIO_ACTUAL.nombre;

    llCanal.postMessage(m);
}

function pedirMedios(video) {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Promise.reject(new Error("sin medios"));
    }

    return navigator.mediaDevices.getUserMedia({ audio: true, video: !!video });
}

async function miembroPorId(id) {

    const espacio = await espacioActual();

    return espacio ? espacio.miembros.find(function (m) { return m.id === id; }) : null;
}


/* ---------- Llamar ---------- */

async function llamar(id, video) {

    if (llamada) {
        mostrarNotificacion("Ya estás en una llamada.");
        return;
    }

    const destino = await miembroPorId(id);

    if (!destino) { return; }

    let stream;

    try {
        stream = await pedirMedios(video);
    } catch (e) {
        mostrarNotificacion("No se pudo usar el micrófono" + (video ? " o la cámara" : "") + ". Revisa los permisos (y usa https o localhost).");
        return;
    }

    llamada = { con: id, nombre: destino.nombre, foto: destino.foto, video: !!video, estado: "saliendo", pc: null, stream: stream, espera: null, silencio: false, sinCamara: false };

    pintarLlamada();
    enviarLl({ t: "llamar", para: id, video: !!video });

    llamada.espera = setTimeout(function () {
        if (llamada && llamada.estado === "saliendo") {
            mostrarNotificacion(destino.nombre + " no contestó.");
            colgar(true);
        }
    }, 30000);
}

async function recibirLlamada(m) {

    if (m.para !== USUARIO_ACTUAL.id) { return; }

    switch (m.t) {

        case "llamar": {
            if (llamada) {
                enviarLl({ t: "rechazar", para: m.de, motivo: "ocupado" });
                return;
            }

            const quien = await miembroPorId(m.de);

            llamada = { con: m.de, nombre: m.nombre, foto: quien ? quien.foto : null, video: !!m.video, estado: "entrante", pc: null, stream: null, espera: null, silencio: false, sinCamara: false };
            pintarLlamada();
            break;
        }

        case "aceptar":
            if (llamada && llamada.con === m.de && llamada.estado === "saliendo") {
                clearTimeout(llamada.espera);
                llamada.estado = "conectando";
                pintarLlamada();
                iniciarPar();
            }
            break;

        case "rechazar":
        case "colgar":
            if (llamada && llamada.con === m.de) {
                mostrarNotificacion(m.t === "rechazar"
                    ? (m.motivo === "ocupado" ? m.nombre + " está en otra llamada." : m.nombre + " rechazó la llamada.")
                    : m.nombre + " terminó la llamada.");
                limpiarLlamada();
            }
            break;

        case "rtc":
            llCola[m.de] = (llCola[m.de] || Promise.resolve()).then(function () { return procesarRtcLl(m); });
            break;
    }
}


/* ---------- Contestar, rechazar, colgar ---------- */

async function aceptarLlamada() {

    if (!llamada || llamada.estado !== "entrante") { return; }

    try {
        llamada.stream = await pedirMedios(llamada.video);
    } catch (e) {
        mostrarNotificacion("No se pudo usar el micrófono" + (llamada.video ? " o la cámara" : "") + ".");
        rechazarLlamada();
        return;
    }

    llamada.estado = "conectando";
    crearParLl();
    pintarLlamada();
    enviarLl({ t: "aceptar", para: llamada.con });
}

function rechazarLlamada() {

    if (!llamada) { return; }

    enviarLl({ t: "rechazar", para: llamada.con });
    limpiarLlamada();
}

function colgar(avisar) {

    if (!llamada) { return; }

    if (avisar) { enviarLl({ t: "colgar", para: llamada.con }); }

    limpiarLlamada();
}

function limpiarLlamada() {

    if (!llamada) { return; }

    const actual = llamada;

    llamada = null;

    clearTimeout(actual.espera);

    if (actual.pc) { actual.pc.close(); }
    if (actual.stream) { actual.stream.getTracks().forEach(function (t) { t.stop(); }); }

    document.getElementById("videoRemoto").srcObject = null;
    document.getElementById("videoLocal").srcObject = null;

    cerrarModal("modalLlamada");
}


/* ---------- WebRTC ---------- */

function crearParLl() {

    const pc = new RTCPeerConnection(ICE);

    llamada.pc = pc;

    llamada.stream.getTracks().forEach(function (t) { pc.addTrack(t, llamada.stream); });

    pc.onicecandidate = function (e) {
        if (e.candidate && llamada) { enviarLl({ t: "rtc", para: llamada.con, cand: e.candidate }); }
    };

    pc.ontrack = function (e) {
        if (!llamada) { return; }
        document.getElementById("videoRemoto").srcObject = e.streams[0];
        llamada.estado = "activa";
        pintarLlamada();
    };

    pc.onconnectionstatechange = function () {
        if (llamada && llamada.pc === pc && pc.connectionState === "failed") {
            mostrarNotificacion("Se perdió la conexión de la llamada.");
            colgar(true);
        }
    };
}

async function iniciarPar() {

    crearParLl();

    const pc = llamada.pc;

    await pc.setLocalDescription(await pc.createOffer());

    enviarLl({ t: "rtc", para: llamada.con, desc: pc.localDescription });
}

async function procesarRtcLl(m) {

    if (!llamada || !llamada.pc || m.de !== llamada.con) { return; }

    const pc = llamada.pc;

    try {
        if (m.desc) {
            await pc.setRemoteDescription(m.desc);

            if (m.desc.type === "offer") {
                await pc.setLocalDescription(await pc.createAnswer());
                enviarLl({ t: "rtc", para: llamada.con, desc: pc.localDescription });
            }
        } else if (m.cand) {
            await pc.addIceCandidate(m.cand);
        }
    } catch (e) {
        mostrarNotificacion("No se pudo establecer la llamada.");
        colgar(true);
    }
}


/* ---------- Interfaz ---------- */

function pintarLlamada() {

    if (!llamada) { return; }

    const texto = {
        saliendo: "Llamando…",
        entrante: llamada.video ? "te invita a una videollamada" : "te está llamando",
        conectando: "Conectando…",
        activa: llamada.video ? "Videollamada en curso" : "Llamada en curso"
    };

    const modal = document.getElementById("modalLlamada");

    document.getElementById("llamadaTitulo").textContent = llamada.nombre;
    document.getElementById("llamadaEstado").textContent = texto[llamada.estado];
    document.getElementById("llamadaAvatar").innerHTML = avatarHTML(llamada.nombre, llamada.foto);

    document.getElementById("llEntrante").hidden = llamada.estado !== "entrante";
    document.getElementById("llControles").hidden = llamada.estado === "entrante";
    document.getElementById("btnCamara").hidden = !llamada.video;

    const conVideo = llamada.video && llamada.estado === "activa";

    document.getElementById("videoRemoto").hidden = !conVideo;
    document.getElementById("llamadaAvatar").hidden = conVideo;

    const local = document.getElementById("videoLocal");

    if (llamada.video && llamada.stream) {
        local.srcObject = llamada.stream;
        local.hidden = false;
    } else {
        local.hidden = true;
    }

    modal.querySelector(".llamada").classList.toggle("conectada", llamada.estado === "activa");

    abrirModal("modalLlamada");
}

function alternarMute() {

    if (!llamada || !llamada.stream) { return; }

    llamada.silencio = !llamada.silencio;

    llamada.stream.getAudioTracks().forEach(function (t) { t.enabled = !llamada.silencio; });

    const b = document.getElementById("btnMute");

    b.classList.toggle("apagado", llamada.silencio);
    b.innerHTML = "<i class=\"fa-solid " + (llamada.silencio ? "fa-microphone-slash" : "fa-microphone") + "\"></i>";
}

function alternarCamara() {

    if (!llamada || !llamada.stream) { return; }

    llamada.sinCamara = !llamada.sinCamara;

    llamada.stream.getVideoTracks().forEach(function (t) { t.enabled = !llamada.sinCamara; });

    const b = document.getElementById("btnCamara");

    b.classList.toggle("apagado", llamada.sinCamara);
    b.innerHTML = "<i class=\"fa-solid " + (llamada.sinCamara ? "fa-video-slash" : "fa-video") + "\"></i>";
}

/* Cerrar el modal con ESC o clic afuera cuelga la llamada. */
new MutationObserver(function () {
    const m = document.getElementById("modalLlamada");
    if (llamada && !m.classList.contains("mostrar")) { colgar(true); }
}).observe(document.getElementById("modalLlamada"), { attributes: true, attributeFilter: ["class"] });
