
// -------------------------
// Generar Tabla de Datos
// -------------------------
function generarTabla() {
    let r = parseInt(document.getElementById("rows").value);
    let c = parseInt(document.getElementById("cols").value);

    let html = "<table><tr><th></th>";
    for (let j = 0; j < c; j++) html += `<th>D${j+1}</th>`;
    html += "<th>Oferta</th></tr>";

    for (let i = 0; i < r; i++) {
        html += `<tr><th>F${i+1}</th>`;
        for (let j = 0; j < c; j++)
            html += `<td><input id="c${i}_${j}" type="number" value="1" style="width:70px"></td>`;
        html += `<td><input id="of${i}" type="number" value="0" style="width:70px"></td></tr>`;
    }

    html += "<tr><th>Demanda</th>";
    for (let j = 0; j < c; j++) 
        html += `<td><input id="de${j}" type="number" value="0" style="width:70px"></td>`;
    html += "<td></td></tr></table>";

    document.getElementById("tabla-container").innerHTML = html;
    // initialize globals if needed
}

// ---------------------------
// Método Esquina Noroeste
// ---------------------------
function metodoNoroeste(costos, oferta, demanda) {
    let r = oferta.length, c = demanda.length;
    let asignacion = Array.from({ length: r }, () => Array(c).fill(0));
    let pasos = [];

    let i = 0, j = 0;
    while (i < r && j < c) {
        let cant = Math.min(oferta[i], demanda[j]);
        asignacion[i][j] = cant;
        pasos.push({i, j, cantidad: cant});
        oferta[i] -= cant;
        demanda[j] -= cant;
        if (oferta[i] === 0) i++;
        if (demanda[j] === 0) j++;
    }
    return { asignacion, pasos };
}

// ---------------------------
// Costo total (simple)
function calcularCostoTotal(costos, asignacion) {
    let total = 0;
    for (let i=0;i<costos.length;i++)
        for (let j=0;j<costos[0].length;j++)
            total += (costos[i][j] || 0) * (asignacion[i][j] || 0);
    return total;
}

// ---------------------------
// Grafo (Nodos y Aristas) con etiquetas no solapadas
// ---------------------------
function dibujarNodo(ctx, x, y, label, color) {
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#666";
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.font = "bold 14px Segoe UI";
    ctx.fillText(label, x - 16, y + 5);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function dibujarGrafoBase(ctx, costos, fuentes, destinos) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 1.4;
    ctx.font = "13px Segoe UI";

    for (let i = 0; i < fuentes.length; i++) {
        for (let j = 0; j < destinos.length; j++) {
            let x1 = fuentes[i].x, y1 = fuentes[i].y, x2 = destinos[j].x, y2 = destinos[j].y;
            // línea base
            ctx.strokeStyle = "#d5d5d5";
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // punto medio y offset alternado para evitar solapamiento
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const offset = ((i + j) % 2 === 0) ? -14 : 14;

            // fondo translúcido redondeado
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.strokeStyle = "rgba(0,0,0,0.06)";
            drawRoundedRect(ctx, mx - 18, my + offset - 10, 36, 20, 6);
            ctx.fill();
            ctx.stroke();

            // texto
            ctx.fillStyle = "#222";
            ctx.font = "bold 13px Segoe UI";
            ctx.fillText(String(costos[i][j]), mx - 6, my + offset + 6);
        }
    }

    for (let f of fuentes) dibujarNodo(ctx, f.x, f.y, f.label, "#a8d0f0");
    for (let d of destinos) dibujarNodo(ctx, d.x, d.y, d.label, "#b9f0b3");
}

// ---------------------------
// Animación de una línea (movimiento fluido)
function animarLinea(ctx, fx, fy, dx, dy, texto, duracion) {
    let inicio = performance.now();
    function step(now) {
        let t = (now - inicio) / duracion;
        if (t > 1) t = 1;
        // easing (easeOutQuad)
        t = 1 - (1 - t) * (1 - t);

        dibujarGrafoBase(ctx, costosGlobal, fuentesGlobal, destinosGlobal);

        ctx.strokeStyle = "rgba(220,40,40,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + (dx - fx) * t, fy + (dy - fy) * t);
        ctx.stroke();

        ctx.fillStyle = "rgba(220,40,40," + Math.min(1, 0.2 + t) + ")";
        ctx.font = "bold 14px Segoe UI";
        ctx.fillText(texto, fx + (dx - fx) * t + 10, fy + (dy - fy) * t - 10);

        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ---------------------------
// GLOBALS
let costosGlobal = null, fuentesGlobal = null, destinosGlobal = null, asignacionGlobal = null;

// ---------------------------
// Resolver + Animar
function resolver() {
    const r = parseInt(document.getElementById("rows").value);
    const c = parseInt(document.getElementById("cols").value);

    // Leer datos
    const costos = [];
    const oferta = [];
    const demanda = [];
    for (let i=0;i<r;i++){
        const fila = [];
        for (let j=0;j<c;j++){
            const val = parseFloat(document.getElementById(`c${i}_${j}`).value) || 0;
            fila.push(val);
        }
        costos.push(fila);
        oferta.push(parseFloat(document.getElementById(`of${i}`).value) || 0);
    }
    for (let j=0;j<c;j++) demanda.push(parseFloat(document.getElementById(`de${j}`).value) || 0);

    // ejecutar método
    // Elegir método
    const metodo = document.getElementById("metodo").value;

    let result;

    if (metodo === "noroeste") {
        result = metodoNoroeste(costos, [...oferta], [...demanda]);
    }
    else if (metodo === "minimo") {
        result = metodoCostoMinimo(costos, [...oferta], [...demanda]);
    }
    else if (metodo === "vogel") {
        result = metodoVogel(costos, [...oferta], [...demanda]);
    }
    const asignacion = result.asignacion;
    const pasos = result.pasos;

    // preparar nodos
    const canvas = document.getElementById("graph"), ctx = canvas.getContext("2d");
    const fuenteX = 140, destinoX = canvas.width - 140;
    const spacingY = (canvas.height - 60) / Math.max(r, c);

    const fuentes = [], destinos = [];
    for (let i=0;i<r;i++) fuentes.push({ x: fuenteX, y: 40 + i * spacingY, label: `F${i+1}`});
    for (let j=0;j<c;j++) destinos.push({ x: destinoX, y: 40 + j * spacingY, label: `D${j+1}`});

    costosGlobal = costos; fuentesGlobal = fuentes; destinosGlobal = destinos; asignacionGlobal = asignacion;
    dibujarGrafoBase(ctx, costos, fuentes, destinos);

    // animar paso a paso (espera acumulada para secuenciar)
    pasos.forEach((p, idx) => {
        setTimeout(() => {
            const f = fuentes[p.i], d = destinos[p.j];
            animarLinea(ctx, f.x, f.y, d.x, d.y, `Paso ${idx+1}: ${p.cantidad}`, 800);
        }, idx * 900);
    });

    // mostrar matriz solución y costo total
    generarMatrizSolucion(asignacion);
    const total = calcularCostoTotal(costos, asignacion);
    document.getElementById("totalCostLine").innerText = `Costo total: ${total.toFixed(2)}`;
}

// Dibujar sin animación (solo grafo base con la asignación actual si existe)
function dibujarActual() {
    if (!costosGlobal || !fuentesGlobal || !destinosGlobal) {
        alert("Primero resuelve para generar un grafo.");
        return;
    }
    const canvas = document.getElementById("graph"), ctx = canvas.getContext("2d");
    dibujarGrafoBase(ctx, costosGlobal, fuentesGlobal, destinosGlobal);
}

// ---------------------------
// Tabla Solución
function generarMatrizSolucion(asig) {
    let html = "<table><tr><th></th>";
    for (let j = 0; j < asig[0].length; j++) html += `<th>D${j+1}</th>`;
    html += "</tr>";
    for (let i = 0; i < asig.length; i++) {
        html += `<tr><th>F${i+1}</th>`;
        for (let j = 0; j < asig[0].length; j++) html += `<td>${asig[i][j]}</td>`;
        html += "</tr>";
    }
    html += "</table>";
    document.getElementById("solucion").innerHTML = html;
}

// ---------------------------
// SENSIBILIDAD: costos
// Simular cambio en costo manteniendo asignación fija (rápido)
function simularCambioCosto() {
    if (!asignacionGlobal || !costosGlobal) { alert("Resuelve primero para tener una asignación."); return; }

    const i = parseInt(document.getElementById("sens_i").value) - 1;
    const j = parseInt(document.getElementById("sens_j").value) - 1;
    const newCost = parseFloat(document.getElementById("sens_newcost").value);

    if (isNaN(i) || isNaN(j) || i<0 || j<0 || i>=costosGlobal.length || j>=costosGlobal[0].length) {
        document.getElementById("sens_output").innerText = "Índice fuera de rango.";
        return;
    }

    const old = costosGlobal[i][j];
    const asign = asignacionGlobal[i][j] || 0;
    const delta = (newCost - old) * asign;
    const oldTotal = calcularCostoTotal(costosGlobal, asignacionGlobal);
    const newTotal = oldTotal + delta;

    // mostrar resultados
    document.getElementById("sens_output").innerHTML =
        `Asignación fija: x[${i+1},${j+1}] = ${asign}. ` +
        `Costo anterior celda: ${old}. Nuevo costo: ${newCost}. ` +
        `Cambio en costo total (Δ) = ${delta.toFixed(2)}. Nuevo total (simulado) = ${newTotal.toFixed(2)}.`;

    // resaltar la arista cambiada temporalmente (dibujar encima)
    const canvas = document.getElementById("graph"), ctx = canvas.getContext("2d");
    dibujarGrafoBase(ctx, costosGlobal, fuentesGlobal, destinosGlobal);
    const f = fuentesGlobal[i], d = destinosGlobal[j];
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
}

// Aplicar cambio en la tabla y recalcular (Esquina Noroeste)
function aplicarCambioYCorrer() {
    const i = parseInt(document.getElementById("sens_i").value) - 1;
    const j = parseInt(document.getElementById("sens_j").value) - 1;
    const newCost = parseFloat(document.getElementById("sens_newcost").value);
    if (isNaN(i) || isNaN(j) || i<0 || j<0) { document.getElementById("sens_output").innerText = "Índice inválido."; return; }

    // actualizar input original y volver a resolver (recalcula asignación)
    const inputId = `c${i}_${j}`;
    const inputEl = document.getElementById(inputId);
    if (!inputEl) { document.getElementById("sens_output").innerText = "No existe la celda indicada."; return; }
    inputEl.value = newCost;
    // ejecutar resolver (animación incluida)
    resolver();
    document.getElementById("sens_output").innerText = `Costo c[${i+1},${j+1}] actualizado a ${newCost} y recalculado.`;
}

// ---------------------------
// SENSIBILIDAD: oferta / demanda
// Cambiar oferta de una fila y recalcular (Esquina Noroeste)
function simularCambioOferta() {
    const i = parseInt(document.getElementById("sens_of_i").value) - 1;
    const val = parseFloat(document.getElementById("sens_of_val").value);
    if (isNaN(i) || i<0) { document.getElementById("sens_supply_output").innerText = "Índice inválido."; return; }

    // actualizar input y recalcular
    const inputId = `of${i}`;
    const inputEl = document.getElementById(inputId);
    if (!inputEl) { document.getElementById("sens_supply_output").innerText = "Fila inválida."; return; }
    inputEl.value = val;
    resolver();
    document.getElementById("sens_supply_output").innerText = `Oferta F${i+1} actualizada a ${val} y recalculada.`;
}

function simularCambioDemanda() {
    const j = parseInt(document.getElementById("sens_de_j").value) - 1;
    const val = parseFloat(document.getElementById("sens_de_val").value);
    if (isNaN(j) || j<0) { document.getElementById("sens_supply_output").innerText = "Índice inválido."; return; }

    const inputId = `de${j}`;
    const inputEl = document.getElementById(inputId);
    if (!inputEl) { document.getElementById("sens_supply_output").innerText = "Columna inválida."; return; }
    inputEl.value = val;
    resolver();
    document.getElementById("sens_supply_output").innerText = `Demanda D${j+1} actualizada a ${val} y recalculada.`;
}


// -----------------------------------
// MÉTODO: Vogel (VAM)
// -----------------------------------
function metodoVogel(costos, oferta, demanda) {
    let r = oferta.length, c = demanda.length;
    let asig = Array.from({ length: r }, () => Array(c).fill(0));
    let pasos = [];

    let activeRows = Array(r).fill(true);
    let activeCols = Array(c).fill(true);

    function calcularPenalizaciones() {
        let rowPenalty = Array(r).fill(-1);
        let colPenalty = Array(c).fill(-1);

        for (let i = 0; i < r; i++) {
            if (!activeRows[i]) continue;
            let vals = [];
            for (let j = 0; j < c; j++) if (activeCols[j]) vals.push(costos[i][j]);
            vals.sort((a, b) => a - b);
            rowPenalty[i] = vals.length >= 2 ? vals[1] - vals[0] : vals[0];
        }

        for (let j = 0; j < c; j++) {
            if (!activeCols[j]) continue;
            let vals = [];
            for (let i = 0; i < r; i++) if (activeRows[i]) vals.push(costos[i][j]);
            vals.sort((a, b) => a - b);
            colPenalty[j] = vals.length >= 2 ? vals[1] - vals[0] : vals[0];
        }

        return { rowPenalty, colPenalty };
    }

    while (true) {
        const pendientes = oferta.some(x => x > 0) && demanda.some(x => x > 0);
        if (!pendientes) break;

        let { rowPenalty, colPenalty } = calcularPenalizaciones();

        let maxRow = Math.max(...rowPenalty);
        let maxCol = Math.max(...colPenalty);

        let selectRow = true;
        if (maxCol > maxRow) selectRow = false;

        let targetI = -1, targetJ = -1;

        if (selectRow) {
            targetI = rowPenalty.indexOf(maxRow);
            let minVal = Infinity;
            for (let j = 0; j < c; j++)
                if (activeCols[j] && costos[targetI][j] < minVal) {
                    minVal = costos[targetI][j];
                    targetJ = j;
                }
        } else {
            targetJ = colPenalty.indexOf(maxCol);
            let minVal = Infinity;
            for (let i = 0; i < r; i++)
                if (activeRows[i] && costos[i][targetJ] < minVal) {
                    minVal = costos[i][targetJ];
                    targetI = i;
                }
        }

        let cant = Math.min(oferta[targetI], demanda[targetJ]);
        asig[targetI][targetJ] = cant;
        pasos.push({ i: targetI, j: targetJ, cantidad: cant });

        oferta[targetI] -= cant;
        demanda[targetJ] -= cant;

        if (oferta[targetI] === 0) activeRows[targetI] = false;
        if (demanda[targetJ] === 0) activeCols[targetJ] = false;
    }

    return { asignacion: asig, pasos };
}
// -----------------------------------
// MÉTODO: Costo Mínimo
// -----------------------------------
function metodoCostoMinimo(costos, oferta, demanda) {
    let r = oferta.length, c = demanda.length;
    let asig = Array.from({ length: r }, () => Array(c).fill(0));
    let pasos = [];

    while (true) {
        let minVal = Infinity, mi = -1, mj = -1;

        for (let i = 0; i < r; i++) {
            if (oferta[i] === 0) continue;
            for (let j = 0; j < c; j++) {
                if (demanda[j] === 0) continue;
                if (costos[i][j] < minVal) {
                    minVal = costos[i][j];
                    mi = i; mj = j;
                }
            }
        }
        if (mi === -1) break;

        let cant = Math.min(oferta[mi], demanda[mj]);
        asig[mi][mj] = cant;
        pasos.push({ i: mi, j: mj, cantidad: cant });

        oferta[mi] -= cant;
        demanda[mj] -= cant;
    }

    return { asignacion: asig, pasos };
}


// Inicializar tabla por defecto
generarTabla();