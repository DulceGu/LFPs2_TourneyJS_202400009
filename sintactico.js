/**
 * Analizador Sintáctico y Generador de Reportes para TourneyJS.
 * Toma una lista de tokens y construye la estructura del torneo.
 */
function AnalizadorSintactico() {
    this.tokens = null;
    this.indice_token = 0;
    this.torneo = {
        nombre: "",
        equipos_cantidad: 0,
        sede: "",
        equipos: [],
        fases: {
            cuartos: [],
            semifinal: [],
            final: []
        }
    };
    this.errores_sintacticos = [];
}

/**
 * Inicia el análisis sintáctico.
 * @param {ListaEnlazada} lista_tokens - Lista de tokens generada por el analizador léxico.
 * @returns {boolean} - true si el análisis fue exitoso, false si hubo errores.
 */
AnalizadorSintactico.prototype.analizar = function(lista_tokens) {
    this.tokens = lista_tokens.a_array(); // Convertimos a array para iterar fácilmente
    this.indice_token = 0;
    this.errores_sintacticos = [];
    this.torneo = { nombre: "", equipos_cantidad: 0, sede: "", equipos: [], fases: { cuartos: [], semifinal: [], final: [] } };

    try {
        this.procesar_torneo();
        this.procesar_equipos();
        this.procesar_eliminacion();

        // Validación final: número de equipos declarado vs equipos reales
        if (this.torneo.equipos.length !== this.torneo.equipos_cantidad) {
            this.registrar_error_sintactico(
                "Inconsistencia",
                `Se declararon ${this.torneo.equipos_cantidad} equipos, pero se definieron ${this.torneo.equipos.length}.`
            );
        }

        return this.errores_sintacticos.length === 0;
    } catch (error) {
        this.registrar_error_sintactico("Excepción", error.message);
        return false;
    }
};

/**
 * Registra un error sintáctico.
 * @param {string} tipo - Tipo de error.
 * @param {string} mensaje - Descripción del error.
 */
AnalizadorSintactico.prototype.registrar_error_sintactico = function(tipo, mensaje) {
    const token_actual = this.token_actual();
    this.errores_sintacticos.push({
        numero: this.errores_sintacticos.length + 1,
        tipo: tipo,
        mensaje: mensaje,
        linea: token_actual ? token_actual.linea : 0,
        columna: token_actual ? token_actual.columna : 0
    });
};

/**
 * Obtiene el token actual sin avanzar.
 * @returns {Object|null}
 */
AnalizadorSintactico.prototype.token_actual = function() {
    if (this.indice_token < this.tokens.length) {
        return this.tokens[this.indice_token];
    }
    return null;
};

/**
 * Consume el token actual y avanza al siguiente.
 * @returns {Object|null}
 */
AnalizadorSintactico.prototype.consumir_token = function() {
    const token = this.token_actual();
    if (token) {
        this.indice_token++;
    }
    return token;
};

/**
 * Verifica si el token actual coincide con el esperado.
 * @param {string} tipo_esperado - Tipo de token esperado.
 * @param {string} lexema_esperado - Lexema esperado (opcional).
 * @returns {boolean}
 */
AnalizadorSintactico.prototype.coincide = function(tipo_esperado, lexema_esperado) {
    const token = this.token_actual();
    if (!token) return false;
    if (token.tipo !== tipo_esperado) return false;
    if (lexema_esperado && token.lexema !== lexema_esperado) return false;
    return true;
};

/**
 * Consume un token y verifica que sea del tipo y lexema esperados.
 * @param {string} tipo_esperado - Tipo de token esperado.
 * @param {string} lexema_esperado - Lexema esperado (opcional).
 * @param {string} mensaje_error - Mensaje de error si no coincide.
 */
AnalizadorSintactico.prototype.emparejar = function(tipo_esperado, lexema_esperado, mensaje_error) {
    if (this.coincide(tipo_esperado, lexema_esperado)) {
        return this.consumir_token();
    } else {
        const token = this.token_actual();
        const lexema_real = token ? token.lexema : "EOF";
        this.registrar_error_sintactico(
            "Token inesperado",
            `${mensaje_error}. Se encontró: '${lexema_real}'`
        );
        // Intentamos recuperarnos avanzando
        this.consumir_token();
    }
};

// ============ REGLAS GRAMATICALES ============

/**
 * Procesa la sección TORNEO.
 */
AnalizadorSintactico.prototype.procesar_torneo = function() {
    this.emparejar("Palabra Reservada", "TORNEO", "Se esperaba 'TORNEO'");
    this.emparejar("Símbolo", "{", "Se esperaba '{' después de TORNEO");

    while (!this.coincide("Símbolo", "}")) {
        if (this.coincide("Palabra Reservada", "nombre")) {
            this.emparejar("Palabra Reservada", "nombre", "Se esperaba 'nombre'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de nombre");
            const token_cadena = this.emparejar("Cadena", null, "Se esperaba una cadena para el nombre del torneo");
            if (token_cadena) this.torneo.nombre = token_cadena.lexema;
        } else if (this.coincide("Palabra Reservada", "equipos")) {
            this.emparejar("Palabra Reservada", "equipos", "Se esperaba 'equipos'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de equipos");
            const token_numero = this.emparejar("Número", null, "Se esperaba un número para la cantidad de equipos");
            if (token_numero) this.torneo.equipos_cantidad = parseInt(token_numero.lexema);
        } else if (this.coincide("Palabra Reservada", "sede")) {
            this.emparejar("Palabra Reservada", "sede", "Se esperaba 'sede'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de sede");
            const token_cadena = this.emparejar("Cadena", null, "Se esperaba una cadena para la sede");
            if (token_cadena) this.torneo.sede = token_cadena.lexema;
        } else {
            this.registrar_error_sintactico("Atributo desconocido", "Atributo no reconocido en TORNEO");
            this.consumir_token(); // Saltamos el token problemático
        }
    }

    this.emparejar("Símbolo", "}", "Se esperaba '}' para cerrar TORNEO");
};

/**
 * Procesa la sección EQUIPOS.
 */
AnalizadorSintactico.prototype.procesar_equipos = function() {
    this.emparejar("Palabra Reservada", "EQUIPOS", "Se esperaba 'EQUIPOS'");
    this.emparejar("Símbolo", "{", "Se esperaba '{' después de EQUIPOS");

    while (!this.coincide("Símbolo", "}")) {
        if (this.coincide("Palabra Reservada", "equipo")) {
            this.procesar_equipo();
        } else {
            this.registrar_error_sintactico("Sección EQUIPOS", "Se esperaba definición de equipo");
            this.consumir_token();
        }
    }

    this.emparejar("Símbolo", "}", "Se esperaba '}' para cerrar EQUIPOS");
};

/**
 * Procesa un equipo individual.
 */
AnalizadorSintactico.prototype.procesar_equipo = function() {
    this.emparejar("Palabra Reservada", "equipo", "Se esperaba 'equipo'");
    this.emparejar("Símbolo", ":", "Se esperaba ':' después de equipo");
    const token_nombre = this.emparejar("Cadena", null, "Se esperaba el nombre del equipo");
    this.emparejar("Símbolo", "[", "Se esperaba '[' para abrir la lista de jugadores");

    const equipo = {
        nombre: token_nombre ? token_nombre.lexema : "Equipo Desconocido",
        jugadores: []
    };

    while (!this.coincide("Símbolo", "]")) {
        if (this.coincide("Palabra Reservada", "jugador")) {
            const jugador = this.procesar_jugador();
            equipo.jugadores.push(jugador);
        } else {
            this.registrar_error_sintactico("Definición de jugador", "Se esperaba 'jugador'");
            this.consumir_token();
        }
    }

    this.emparejar("Símbolo", "]", "Se esperaba ']' para cerrar la lista de jugadores");
    if (this.coincide("Símbolo", ",")) {
        this.consumir_token(); // Consumimos la coma si existe
    }

    this.torneo.equipos.push(equipo);
};

/**
 * Procesa un jugador individual.
 * @returns {Object} - Objeto jugador.
 */
AnalizadorSintactico.prototype.procesar_jugador = function() {
    this.emparejar("Palabra Reservada", "jugador", "Se esperaba 'jugador'");
    this.emparejar("Símbolo", ":", "Se esperaba ':' después de jugador");
    const token_nombre = this.emparejar("Cadena", null, "Se esperaba el nombre del jugador");
    this.emparejar("Símbolo", "[", "Se esperaba '[' para abrir los atributos del jugador");

    const jugador = {
        nombre: token_nombre ? token_nombre.lexema : "Jugador Desconocido",
        posicion: "",
        numero: 0,
        edad: 0
    };

    // Procesar atributos del jugador
    let primero = true;
    while (!this.coincide("Símbolo", "]")) {
        if (!primero) {
            this.emparejar("Símbolo", ",", "Se esperaba ',' entre atributos del jugador");
        }
        primero = false;

        if (this.coincide("Palabra Reservada", "posicion")) {
            this.emparejar("Palabra Reservada", "posicion", "Se esperaba 'posicion'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de posicion");
            const token_pos = this.emparejar("Palabra Reservada", null, "Se esperaba la posición (PORTERO, DELANTERO, etc.)");
            if (token_pos) jugador.posicion = token_pos.lexema;
        } else if (this.coincide("Palabra Reservada", "numero")) {
            this.emparejar("Palabra Reservada", "numero", "Se esperaba 'numero'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de numero");
            const token_num = this.emparejar("Número", null, "Se esperaba un número para el dorsal");
            if (token_num) jugador.numero = parseInt(token_num.lexema);
        } else if (this.coincide("Palabra Reservada", "edad")) {
            this.emparejar("Palabra Reservada", "edad", "Se esperaba 'edad'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de edad");
            const token_edad = this.emparejar("Número", null, "Se esperaba un número para la edad");
            if (token_edad) jugador.edad = parseInt(token_edad.lexema);
        } else {
            this.registrar_error_sintactico("Atributo de jugador", "Atributo no reconocido");
            this.consumir_token();
        }
    }

    this.emparejar("Símbolo", "]", "Se esperaba ']' para cerrar los atributos del jugador");

    return jugador;
};

/**
 * Procesa la sección ELIMINACION.
 */
AnalizadorSintactico.prototype.procesar_eliminacion = function() {
    this.emparejar("Palabra Reservada", "ELIMINACION", "Se esperaba 'ELIMINACION'");
    this.emparejar("Símbolo", "{", "Se esperaba '{' después de ELIMINACION");

    while (!this.coincide("Símbolo", "}")) {
        if (this.coincide("Palabra Reservada", "cuartos")) {
            this.procesar_fase("cuartos");
        } else if (this.coincide("Palabra Reservada", "semifinal")) {
            this.procesar_fase("semifinal");
        } else if (this.coincide("Palabra Reservada", "final")) {
            this.procesar_fase("final");
        } else {
            this.registrar_error_sintactico("Fase de eliminación", "Fase no reconocida");
            this.consumir_token();
        }
    }

    this.emparejar("Símbolo", "}", "Se esperaba '}' para cerrar ELIMINACION");
};

/**
 * Procesa una fase específica (cuartos, semifinal, final).
 * @param {string} nombre_fase - Nombre de la fase a procesar.
 */
AnalizadorSintactico.prototype.procesar_fase = function(nombre_fase) {
    this.emparejar("Palabra Reservada", nombre_fase, `Se esperaba '${nombre_fase}'`);
    this.emparejar("Símbolo", ":", "Se esperaba ':' después de la fase");
    this.emparejar("Símbolo", "[", "Se esperaba '[' para abrir la lista de partidos");

    while (!this.coincide("Símbolo", "]")) {
        if (this.coincide("Palabra Reservada", "partido")) {
            const partido = this.procesar_partido();
            this.torneo.fases[nombre_fase].push(partido);
        } else {
            this.registrar_error_sintactico("Definición de partido", "Se esperaba 'partido'");
            this.consumir_token();
        }
    }

    this.emparejar("Símbolo", "]", "Se esperaba ']' para cerrar la lista de partidos");
    if (this.coincide("Símbolo", ",")) {
        this.consumir_token(); // Consumimos la coma si existe
    }
};

/**
 * Procesa un partido individual.
 * @returns {Object} - Objeto partido.
 */
AnalizadorSintactico.prototype.procesar_partido = function() {
    this.emparejar("Palabra Reservada", "partido", "Se esperaba 'partido'");
    this.emparejar("Símbolo", ":", "Se esperaba ':' después de partido");
    const token_equipo1 = this.emparejar("Cadena", null, "Se esperaba el nombre del primer equipo");
    this.emparejar("Palabra Reservada", "vs", "Se esperaba 'vs'");
    const token_equipo2 = this.emparejar("Cadena", null, "Se esperaba el nombre del segundo equipo");
    this.emparejar("Símbolo", "[", "Se esperaba '[' para abrir los detalles del partido");

    const partido = {
        equipo1: token_equipo1 ? token_equipo1.lexema : "Desconocido",
        equipo2: token_equipo2 ? token_equipo2.lexema : "Desconocido",
        resultado: "Pendiente",
        goleadores: [],
        ganador: "TBD"
    };

    while (!this.coincide("Símbolo", "]")) {
        if (this.coincide("Palabra Reservada", "resultado")) {
            this.emparejar("Palabra Reservada", "resultado", "Se esperaba 'resultado'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de resultado");
            const token_resultado = this.emparejar("Cadena", null, "Se esperaba el resultado (ej. '3-1' o 'Pendiente')");
            if (token_resultado) {
                partido.resultado = token_resultado.lexema;
                // Determinar ganador si el resultado no es "Pendiente"
                if (partido.resultado !== "Pendiente" && partido.resultado.includes("-")) {
                    const partes = partido.resultado.split("-");
                    if (partes.length === 2) {
                        const goles1 = parseInt(partes[0]);
                        const goles2 = parseInt(partes[1]);
                        if (!isNaN(goles1) && !isNaN(goles2)) {
                            if (goles1 > goles2) {
                                partido.ganador = partido.equipo1;
                            } else if (goles2 > goles1) {
                                partido.ganador = partido.equipo2;
                            } else {
                                partido.ganador = "Empate"; // Aunque en eliminación no debería haber empates
                            }
                        }
                    }
                }
            }
        } else if (this.coincide("Palabra Reservada", "goleadores")) {
            this.emparejar("Palabra Reservada", "goleadores", "Se esperaba 'goleadores'");
            this.emparejar("Símbolo", ":", "Se esperaba ':' después de goleadores");
            this.emparejar("Símbolo", "[", "Se esperaba '[' para abrir la lista de goleadores");

            while (!this.coincide("Símbolo", "]")) {
                if (this.coincide("Palabra Reservada", "goleador")) {
                    const goleador = this.procesar_goleador();
                    partido.goleadores.push(goleador);
                } else {
                    this.registrar_error_sintactico("Definición de goleador", "Se esperaba 'goleador'");
                    this.consumir_token();
                }
            }

            this.emparejar("Símbolo", "]", "Se esperaba ']' para cerrar la lista de goleadores");
        } else {
            this.registrar_error_sintactico("Detalle de partido", "Atributo no reconocido en partido");
            this.consumir_token();
        }
    }

    this.emparejar("Símbolo", "]", "Se esperaba ']' para cerrar los detalles del partido");
    if (this.coincide("Símbolo", ",")) {
        this.consumir_token(); // Consumimos la coma si existe
    }

    return partido;
};

/**
 * Procesa un goleador individual.
 * @returns {Object} - Objeto goleador.
 */
AnalizadorSintactico.prototype.procesar_goleador = function() {
    this.emparejar("Palabra Reservada", "goleador", "Se esperaba 'goleador'");
    this.emparejar("Símbolo", ":", "Se esperaba ':' después de goleador");
    const token_nombre = this.emparejar("Cadena", null, "Se esperaba el nombre del goleador");
    this.emparejar("Símbolo", "[", "Se esperaba '[' para abrir los atributos del goleador");

    const goleador = {
        nombre: token_nombre ? token_nombre.lexema : "Desconocido",
        minuto: 0
    };

    if (this.coincide("Palabra Reservada", "minuto")) {
        this.emparejar("Palabra Reservada", "minuto", "Se esperaba 'minuto'");
        this.emparejar("Símbolo", ":", "Se esperaba ':' después de minuto");
        const token_minuto = this.emparejar("Número", null, "Se esperaba un número para el minuto del gol");
        if (token_minuto) goleador.minuto = parseInt(token_minuto.lexema);
    }

    this.emparejar("Símbolo", "]", "Se esperaba ']' para cerrar los atributos del goleador");

    return goleador;
};

// ============ GENERADORES DE REPORTES ============

/**
 * Genera el reporte de Bracket de Eliminación en HTML.
 * @returns {string} - HTML del reporte.
 */
AnalizadorSintactico.prototype.generar_reporte_bracket = function() {
    let html = '<h2>🏆 Reporte de Bracket de Eliminación</h2>';
    html += '<table>';
    html += '<thead><tr><th>Fase</th><th>Partido</th><th>Resultado</th><th>Ganador</th></tr></thead>';
    html += '<tbody>';

    const fases = ["cuartos", "semifinal", "final"];
    const nombres_fases = {
        cuartos: "Cuartos de Final",
        semifinal: "Semifinal",
        final: "Final"
    };

    for (let i = 0; i < fases.length; i++) {
        const fase = fases[i];
        const partidos = this.torneo.fases[fase];
        for (let j = 0; j < partidos.length; j++) {
            const partido = partidos[j];
            html += `<tr>
                <td>${nombres_fases[fase]}</td>
                <td>${partido.equipo1} vs ${partido.equipo2}</td>
                <td>${partido.resultado}</td>
                <td>${partido.ganador}</td>
            </tr>`;
        }
    }

    html += '</tbody></table>';
    return html;
};

/**
 * Genera el reporte de Estadísticas por Equipo en HTML.
 * @returns {string} - HTML del reporte.
 */
AnalizadorSintactico.prototype.generar_reporte_estadisticas_equipo = function() {
    // Primero, calculamos las estadísticas para cada equipo
    const estadisticas = {};

    // Inicializamos
    for (let i = 0; i < this.torneo.equipos.length; i++) {
        const equipo = this.torneo.equipos[i];
        estadisticas[equipo.nombre] = {
            nombre: equipo.nombre,
            partidos_jugados: 0,
            partidos_ganados: 0,
            partidos_perdidos: 0,
            goles_favor: 0,
            goles_contra: 0,
            fase_alcanzada: "Primera Ronda"
        };
    }

    // Recorremos todas las fases y partidos
    const fases = ["cuartos", "semifinal", "final"];
    const orden_fases = { "cuartos": 1, "semifinal": 2, "final": 3 };

    for (let i = 0; i < fases.length; i++) {
        const fase = fases[i];
        const partidos = this.torneo.fases[fase];
        for (let j = 0; j < partidos.length; j++) {
            const partido = partidos[j];
            if (partido.resultado !== "Pendiente" && partido.resultado.includes("-")) {
                const [goles1_str, goles2_str] = partido.resultado.split("-");
                const goles1 = parseInt(goles1_str);
                const goles2 = parseInt(goles2_str);

                if (!isNaN(goles1) && !isNaN(goles2)) {
                    // Actualizamos estadísticas para equipo1
                    if (estadisticas[partido.equipo1]) {
                        estadisticas[partido.equipo1].partidos_jugados++;
                        estadisticas[partido.equipo1].goles_favor += goles1;
                        estadisticas[partido.equipo1].goles_contra += goles2;

                        if (goles1 > goles2) {
                            estadisticas[partido.equipo1].partidos_ganados++;
                        } else {
                            estadisticas[partido.equipo1].partidos_perdidos++;
                        }

                        // Actualizamos la fase alcanzada
                        if (orden_fases[fase] > (estadisticas[partido.equipo1].fase_alcanzada === "Final" ? 3 : 
                                                estadisticas[partido.equipo1].fase_alcanzada === "Semifinal" ? 2 : 1)) {
                            estadisticas[partido.equipo1].fase_alcanzada = nombres_fases[fase];
                        }
                    }

                    // Actualizamos estadísticas para equipo2
                    if (estadisticas[partido.equipo2]) {
                        estadisticas[partido.equipo2].partidos_jugados++;
                        estadisticas[partido.equipo2].goles_favor += goles2;
                        estadisticas[partido.equipo2].goles_contra += goles1;

                        if (goles2 > goles1) {
                            estadisticas[partido.equipo2].partidos_ganados++;
                        } else {
                            estadisticas[partido.equipo2].partidos_perdidos++;
                        }

                        if (orden_fases[fase] > (estadisticas[partido.equipo2].fase_alcanzada === "Final" ? 3 : 
                                                estadisticas[partido.equipo2].fase_alcanzada === "Semifinal" ? 2 : 1)) {
                            estadisticas[partido.equipo2].fase_alcanzada = nombres_fases[fase];
                        }
                    }
                }
            }
        }
    }

    // Convertimos el objeto a array para ordenar
    const array_estadisticas = [];
    for (const key in estadisticas) {
        if (estadisticas.hasOwnProperty(key)) {
            array_estadisticas.push(estadisticas[key]);
        }
    }

    // Ordenamos por partidos ganados (descendente)
    array_estadisticas.sort((a, b) => b.partidos_ganados - a.partidos_ganados);

    // Generamos el HTML
    let html = '<h2>📊 Reporte de Estadísticas por Equipo</h2>';
    html += '<table>';
    html += '<thead><tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Diff</th><th>Fase</th></tr></thead>';
    html += '<tbody>';

    for (let i = 0; i < array_estadisticas.length; i++) {
        const eq = array_estadisticas[i];
        const diferencia = eq.goles_favor - eq.goles_contra;
        html += `<tr>
            <td>${eq.nombre}</td>
            <td>${eq.partidos_jugados}</td>
            <td>${eq.partidos_ganados}</td>
            <td>${eq.partidos_perdidos}</td>
            <td>${eq.goles_favor}</td>
            <td>${eq.goles_contra}</td>
            <td>${diferencia >= 0 ? '+' : ''}${diferencia}</td>
            <td>${eq.fase_alcanzada}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    return html;
};

/**
 * Genera el reporte de Goleadores en HTML.
 * @returns {string} - HTML del reporte.
 */
AnalizadorSintactico.prototype.generar_reporte_goleadores = function() {
    // Recolectamos todos los goles
    const goles = [];

    const fases = ["cuartos", "semifinal", "final"];
    for (let i = 0; i < fases.length; i++) {
        const partidos = this.torneo.fases[fases[i]];
        for (let j = 0; j < partidos.length; j++) {
            const partido = partidos[j];
            for (let k = 0; k < partido.goleadores.length; k++) {
                const gol = partido.goleadores[k];
                goles.push({
                    jugador: gol.nombre,
                    minuto: gol.minuto,
                    equipo: this.obtener_equipo_del_jugador(gol.nombre)
                });
            }
        }
    }

    // Agrupamos por jugador
    const mapa_goleadores = {};
    for (let i = 0; i < goles.length; i++) {
        const gol = goles[i];
        if (!mapa_goleadores[gol.jugador]) {
            mapa_goleadores[gol.jugador] = {
                nombre: gol.jugador,
                equipo: gol.equipo,
                goles: 0,
                minutos: []
            };
        }
        mapa_goleadores[gol.jugador].goles++;
        mapa_goleadores[gol.jugador].minutos.push(gol.minuto);
    }

    // Convertimos a array y ordenamos
    const array_goleadores = [];
    for (const key in mapa_goleadores) {
        if (mapa_goleadores.hasOwnProperty(key)) {
            array_goleadores.push(mapa_goleadores[key]);
        }
    }

    // Ordenamos por número de goles (descendente)
    array_goleadores.sort((a, b) => b.goles - a.goles);

    // Generamos el HTML
    let html = '<h2>⚽ Reporte de Goleadores</h2>';
    html += '<table>';
    html += '<thead><tr><th>Pos</th><th>Jugador</th><th>Equipo</th><th>Goles</th><th>Minutos</th></tr></thead>';
    html += '<tbody>';

    let posicion_anterior = 0;
    let goles_anterior = -1;
    let posicion_actual = 0;

    for (let i = 0; i < array_goleadores.length; i++) {
        const g = array_goleadores[i];
        posicion_actual++;

        // Manejo de empates en la tabla de posiciones
        if (g.goles === goles_anterior) {
            // Mismo número de goles que el anterior, misma posición
            posicion_actual = posicion_anterior;
        } else {
            // Nuevo número de goles, actualizamos la posición
            posicion_anterior = posicion_actual;
            goles_anterior = g.goles;
        }

        const minutos_str = g.minutos.join("', '") + "'";
        html += `<tr>
            <td>${posicion_actual}</td>
            <td>${g.nombre}</td>
            <td>${g.equipo}</td>
            <td>${g.goles}</td>
            <td>${minutos_str}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    return html;
};

/**
 * Obtiene el nombre del equipo al que pertenece un jugador.
 * @param {string} nombre_jugador - Nombre del jugador.
 * @returns {string} - Nombre del equipo o "Desconocido".
 */
AnalizadorSintactico.prototype.obtener_equipo_del_jugador = function(nombre_jugador) {
    for (let i = 0; i < this.torneo.equipos.length; i++) {
        const equipo = this.torneo.equipos[i];
        for (let j = 0; j < equipo.jugadores.length; j++) {
            if (equipo.jugadores[j].nombre === nombre_jugador) {
                return equipo.nombre;
            }
        }
    }
    return "Desconocido";
};

/**
 * Genera el reporte de Información General del Torneo en HTML.
 * @returns {string} - HTML del reporte.
 */
AnalizadorSintactico.prototype.generar_reporte_informacion_general = function() {
    // Calculamos estadísticas generales
    let total_partidos = 0;
    let partidos_completados = 0;
    let total_goles = 0;

    const fases = ["cuartos", "semifinal", "final"];
    for (let i = 0; i < fases.length; i++) {
        total_partidos += this.torneo.fases[fases[i]].length;
        for (let j = 0; j < this.torneo.fases[fases[i]].length; j++) {
            const partido = this.torneo.fases[fases[i]][j];
            if (partido.resultado !== "Pendiente" && partido.resultado.includes("-")) {
                partidos_completados++;
                const [g1, g2] = partido.resultado.split("-");
                total_goles += parseInt(g1) + parseInt(g2);
            }
        }
    }

    // Calculamos edad promedio de jugadores
    let suma_edades = 0;
    let total_jugadores = 0;
    for (let i = 0; i < this.torneo.equipos.length; i++) {
        for (let j = 0; j < this.torneo.equipos[i].jugadores.length; j++) {
            suma_edades += this.torneo.equipos[i].jugadores[j].edad;
            total_jugadores++;
        }
    }
    const edad_promedio = total_jugadores > 0 ? (suma_edades / total_jugadores).toFixed(2) : 0;

    // Determinamos la fase actual (la última fase con partidos pendientes, o la final si todo está completo)
    let fase_actual = "Finalizada";
    for (let i = 0; i < fases.length; i++) {
        const partidos = this.torneo.fases[fases[i]];
        for (let j = 0; j < partidos.length; j++) {
            if (partidos[j].resultado === "Pendiente") {
                fase_actual = fases[i] === "cuartos" ? "Cuartos de Final" : 
                              fases[i] === "semifinal" ? "Semifinal" : "Final";
                break;
            }
        }
        if (fase_actual !== "Finalizada") break;
    }

    // Generamos el HTML
    let html = '<h2>📋 Reporte de Información General del Torneo</h2>';
    html += '<table>';
    html += '<tbody>';

    const datos = [
        { etiqueta: "Nombre del Torneo", valor: this.torneo.nombre },
        { etiqueta: "Sede", valor: this.torneo.sede },
        { etiqueta: "Equipos Participantes", valor: this.torneo.equipos.length },
        { etiqueta: "Total de Partidos Programados", valor: total_partidos },
        { etiqueta: "Partidos Completados", valor: partidos_completados },
        { etiqueta: "Total de Goles", valor: total_goles },
        { etiqueta: "Promedio de Goles por Partido", valor: partidos_completados > 0 ? (total_goles / partidos_completados).toFixed(2) : "0.00" },
        { etiqueta: "Edad Promedio de Jugadores", valor: `${edad_promedio} años` },
        { etiqueta: "Fase Actual", valor: fase_actual }
    ];

    for (let i = 0; i < datos.length; i++) {
        html += `<tr>
            <td><strong>${datos[i].etiqueta}</strong></td>
            <td>${datos[i].valor}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    return html;
};

/**
 * Genera el código DOT para Graphviz.
 * @returns {string} - Código DOT.
 */
AnalizadorSintactico.prototype.generar_dot = function() {
    let dot = 'digraph Eliminatoria {\n';
    dot += '    rankdir=TB;\n';
    dot += '    node [shape=box, style=filled, color=lightblue2, fontname="Arial"];\n';
    dot += '    edge [fontname="Arial"];\n\n';

    // Etiqueta del torneo
    dot += `    label="🏆 ${this.torneo.nombre} - ${this.torneo.sede}";\n`;
    dot += '    labelloc="t";\n';
    dot += '    fontsize=20;\n\n';

    // Creamos nodos para los partidos
    let id_partido = 1;

    // Procesamos cuartos
    if (this.torneo.fases.cuartos.length > 0) {
        dot += '    // Cuartos de Final\n';
        for (let i = 0; i < this.torneo.fases.cuartos.length; i++) {
            const p = this.torneo.fases.cuartos[i];
            const id = `P${id_partido++}`;
            const resultado = p.resultado !== "Pendiente" ? `\\n(${p.resultado})` : "\\n(Pendiente)";
            const label = `${p.equipo1}\\nvs\\n${p.equipo2}${resultado}`;
            dot += `    ${id} [label="${label}"];\n`;
            p.id_dot = id; // Guardamos el ID para conectar después
        }
        dot += '\n';
    }

    // Procesamos semifinales
    if (this.torneo.fases.semifinal.length > 0) {
        dot += '    // Semifinales\n';
        for (let i = 0; i < this.torneo.fases.semifinal.length; i++) {
            const p = this.torneo.fases.semifinal[i];
            const id = `P${id_partido++}`;
            const resultado = p.resultado !== "Pendiente" ? `\\n(${p.resultado})` : "\\n(Pendiente)";
            const label = `${p.equipo1}\\nvs\\n${p.equipo2}${resultado}`;
            dot += `    ${id} [label="${label}"];\n`;
            p.id_dot = id;
        }
        dot += '\n';
    }

    // Procesamos final
    if (this.torneo.fases.final.length > 0) {
        dot += '    // Final\n';
        for (let i = 0; i < this.torneo.fases.final.length; i++) {
            const p = this.torneo.fases.final[i];
            const id = `P${id_partido++}`;
            const resultado = p.resultado !== "Pendiente" ? `\\n(${p.resultado})` : "\\n(Pendiente)";
            const label = `${p.equipo1}\\nvs\\n${p.equipo2}${resultado}`;
            dot += `    ${id} [label="${label}"];\n`;
            p.id_dot = id;
        }
        dot += '\n';
    }

    // Conectamos los partidos (semifinalistas vienen de cuartos, finalista de semifinal)
    // Esto es una simplificación. En un torneo real, debes saber qué ganador va a qué partido.
    // Para este ejemplo, asumimos un orden fijo.

    // Conectamos cuartos -> semifinales
    if (this.torneo.fases.cuartos.length >= 2 && this.torneo.fases.semifinal.length > 0) {
        dot += '    // Conexiones: Cuartos -> Semifinales\n';
        // Suponemos: Ganador P1 y P2 van a Semifinal 1, P3 y P4 van a Semifinal 2
        if (this.torneo.fases.cuartos[0] && this.torneo.fases.semifinal[0]) {
            dot += `    ${this.torneo.fases.cuartos[0].id_dot} -> ${this.torneo.fases.semifinal[0].id_dot};\n`;
        }
        if (this.torneo.fases.cuartos[1] && this.torneo.fases.semifinal[0]) {
            dot += `    ${this.torneo.fases.cuartos[1].id_dot} -> ${this.torneo.fases.semifinal[0].id_dot};\n`;
        }
        if (this.torneo.fases.semifinal.length > 1) {
            if (this.torneo.fases.cuartos[2] && this.torneo.fases.semifinal[1]) {
                dot += `    ${this.torneo.fases.cuartos[2].id_dot} -> ${this.torneo.fases.semifinal[1].id_dot};\n`;
            }
            if (this.torneo.fases.cuartos[3] && this.torneo.fases.semifinal[1]) {
                dot += `    ${this.torneo.fases.cuartos[3].id_dot} -> ${this.torneo.fases.semifinal[1].id_dot};\n`;
            }
        }
        dot += '\n';
    }

    // Conectamos semifinales -> final
    if (this.torneo.fases.semifinal.length >= 1 && this.torneo.fases.final.length > 0) {
        dot += '    // Conexiones: Semifinales -> Final\n';
        if (this.torneo.fases.semifinal[0] && this.torneo.fases.final[0]) {
            dot += `    ${this.torneo.fases.semifinal[0].id_dot} -> ${this.torneo.fases.final[0].id_dot};\n`;
        }
        if (this.torneo.fases.semifinal.length > 1 && this.torneo.fases.final[0]) {
            dot += `    ${this.torneo.fases.semifinal[1].id_dot} -> ${this.torneo.fases.final[0].id_dot};\n`;
        }
    }

    dot += '\n    // Estilo para partidos completados\n';
    for (let i = 0; i < fases.length; i++) {
        const partidos = this.torneo.fases[fases[i]];
        for (let j = 0; j < partidos.length; j++) {
            const p = partidos[j];
            if (p.resultado !== "Pendiente" && p.id_dot) {
                dot += `    ${p.id_dot} [fillcolor=lightgreen];\n`;
            }
        }
    }

    dot += '}\n';
    return dot;
};

/**
 * Devuelve el objeto torneo construido.
 * @returns {Object}
 */
AnalizadorSintactico.prototype.obtener_torneo = function() {
    return this.torneo;
};

/**
 * Devuelve la lista de errores sintácticos.
 * @returns {Array}
 */
AnalizadorSintactico.prototype.obtener_errores = function() {
    return this.errores_sintacticos;
};