// ============ CLASE TOKEN ============
class Token {
    constructor(tipo, valor, fila, columna) {
        this.tipo = tipo;
        this.valor = valor;
        this.fila = fila;
        this.columna = columna;
    }
}

// ============ CLASE LEXER (ANALIZADOR LÉXICO) MEJORADO ============
class Lexer {
    constructor(texto) {
        this.texto = texto;
        this.pos = 0;
        this.linea = 1;
        this.columna = 1;
        this.tokens = [];
        this.errores = [];

        // Pilas para verificar balance de símbolos
        this.pilaLlaves = [];
        this.pilaCorchetes = [];
        this.pilaComillas = [];
    }

    // Obtiene el carácter actual
    caracterActual() {
        if (this.pos >= this.texto.length) {
            return null;
        }
        return this.texto[this.pos];
    }

    // Avanza al siguiente carácter
    avanzar() {
        if (this.pos < this.texto.length) {
            let char = this.texto[this.pos];
            this.pos++;
            if (char === '\n') {
                this.linea++;
                this.columna = 1;
            } else {
                this.columna++;
            }
        }
    }

    // Verifica si un carácter es una letra (incluye vocales acentuadas y ñ)
    esLetra(char) {
        return (char >= 'a' && char <= 'z') || 
               (char >= 'A' && char <= 'Z') || 
               char === 'ñ' || char === 'Ñ' || 
               char === 'á' || char === 'é' || char === 'í' || char === 'ó' || char === 'ú' ||
               char === 'Á' || char === 'É' || char === 'Í' || char === 'Ó' || char === 'Ú';
    }

    // Verifica si un carácter es un dígito
    esDigito(char) {
        return char >= '0' && char <= '9';
    }

    // Registra un error léxico
    registrarError(tipoError, lexema, descripcion, linea, columna) {
        this.errores.push({
            numero: this.errores.length + 1,
            lexema: lexema,
            tipoError: tipoError,
            descripcion: descripcion,
            linea: linea,
            columna: columna
        });
    }

    // Analiza un identificador o palabra reservada
    analizarIdentificador(inicioLinea, inicioColumna) {
        let valor = "";
        let contieneDigito = false;

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            if (this.esLetra(char) || this.esDigito(char) || char === '_') {
                if (this.esDigito(char)) {
                    contieneDigito = true;
                }
                valor += char;
                this.avanzar();
            } else {
                break;
            }
        }

        // Si contiene algún dígito, es un error léxico
        if (contieneDigito) {
            this.registrarError(
                "TOKEN_INVALIDO",
                valor,
                "Identificador contiene dígitos, no permitido",
                inicioLinea,
                inicioColumna
            );
            return;
        }

        // Si no tiene dígitos, verificamos si es palabra reservada
        let tipo = "IDENTIFICADOR";
        if (valor === "TORNEO") tipo = "PALABRA_RESERVADA";
        else if (valor === "EQUIPOS") tipo = "PALABRA_RESERVADA";
        else if (valor === "ELIMINACION") tipo = "PALABRA_RESERVADA";
        else if (valor === "equipo") tipo = "PALABRA_RESERVADA";
        else if (valor === "jugador") tipo = "PALABRA_RESERVADA";
        else if (valor === "partido") tipo = "PALABRA_RESERVADA";
        else if (valor === "goleador") tipo = "PALABRA_RESERVADA";
        else if (valor === "nombre") tipo = "ATRIBUTO";
        else if (valor === "equipos") tipo = "ATRIBUTO";
        else if (valor === "sede") tipo = "ATRIBUTO";
        else if (valor === "posicion") tipo = "ATRIBUTO";
        else if (valor === "numero") tipo = "ATRIBUTO";
        else if (valor === "edad") tipo = "ATRIBUTO";
        else if (valor === "resultado") tipo = "ATRIBUTO";
        else if (valor === "goleadores") tipo = "ATRIBUTO";
        else if (valor === "minuto") tipo = "ATRIBUTO";
        else if (valor === "vs") tipo = "VS";
        else if (valor === "PORTERO" || valor === "DEFENSA" || valor === "MEDIOCAMPO" || valor === "DELANTERO") {
            tipo = "POSICION";
        }

        this.tokens.push(new Token(tipo, valor, inicioLinea, inicioColumna));
    }

    // Analiza una cadena entre comillas dobles
    analizarCadena(inicioLinea, inicioColumna) {
        // Registrar apertura de comilla
        this.pilaComillas.push({ linea: inicioLinea, columna: inicioColumna });

        this.avanzar(); // Saltar comilla de apertura
        let valor = "";

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            if (char === '"') {
                this.avanzar(); // Saltar comilla de cierre
                // Desapilar la comilla abierta
                this.pilaComillas.pop();
                this.tokens.push(new Token("CADENA", valor, inicioLinea, inicioColumna));
                return;
            } else if (char === '\n') {
                // Error: cadena no cerrada antes de salto de línea
                const infoApertura = this.pilaComillas.length > 0 ? this.pilaComillas[this.pilaComillas.length - 1] : { linea: inicioLinea, columna: inicioColumna };
                this.registrarError(
                    "FALTA_SIMBOLO_ESPERADO",
                    valor,
                    "Cadena no cerrada antes de salto de línea",
                    infoApertura.linea,
                    infoApertura.columna
                );
                // Desapilar para limpiar
                if (this.pilaComillas.length > 0) {
                    this.pilaComillas.pop();
                }
                return;
            } else {
                valor += char;
                this.avanzar();
            }
        }

        // Si llegamos aquí, la cadena no se cerró
        const infoApertura = this.pilaComillas.length > 0 ? this.pilaComillas[this.pilaComillas.length - 1] : { linea: inicioLinea, columna: inicioColumna };
        this.registrarError(
            "FALTA_SIMBOLO_ESPERADO",
            valor,
            "Cadena no cerrada",
            infoApertura.linea,
            infoApertura.columna
        );
        // Desapilar para limpiar
        if (this.pilaComillas.length > 0) {
            this.pilaComillas.pop();
        }
    }

    // Analiza un número entero
    analizarNumero(inicioLinea, inicioColumna) {
        let valor = "";

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            if (this.esDigito(char)) {
                valor += char;
                this.avanzar();
            } else {
                break;
            }
        }

        this.tokens.push(new Token("NUMERO", valor, inicioLinea, inicioColumna));
    }

    // Analiza un símbolo individual y lo agrega como token
    analizarSimbolo(inicioLinea, inicioColumna) {
        let char = this.caracterActual();
        let tipo = "";
        let valor = char;

        switch (char) {
            case '{':
                tipo = "LLAVE_IZQ";
                this.pilaLlaves.push({ linea: inicioLinea, columna: inicioColumna });
                break;
            case '}':
                tipo = "LLAVE_DER";
                if (this.pilaLlaves.length === 0) {
                    this.registrarError(
                        "FALTA_SIMBOLO_ESPERADO",
                        valor,
                        "Llave de apertura '{' faltante",
                        inicioLinea,
                        inicioColumna
                    );
                } else {
                    this.pilaLlaves.pop();
                }
                break;
            case '[':
                tipo = "CORCHETE_IZQ";
                this.pilaCorchetes.push({ linea: inicioLinea, columna: inicioColumna });
                break;
            case ']':
                tipo = "CORCHETE_DER";
                if (this.pilaCorchetes.length === 0) {
                    this.registrarError(
                        "FALTA_SIMBOLO_ESPERADO",
                        valor,
                        "Corchete de apertura '[' faltante",
                        inicioLinea,
                        inicioColumna
                    );
                } else {
                    this.pilaCorchetes.pop();
                }
                break;
            case ':':
                tipo = "DOS_PUNTOS";
                break;
            case '-':
                tipo = "GUION";
                break;
            case ',':
                tipo = "COMA";
                break;
            default:
                tipo = "SIMBOLO_DESCONOCIDO";
        }

        this.tokens.push(new Token(tipo, valor, inicioLinea, inicioColumna));
        this.avanzar();
    }

    // ============ FUNCIÓN PRINCIPAL DE ANÁLISIS ============
    analizar() {
        // Reiniciar pilas y listas
        this.pilaLlaves = [];
        this.pilaCorchetes = [];
        this.pilaComillas = [];
        this.tokens = [];
        this.errores = [];

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            let inicioLinea = this.linea;
            let inicioColumna = this.columna;

            if (char === ' ' || char === '\t') {
                this.avanzar();
                continue;
            } else if (char === '\n') {
                this.avanzar();
                continue;
            } else if (char === '\r') {
                this.avanzar();
                if (this.caracterActual() === '\n') {
                    this.avanzar();
                }
                continue;
            } else if (this.esLetra(char)) {
                this.analizarIdentificador(inicioLinea, inicioColumna);
            } else if (this.esDigito(char)) {
                this.analizarNumero(inicioLinea, inicioColumna);
            } else if (char === '"') {
                this.analizarCadena(inicioLinea, inicioColumna);
            } else if (char === '{' || char === '}' || char === '[' || char === ']' || char === ':' || char === '-' || char === ',') {
                this.analizarSimbolo(inicioLinea, inicioColumna);
            } else {
                // Carácter no reconocido
                this.registrarError(
                    "TOKEN_INVALIDO",
                    char,
                    "Carácter no permitido en el lenguaje",
                    inicioLinea,
                    inicioColumna
                );
                this.avanzar();
            }
        }

        // --- Verificar Símbolos Sin Cerrar al Final del Análisis ---

        // Llaves sin cerrar
        while (this.pilaLlaves.length > 0) {
            const info = this.pilaLlaves.pop();
            this.registrarError(
                "FALTA_SIMBOLO_ESPERADO",
                "{",
                "Llave de cierre '}' faltante",
                info.linea,
                info.columna
            );
        }

        // Corchetes sin cerrar
        while (this.pilaCorchetes.length > 0) {
            const info = this.pilaCorchetes.pop();
            this.registrarError(
                "FALTA_SIMBOLO_ESPERADO",
                "[",
                "Corchete de cierre ']' faltante",
                info.linea,
                info.columna
            );
        }

        // Comillas sin cerrar
        while (this.pilaComillas.length > 0) {
            const info = this.pilaComillas.pop();
            this.registrarError(
                "FALTA_SIMBOLO_ESPERADO",
                '"',
                "Comilla de cierre '\"' faltante",
                info.linea,
                info.columna
            );
        }

        return {
            tokens: this.tokens,
            errores: this.errores
        };
    }
}

// ============ CLASE PARA GENERAR REPORTES ============
class GeneradorReportes {
    constructor(tokens) {
        this.tokens = tokens;
        this.lista = tokens.map((token, index) => ({
            ...token,
            numero: index + 1
        }));
    }

    // Escapa caracteres HTML para prevenir XSS (básico)
    escapeHTML(texto) {
        if (typeof texto !== 'string') return texto;
        return texto
            .replace(/&/g, "&amp;")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Genera el Reporte de Información General del Torneo
    generarReporteGeneral() {
        let nombreTorneo = "Desconocido";
        let sede = "No definida";
        let equipos = new Set();
        let totalPartidos = 0;
        let completados = 0;
        let totalGoles = 0;
        let edades = [];

        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];

            // Detectar nombre del torneo
            if (t.valor === "nombre" && this.lista[i+2]?.tipo === "CADENA") {
                nombreTorneo = this.lista[i+2].valor;
            }

            // Detectar sede
            if (t.valor === "sede" && this.lista[i+2]?.tipo === "CADENA") {
                sede = this.lista[i+2].valor;
            }

            // Detectar equipos
            if (t.valor === "equipo" && this.lista[i+2]?.tipo === "CADENA") {
                equipos.add(this.lista[i+2].valor);
            }

            // Detectar jugadores (para edad promedio)
            if (t.valor === "edad" && this.lista[i+2]?.tipo === "NUMERO") {
                edades.push(parseInt(this.lista[i+2].valor));
            }

            // Detectar partidos
            if (t.valor === "partido") {
                totalPartidos++;
            }

            // Detectar resultados de partidos
            if (t.valor === "resultado" && this.lista[i+2]?.tipo === "CADENA") {
                const res = this.lista[i+2].valor; // Ej: "4-2"
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
        html += `<tr><td>Nombre del Torneo</td><td>${this.escapeHTML(nombreTorneo)}</td></tr>`;
        html += `<tr><td>Sede</td><td>${this.escapeHTML(sede)}</td></tr>`;
        html += `<tr><td>Equipos Participantes</td><td>${equipos.size}</td></tr>`;
        html += `<tr><td>Total de Partidos Programados</td><td>${totalPartidos}</td></tr>`;
        html += `<tr><td>Partidos Completados</td><td>${completados}</td></tr>`;
        html += `<tr><td>Total de Goles</td><td>${totalGoles}</td></tr>`;
        html += `<tr><td>Promedio de Goles por Partido</td><td>${promedioGoles}</td></tr>`;
        html += `<tr><td>Edad Promedio de Jugadores</td><td>${edadPromedio} años</td></tr>`;
        html += "</table>";

        return html;
    }

    // Genera el Reporte de Estadísticas por Equipo
    generarReporteEquipos() {
        let equipos = {};

        // Inicializar equipos cuando aparecen
        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];
            if (t.valor === "equipo" && this.lista[i+2]?.tipo === "CADENA") {
                const nombreEquipo = this.lista[i+2].valor;
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
        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];

            if (t.valor === "partido") {
                const equipo1 = this.lista[i+2]?.valor;
                const vs = this.lista[i+3]?.valor; // debería ser "vs"
                const equipo2 = this.lista[i+4]?.valor;

                let resultado = null;
                let fase = "Desconocida";

                // Buscar resultado y fase cerca de este partido
                for (let j = i; j < this.lista.length; j++) {
                    if (this.lista[j].valor === "resultado" && this.lista[j+2]?.tipo === "CADENA") {
                        resultado = this.lista[j+2].valor;
                        break;
                    }
                }

                // Retroceder para detectar fase (final, semifinal, cuartos)
                for (let j = i; j >= 0; j--) {
                    if (["final", "semifinal", "cuartos"].includes(this.lista[j].valor)) {
                        fase = this.lista[j].valor;
                        break;
                    }
                }

                if (resultado && equipos[equipo1] && equipos[equipo2]) {
                    const [g1, g2] = resultado.split("-").map(x => parseInt(x));

                    // Solo procesar si el resultado es numérico válido
                    if (!isNaN(g1) && !isNaN(g2)) {
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
                        } else if (g1 === g2 && g1 !== 0) {
                            // Empate (aunque en eliminación no debería haber, lo manejamos)
                            equipos[equipo1].fase = fase;
                            equipos[equipo2].fase = fase;
                        }
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
                <td>${this.escapeHTML(e.nombre)}</td>
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

    // Genera el Reporte de Goleadores
    generarReporteGoleadores() {
        // Mapear jugador -> equipo
        const jugadorEquipo = {};
        let equipoActual = null;

        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];

            // Detectamos cambio de equipo
            if (t.valor === "equipo" && this.lista[i+2]?.tipo === "CADENA") {
                equipoActual = this.lista[i+2].valor;
            }

            // Detectamos jugador y lo asignamos al equipo actual
            if (t.valor === "jugador" && this.lista[i+2]?.tipo === "CADENA") {
                const nombreJugador = this.lista[i+2].valor;
                if (equipoActual) {
                    jugadorEquipo[nombreJugador] = equipoActual;
                } else {
                    jugadorEquipo[nombreJugador] = jugadorEquipo[nombreJugador] || "No definido";
                }
            }
        }

        // Contabilizar goles y minutos por jugador
        const mapaGoleadores = {};

        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];

            // Cuando encontramos un "goleador"
            if (t.valor === "goleador" && this.lista[i+2]?.tipo === "CADENA") {
                const nombre = this.lista[i+2].valor;

                // Buscar el "minuto" más cercano hacia adelante
                let minutoEncontrado = null;
                for (let j = i; j < this.lista.length; j++) {
                    if (this.lista[j].valor === "minuto" && this.lista[j+2]?.tipo === "NUMERO") {
                        minutoEncontrado = this.lista[j+2].valor;
                        break;
                    }
                    if (j !== i && this.lista[j].valor === "goleador") break;
                }

                if (!mapaGoleadores[nombre]) {
                    mapaGoleadores[nombre] = { 
                        goles: 0, 
                        minutos: [], 
                        equipo: jugadorEquipo[nombre] || "No definido" 
                    };
                }
                mapaGoleadores[nombre].goles++;
                if (minutoEncontrado !== null) {
                    mapaGoleadores[nombre].minutos.push(minutoEncontrado.toString());
                }
            }
        }

        // Convertir a array y ordenar
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

        // Generar HTML
        let html = "<h3>🥇 Reporte de Goleadores</h3>";
        html += "<table>";
        html += "<thead><tr><th>Pos.</th><th>Jugador</th><th>Equipo</th><th>Goles</th><th>Minutos</th></tr></thead><tbody>";

        for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            const minutosTexto = p.minutos.length > 0 ? p.minutos.join(", ") + "'" : "-";
            html += `<tr>
                <td>${i+1}</td>
                <td>${this.escapeHTML(p.nombre)}</td>
                <td>${this.escapeHTML(p.equipo)}</td>
                <td>${p.goles}</td>
                <td>${minutosTexto}</td>
            </tr>`;
        }

        html += "</tbody></table>";

        if (arr.length === 0) {
            html = "<h3>🥇 Reporte de Goleadores</h3><p>No se detectaron goles en la entrada.</p>";
        }

        return html;
    }

    // Genera el Reporte de Bracket de Eliminación
    generarReporteBracket() {
        let partidos = [];

        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];

            if (t.valor === "partido") {
                const equipo1 = this.lista[i+2]?.valor;
                const equipo2 = this.lista[i+4]?.valor;

                let resultado = "Pendiente";
                let ganador = "-";
                let fase = "Desconocida";

                // Buscar resultado
                for (let j = i; j < this.lista.length; j++) {
                    if (this.lista[j].valor === "resultado" && this.lista[j+2]?.tipo === "CADENA") {
                        resultado = this.lista[j+2].valor;
                        break;
                    }
                }

                // Determinar ganador si el resultado es numérico
                if (resultado !== "Pendiente") {
                    const goles = resultado.split("-").map(x => parseInt(x));
                    if (goles.length === 2 && !isNaN(goles[0]) && !isNaN(goles[1])) {
                        if (goles[0] > goles[1]) {
                            ganador = equipo1;
                        } else if (goles[1] > goles[0]) {
                            ganador = equipo2;
                        } else {
                            ganador = "Empate";
                        }
                    }
                }

                // Buscar fase
                for (let j = i; j >= 0; j--) {
                    if (["final", "semifinal", "cuartos"].includes(this.lista[j].valor)) {
                        fase = this.lista[j].valor;
                        break;
                    }
                }

                partidos.push({
                    fase: fase,
                    partido: `${equipo1} vs ${equipo2}`,
                    resultado: resultado,
                    ganador: ganador
                });
            }
        }

        // Generar tabla HTML
        let html = "<h3>🏆 Bracket de Eliminación</h3>";
        html += "<table>";
        html += "<thead><tr><th>Fase</th><th>Partido</th><th>Resultado</th><th>Ganador</th></tr></thead><tbody>";

        for (let partido of partidos) {
            html += `<tr>
                <td>${partido.fase}</td>
                <td>${this.escapeHTML(partido.partido)}</td>
                <td>${partido.resultado}</td>
                <td>${this.escapeHTML(partido.ganador)}</td>
            </tr>`;
        }

        html += "</tbody></table>";

        if (partidos.length === 0) {
            html = "<h3>🏆 Bracket de Eliminación</h3><p>No se detectaron partidos en la entrada.</p>";
        }

        return html;
    }

    // Genera el código DOT para Graphviz
    generarCodigoDOT() {
        let dot = 'digraph Tournament {\n';
        dot += '    rankdir=TB;\n';
        dot += '    node [shape=box, style=filled, fillcolor=lightblue, fontname="Arial"];\n';
        dot += '    edge [fontname="Arial"];\n\n';

        let partidos = [];
        let idCounter = 1;

        // Recolectar todos los partidos con sus resultados y fases
        for (let i = 0; i < this.lista.length; i++) {
            const t = this.lista[i];

            if (t.valor === "partido") {
                const equipo1 = this.lista[i+2]?.valor;
                const equipo2 = this.lista[i+4]?.valor;

                let resultado = "Pendiente";
                let ganador = null;
                let fase = "Desconocida";

                // Buscar resultado
                for (let j = i; j < this.lista.length; j++) {
                    if (this.lista[j].valor === "resultado" && this.lista[j+2]?.tipo === "CADENA") {
                        resultado = this.lista[j+2].valor;
                        break;
                    }
                }

                // Determinar ganador si el resultado es numérico
                if (resultado !== "Pendiente") {
                    const goles = resultado.split("-").map(x => parseInt(x));
                    if (goles.length === 2 && !isNaN(goles[0]) && !isNaN(goles[1])) {
                        if (goles[0] > goles[1]) {
                            ganador = equipo1;
                        } else if (goles[1] > goles[0]) {
                            ganador = equipo2;
                        }
                    }
                }

                // Buscar fase
                for (let j = i; j >= 0; j--) {
                    if (["final", "semifinal", "cuartos"].includes(this.lista[j].valor)) {
                        fase = this.lista[j].valor;
                        break;
                    }
                }

                partidos.push({
                    id: `partido${idCounter++}`,
                    equipo1: equipo1,
                    equipo2: equipo2,
                    resultado: resultado,
                    ganador: ganador,
                    fase: fase
                });
            }
        }

        // Crear nodos para cada partido
        for (let partido of partidos) {
            let label = `${partido.equipo1}\\nvs\\n${partido.equipo2}\\n(${partido.resultado})`;
            dot += `    ${partido.id} [label="${label}"];\n`;
        }

        // Crear relaciones (partidos que alimentan a otros)
        // Para este ejemplo básico, asumimos que los partidos están en orden y los primeros alimentan a los siguientes
        // En un sistema más robusto, deberías mapear qué ganadores van a qué partidos siguientes
        if (partidos.length > 1) {
            // Agrupar por fase
            let fases = {
                cuartos: [],
                semifinal: [],
                final: []
            };

            for (let partido of partidos) {
                if (fases[partido.fase]) {
                    fases[partido.fase].push(partido);
                }
            }

            // Conectar cuartos -> semifinales
            if (fases.cuartos.length > 0 && fases.semifinal.length > 0) {
                for (let i = 0; i < fases.semifinal.length; i++) {
                    if (fases.cuartos[i*2]) {
                        dot += `    ${fases.cuartos[i*2].id} -> ${fases.semifinal[i].id};\n`;
                    }
                    if (fases.cuartos[i*2 + 1]) {
                        dot += `    ${fases.cuartos[i*2 + 1].id} -> ${fases.semifinal[i].id};\n`;
                    }
                }
            }

            // Conectar semifinales -> final
            if (fases.semifinal.length > 0 && fases.final.length > 0) {
                for (let i = 0; i < fases.final.length; i++) {
                    if (fases.semifinal[i*2]) {
                        dot += `    ${fases.semifinal[i*2].id} -> ${fases.final[i].id};\n`;
                    }
                    if (fases.semifinal[i*2 + 1]) {
                        dot += `    ${fases.semifinal[i*2 + 1].id} -> ${fases.final[i].id};\n`;
                    }
                }
            }
        }

        dot += '\n    label="Bracket del Torneo";\n';
        dot += '    fontsize=20;\n';
        dot += '}';

        return dot;
    }
}

// ============ FUNCIONES DE LA INTERFAZ DE USUARIO ============

// Función para limpiar los resultados
function limpiarResultados() {
    document.getElementById('contenedor-tokens').innerHTML = '<p>Analiza un torneo para ver los tokens aquí.</p>';
    document.getElementById('contenedor-errores').innerHTML = '<p>Si hay errores, se mostrarán aquí.</p>';
    document.getElementById('contenedor-reportes').innerHTML = '<p>Los reportes se generarán aquí después del análisis.</p>';
    document.getElementById('salida-graphviz').value = '';
    document.getElementById('btn-exportar').disabled = true;
}

// Función para mostrar tokens en la interfaz
function mostrarTokens(tokens) {
    if (tokens.length === 0) {
        document.getElementById('contenedor-tokens').innerHTML = '<p class="mensaje-error">No se generaron tokens.</p>';
        return;
    }

    let html = '<div class="mensaje-exito">✅ ¡Análisis léxico completado con éxito!</div>';
    html += '<table>';
    html += '<thead><tr><th>No.</th><th>Lexema</th><th>Tipo</th><th>Línea</th><th>Columna</th></tr></thead>';
    html += '<tbody>';

    tokens.forEach((token, index) => {
        html += `<tr>
            <td><strong>${index + 1}</strong></td>
            <td>${escapeHTML(token.valor)}</td>
            <td>${token.tipo}</td>
            <td>${token.fila}</td>
            <td>${token.columna}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('contenedor-tokens').innerHTML = html;
}

// Función para mostrar errores en la interfaz
function mostrarErrores(errores) {
    if (errores.length === 0) {
        document.getElementById('contenedor-errores').innerHTML = '<p class="mensaje-exito">¡No se encontraron errores léxicos!</p>';
        return;
    }

    let html = '<div class="mensaje-error">❌ ¡Se encontraron errores léxicos!</div>';
    html += '<table>';
    html += '<thead><tr><th>No.</th><th>Lexema</th><th>Tipo de Error</th><th>Descripción</th><th>Línea</th><th>Columna</th></tr></thead>';
    html += '<tbody>';

    errores.forEach(error => {
        html += `<tr>
            <td><strong>${error.numero}</strong></td>
            <td>${escapeHTML(error.lexema)}</td>
            <td>${error.tipoError}</td>
            <td>${error.descripcion}</td>
            <td>${error.linea}</td>
            <td>${error.columna}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('contenedor-errores').innerHTML = html;
}

// Función para mostrar todos los reportes
function mostrarReportes(tokens) {
    const generador = new GeneradorReportes(tokens);
    
    let html = generador.generarReporteGeneral();
    html += generador.generarReporteEquipos();
    html += generador.generarReporteGoleadores();
    html += generador.generarReporteBracket();
    
    document.getElementById('contenedor-reportes').innerHTML = html;
    
    // Generar y mostrar código DOT
    const codigoDOT = generador.generarCodigoDOT();
    document.getElementById('salida-graphviz').value = codigoDOT;
}

// Función para cambiar de pestaña
function cambiarPestana(pestanaId) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.contenido-pestanas > div').forEach(div => {
        div.classList.remove('pestana-mostrada');
        div.classList.add('pestana-oculta');
    });

    // Quitar la clase 'activa' de todos los botones
    document.querySelectorAll('.pestanas button').forEach(btn => {
        btn.classList.remove('pestana-activa');
    });

    // Mostrar la pestaña seleccionada y activar su botón
    document.getElementById(pestanaId).classList.remove('pestana-oculta');
    document.getElementById(pestanaId).classList.add('pestana-mostrada');
    document.querySelector(`.pestanas button[data-pestana="${pestanaId}"]`).classList.add('pestana-activa');
}

// Función auxiliar para escapar HTML
function escapeHTML(texto) {
    if (typeof texto !== 'string') return texto;
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Función para exportar reporte
function exportarReporte() {
    const tokens = window.tokensGlobales || [];
    if (tokens.length === 0) {
        alert("No hay reporte para exportar.");
        return;
    }

    const generador = new GeneradorReportes(tokens);
    let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte TourneyJS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
    </style>
</head>
<body>
    <h1>📊 Reporte Completo TourneyJS</h1>
    ${generador.generarReporteGeneral()}
    ${generador.generarReporteEquipos()}
    ${generador.generarReporteGoleadores()}
    ${generador.generarReporteBracket()}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_tourneyjs.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============ EVENTOS ============

// Evento para el botón "Analizar Torneo"
document.getElementById('btn-analizar').addEventListener('click', function() {
    const textoEntrada = document.getElementById('entrada-texto').value;
    
    if (!textoEntrada.trim()) {
        alert("⚠️ Por favor, ingresa la definición del torneo antes de analizar.");
        return;
    }

    // Limpiar resultados anteriores
    limpiarResultados();

    // Crear instancia del analizador léxico
    const lexer = new Lexer(textoEntrada);
    const resultado = lexer.analizar();

    // Guardar tokens globalmente para exportar
    window.tokensGlobales = resultado.tokens;

    // Mostrar tokens o errores
    if (resultado.errores.length > 0) {
        mostrarErrores(resultado.errores);
        cambiarPestana('errores');
    } else {
        mostrarTokens(resultado.tokens);
        mostrarReportes(resultado.tokens);
        document.getElementById('btn-exportar').disabled = false;
        cambiarPestana('tokens');
    }

    // Scroll hasta los resultados
    document.querySelector('.panel-resultados').scrollIntoView({ behavior: 'smooth' });
});

// Evento para el botón "Limpiar Todo"
document.getElementById('btn-limpiar').addEventListener('click', function() {
    document.getElementById('entrada-texto').value = '';
    limpiarResultados();
    cambiarPestana('tokens');
    window.tokensGlobales = [];
});

// Evento para el botón "Exportar Reporte"
document.getElementById('btn-exportar').addEventListener('click', exportarReporte);

// Evento para copiar código DOT
document.getElementById('btn-copiar-dot').addEventListener('click', function() {
    const textarea = document.getElementById('salida-graphviz');
    textarea.select();
    document.execCommand('copy');
    alert('✅ Código DOT copiado al portapapeles. Pégalo en Graphviz Online para ver el bracket.');
});

// Evento para cambiar de pestaña
document.querySelectorAll('.pestanas button').forEach(boton => {
    boton.addEventListener('click', function() {
        const pestanaId = this.getAttribute('data-pestana');
        cambiarPestana(pestanaId);
    });
});

// ============ CARGA INICIAL ============
// Cargar el ejemplo del PDF al iniciar
window.addEventListener('load', function() {
    const ejemplo = `TORNEO {
  nombre: "Copa Mundial Universitaria",
  equipos: 4,
  sede: "Guatemala"
}

EQUIPOS {
  equipo: "Leones FC" [
    jugador: "Carlos Ruiz" [posicion: "PORTERO", numero: 1, edad: 35],
    jugador: "Mario López" [posicion: "DELANTERO", numero: 10, edad: 22],
    jugador: "Pedro Martínez" [posicion: "DELANTERO", numero: 9, edad: 27]
  ],
  equipo: "Águilas United" [
    jugador: "Diego Ramírez" [posicion: "DELANTERO", numero: 11, edad: 28],
    jugador: "Sofía Hernández" [posicion: "MEDIOCAMPO", numero: 8, edad: 25]
  ],
  equipo: "Cóndores FC" [
    jugador: "Luis García" [posicion: "DEFENSA", numero: 5, edad: 30],
    jugador: "Valeria Cruz" [posicion: "MEDIOCAMPO", numero: 6, edad: 27]
  ],
  equipo: "Tigres Academy" [
    jugador: "Andrés Pérez" [posicion: "DELANTERO", numero: 7, edad: 24],
    jugador: "José Martínez" [posicion: "PORTERO", numero: 12, edad: 26]
  ]
}

ELIMINACION {
  cuartos: [
    partido: "Leones FC" vs "Cóndores FC" [
      resultado: "3-1",
      goleadores: [
        goleador: "Pedro Martínez" [minuto: 15],
        goleador: "Pedro Martínez" [minuto: 45],
        goleador: "Valeria Cruz" [minuto: 67]
      ]
    ],
    partido: "Águilas United" vs "Tigres Academy" [
      resultado: "2-0",
      goleadores: [
        goleador: "Diego Ramírez" [minuto: 22],
        goleador: "Sofía Hernández" [minuto: 75]
      ]
    ]
  ],
  semifinal: [
    partido: "Leones FC" vs "Águilas United" [
      resultado: "1-0",
      goleadores: [
        goleador: "Mario López" [minuto: 34]
      ]
    ]
  ],
  final: [
    partido: "Leones FC" vs "TBD" [
      resultado: "Pendiente"
    ]
  ]
}`;

    document.getElementById('entrada-texto').value = ejemplo;
    window.tokensGlobales = [];
});