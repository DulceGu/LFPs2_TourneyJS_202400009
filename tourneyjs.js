/**
 * Inicia la aplicación cuando se carga la página.
 */
function iniciar_aplicacion() {
    const boton = document.getElementById('boton_analizar');
    if (boton) {
        boton.addEventListener('click', manejar_boton_analizar);
    }
}

/**
 * Maneja el clic del botón "Analizar Torneo".
 */
function manejar_boton_analizar() {
    const caja_entrada = document.getElementById('caja_entrada');
    const texto_entrada = caja_entrada.value;

    if (!texto_entrada.trim()) {
        alert("¡Por favor, ingresa la definición del torneo!");
        return;
    }

    const analizador = new AnalizadorLexico();
    analizador.analizar(texto_entrada);

    const contenedor_salida = document.getElementById('contenedor_salida');

    if (analizador.hay_errores()) {
        contenedor_salida.innerHTML = generar_tabla_errores(analizador.obtener_errores());
    } else {
        const tokens = analizador.obtener_tokens();
        let html = generar_tabla_tokens(tokens);
        html += generar_reporte_general(tokens);
        html += generar_reporte_equipos(tokens);
        html += generar_reporte_goleadores(tokens);
        html += generar_reporte_bracket(tokens);
        contenedor_salida.innerHTML = html;
    }
}

/**
 * Genera el HTML para la tabla de errores.
 */
function generar_tabla_errores(lista_errores) {
    let html = '<div class="error">';
    html += '<h3>❌ ¡Se encontraron errores léxicos!</h3>';
    html += '</div>';

    html += '<table>';
    html += '<thead><tr><th>No.</th><th>Lexema</th><th>Tipo de Error</th><th>Descripción</th><th>Línea</th><th>Columna</th></tr></thead>';
    html += '<tbody>';

    const errores = lista_errores.a_array();
    for (let i = 0; i < errores.length; i++) {
        const error = errores[i];
        html += `<tr>
            <td><strong>${error.numero}</strong></td>
            <td>${escape_html(error.lexema)}</td>
            <td>${error.tipo}</td>
            <td>${error.descripcion}</td>
            <td>${error.linea}</td>
            <td>${error.columna}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    return html;
}

/**
 * Genera el HTML para la tabla de tokens.
 */
function generar_tabla_tokens(lista_tokens) {
    let html = '<div class="exito">';
    html += '<h3>✅ ¡Análisis léxico completado con éxito!</h3>';
    html += '</div>';

    html += '<table>';
    html += '<thead><tr><th>No.</th><th>Lexema</th><th>Tipo</th><th>Línea</th><th>Columna</th></tr></thead>';
    html += '<tbody>';

    const tokens = lista_tokens.a_array();
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        html += `<tr>
            <td><strong>${token.numero}</strong></td>
            <td>${escape_html(token.lexema)}</td>
            <td>${token.tipo}</td>
            <td>${token.linea}</td>
            <td>${token.columna}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    return html;
}

/**
 * Genera el Reporte de Información General del Torneo.
 */
function generar_reporte_general(tokens) {
    const lista = tokens.a_array();

    let nombreTorneo = "Desconocido";
    let sede = "No definida";
    let equipos = new Set();
    let totalPartidos = 0;
    let completados = 0;
    let totalGoles = 0;
    let edades = [];

    for (let i = 0; i < lista.length; i++) {
        const t = lista[i];

        // Detectar nombre del torneo
        if (t.lexema === "nombre" && lista[i+2]?.tipo === "Cadena") {
            nombreTorneo = lista[i+2].lexema;
        }

        // Detectar sede
        if (t.lexema === "sede" && lista[i+2]?.tipo === "Cadena") {
            sede = lista[i+2].lexema;
        }

        // Detectar equipos
        if (t.lexema === "equipo" && lista[i+2]?.tipo === "Cadena") {
            equipos.add(lista[i+2].lexema);
        }

        // Detectar jugadores (para edad promedio)
        if (t.lexema === "edad" && lista[i+2]?.tipo === "Número") {
            edades.push(parseInt(lista[i+2].lexema));
        }

        // Detectar partidos
        if (t.lexema === "partido") {
            totalPartidos++;
        }

        // Detectar resultados de partidos
        if (t.lexema === "resultado" && lista[i+2]?.tipo === "Cadena") {
            const res = lista[i+2].lexema; // Ej: "4-2"
            const goles = res.split("-").map(n => parseInt(n));
            if (goles.length === 2 && !isNaN(goles[0]) && !isNaN(goles[1])) {
                totalGoles += (goles[0] + goles[1]);
                completados++;
            }
        }
    }

    const edadPromedio = edades.length > 0
        ? (edades.reduce((a,b) => a+b, 0) / edades.length).toFixed(2)
        : "N/A";

    const promedioGoles = completados > 0
        ? (totalGoles / completados).toFixed(2)
        : "0";

    let html = "<h3>📊 Información General del Torneo</h3>";
    html += "<table>";
    html += "<tr><th>Estadística</th><th>Valor</th></tr>";
    html += `<tr><td>Nombre del Torneo</td><td>${escape_html(nombreTorneo)}</td></tr>`;
    html += `<tr><td>Sede</td><td>${escape_html(sede)}</td></tr>`;
    html += `<tr><td>Equipos Participantes</td><td>${equipos.size}</td></tr>`;
    html += `<tr><td>Total de Partidos Programados</td><td>${totalPartidos}</td></tr>`;
    html += `<tr><td>Partidos Completados</td><td>${completados}</td></tr>`;
    html += `<tr><td>Total de Goles</td><td>${totalGoles}</td></tr>`;
    html += `<tr><td>Promedio de Goles por Partido</td><td>${promedioGoles}</td></tr>`;
    html += `<tr><td>Edad Promedio de Jugadores</td><td>${edadPromedio}</td></tr>`;
    html += "</table>";

    return html;
}

/**
 * Genera el Reporte de Estadísticas por Equipo.
 */
function generar_reporte_equipos(tokens) {
    const lista = tokens.a_array();
    let equipos = {};

    // Inicializar equipos cuando aparecen
    for (let i = 0; i < lista.length; i++) {
        const t = lista[i];
        if (t.lexema === "equipo" && lista[i+2]?.tipo === "Cadena") {
            const nombreEquipo = lista[i+2].lexema;
            if (!equipos[nombreEquipo]) {
                equipos[nombreEquipo] = {
                    nombre: nombreEquipo,
                    jugados: 0,
                    ganados: 0,
                    perdidos: 0,
                    golesFavor: 0,
                    golesContra: 0,
                    diferencia: 0,
                    fase: "No definida"
                };
            }
        }
    }

    // Analizar partidos
    for (let i = 0; i < lista.length; i++) {
        const t = lista[i];

        if (t.lexema === "partido") {
            const equipo1 = lista[i+2]?.lexema;
            const vs = lista[i+3]?.lexema; // debería ser "vs"
            const equipo2 = lista[i+4]?.lexema;

            let resultado = null;
            let fase = "Desconocida";

            // Buscar resultado y fase cerca de este partido
            for (let j = i; j < lista.length; j++) {
                if (lista[j].lexema === "resultado" && lista[j+2]?.tipo === "Cadena") {
                    resultado = lista[j+2].lexema;
                    break;
                }
            }

            // Retroceder para detectar fase (final, semifinal, cuartos)
            for (let j = i; j >= 0; j--) {
                if (["final", "semifinal", "cuartos"].includes(lista[j].lexema)) {
                    fase = lista[j].lexema;
                    break;
                }
            }

            if (resultado && equipos[equipo1] && equipos[equipo2]) {
                const [g1, g2] = resultado.split("-").map(x => parseInt(x));

                // Actualizar partidos jugados
                equipos[equipo1].jugados++;
                equipos[equipo2].jugados++;

                // Goles a favor/contra
                equipos[equipo1].golesFavor += g1;
                equipos[equipo1].golesContra += g2;
                equipos[equipo2].golesFavor += g2;
                equipos[equipo2].golesContra += g1;

                // Diferencias
                equipos[equipo1].diferencia = equipos[equipo1].golesFavor - equipos[equipo1].golesContra;
                equipos[equipo2].diferencia = equipos[equipo2].golesFavor - equipos[equipo2].golesContra;

                // Ganados y perdidos
                if (g1 > g2) {
                    equipos[equipo1].ganados++;
                    equipos[equipo2].perdidos++;
                    equipos[equipo1].fase = fase; // Avanza
                    equipos[equipo2].fase = fase; // Pierde pero registra fase
                } else if (g2 > g1) {
                    equipos[equipo2].ganados++;
                    equipos[equipo1].perdidos++;
                    equipos[equipo2].fase = fase;
                    equipos[equipo1].fase = fase;
                }
            }
        }
    }

    // Generar tabla HTML
    let html = "<h3>⚽ Estadísticas por Equipo</h3>";
    html += "<table>";
    html += "<thead><tr><th>Equipo</th><th>Partidos Jugados</th><th>Ganados</th><th>Perdidos</th><th>Goles Favor</th><th>Goles Contra</th><th>Diferencia</th><th>Fase Alcanzada</th></tr></thead><tbody>";

    for (let nombre in equipos) {
        const e = equipos[nombre];
        html += `<tr>
            <td>${escape_html(e.nombre)}</td>
            <td>${e.jugados}</td>
            <td>${e.ganados}</td>
            <td>${e.perdidos}</td>
            <td>${e.golesFavor}</td>
            <td>${e.golesContra}</td>
            <td>${e.diferencia}</td>
            <td>${e.fase}</td>
        </tr>`;
    }

    html += "</tbody></table>";
    return html;
}

/**
 * Genera el Reporte de Goleadores (ranking con minutos).
 */
function generar_reporte_goleadores(tokens) {
    const lista = tokens.a_array();

    // 1) Mapear jugador -> equipo (recorremos la sección EQUIPOS)
    const jugadorEquipo = {}; // "Juan Pérez" -> "Toros FC"
    let equipoActual = null;
    for (let i = 0; i < lista.length; i++) {
        const t = lista[i];

        // Detectamos cambio de equipo
        if (t.lexema === "equipo" && lista[i+2]?.tipo === "Cadena") {
            equipoActual = lista[i+2].lexema;
        }

        // Detectamos jugador y lo asignamos al equipo actual (si existe)
        if (t.lexema === "jugador" && lista[i+2]?.tipo === "Cadena") {
            const nombreJugador = lista[i+2].lexema;
            if (equipoActual) {
                jugadorEquipo[nombreJugador] = equipoActual;
            } else {
                // Si no hay equipo actual, lo dejamos sin equipo (por seguridad)
                jugadorEquipo[nombreJugador] = jugadorEquipo[nombreJugador] || "No definido";
            }
        }

        // Si salimos de la sección EQUIPOS podríamos resetear equipoActual,
        // pero no es estrictamente necesario para entradas bien formadas.
    }

    // 2) Contabilizar goles y minutos por jugador
    const mapaGoleadores = {}; // "Luis Gómez" -> { goles: 3, minutos: ["5","30","70"] }

    for (let i = 0; i < lista.length; i++) {
        const t = lista[i];

        // Cuando encontramos un "goleador", tomamos su nombre y buscamos su minuto cercano
        if (t.lexema === "goleador" && lista[i+2]?.tipo === "Cadena") {
            const nombre = lista[i+2].lexema;

            // Buscar el "minuto" más cercano hacia adelante (hasta el próximo 'goleador' o cierre)
            let minutoEncontrado = null;
            for (let j = i; j < lista.length; j++) {
                if (lista[j].lexema === "minuto" && lista[j+2]?.tipo === "Número") {
                    minutoEncontrado = lista[j+2].lexema;
                    break;
                }
                // Si llegamos al siguiente goleador sin encontrar minuto, dejamos null
                if (j !== i && lista[j].lexema === "goleador") break;
            }

            if (!mapaGoleadores[nombre]) {
                mapaGoleadores[nombre] = { goles: 0, minutos: [], equipo: jugadorEquipo[nombre] || "No definido" };
            }
            mapaGoleadores[nombre].goles++;
            if (minutoEncontrado !== null) {
                mapaGoleadores[nombre].minutos.push(minutoEncontrado.toString());
            }
        }
    }

    // 3) Convertir a array y ordenar por goles descendente, luego por nombre
    const arr = Object.keys(mapaGoleadores).map(name => {
        return {
            nombre: name,
            goles: mapaGoleadores[name].goles,
            minutos: mapaGoleadores[name].minutos,
            equipo: mapaGoleadores[name].equipo
        };
    });

    arr.sort((a, b) => {
        if (b.goles !== a.goles) return b.goles - a.goles;
        return a.nombre.localeCompare(b.nombre);
    });

    // 4) Generar HTML
    let html = "<h3>🥇 Reporte de Goleadores</h3>";
    html += "<table>";
    html += "<thead><tr><th>Pos.</th><th>Jugador</th><th>Equipo</th><th>Goles</th><th>Minutos</th></tr></thead><tbody>";

    for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        const minutosTexto = p.minutos.length > 0 ? p.minutos.join(", ") : "-";
        html += `<tr>
            <td>${i+1}</td>
            <td>${escape_html(p.nombre)}</td>
            <td>${escape_html(p.equipo)}</td>
            <td>${p.goles}</td>
            <td>${escape_html(minutosTexto)}</td>
        </tr>`;
    }

    html += "</tbody></table>";

    // Si no hay goleadores, mostrar un mensaje
    if (arr.length === 0) {
        html = "<h3>🥇 Reporte de Goleadores</h3><p>No se detectaron goles en la entrada.</p>";
    }

    return html;
}


/**
 * Escapa caracteres HTML para prevenir XSS (básico).
 */
function escape_html(texto) {
    if (typeof texto !== 'string') return texto;
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Iniciamos la aplicación
document.addEventListener('DOMContentLoaded', iniciar_aplicacion);