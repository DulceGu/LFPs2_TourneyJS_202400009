// ============ ESTRUCTURAS DE DATOS PERSONALIZADAS (SIN ARRAYS) ============

/**
 * Nodo para una lista enlazada simple.
 */
function NodoLista(valor, siguiente) {
    this.valor = valor;
    this.siguiente = siguiente || null;
}

/**
 * Lista enlazada simple.
 */
function ListaEnlazada() {
    this.cabeza = null;
    this.longitud = 0;
}

/**
 * Agrega un nuevo elemento al final de la lista.
 */
ListaEnlazada.prototype.agregar = function(elemento) {
    const nuevo_nodo = new NodoLista(elemento);
    if (!this.cabeza) {
        this.cabeza = nuevo_nodo;
    } else {
        let actual = this.cabeza;
        while (actual.siguiente) {
            actual = actual.siguiente;
        }
        actual.siguiente = nuevo_nodo;
    }
    this.longitud++;
};

/**
 * Convierte la lista enlazada en un array (solo para generar tablas HTML).
 */
ListaEnlazada.prototype.a_array = function() {
    const array = [];
    let actual = this.cabeza;
    while (actual) {
        array.push(actual.valor);
        actual = actual.siguiente;
    }
    return array;
};

// ============ DEFINICIÓN DE TOKENS Y ESTADOS DEL AFD ============

const ESTADO_INICIO = 0;
const ESTADO_IDENTIFICADOR = 1;
const ESTADO_NUMERO = 2;
const ESTADO_CADENA = 3;
const ESTADO_OPERADOR = 4;
const ESTADO_ERROR = -1;

// Tipos de Token
const TOKEN_PALABRA_RESERVADA = "Palabra Reservada";
const TOKEN_IDENTIFICADOR = "Identificador";
const TOKEN_NUMERO = "Número";
const TOKEN_CADENA = "Cadena";
const TOKEN_SIMBOLO = "Símbolo";

// Palabras reservadas del lenguaje TourneyJS
const PALABRAS_RESERVADAS = {
    "TORNEO": true,
    "EQUIPOS": true,
    "ELIMINACION": true,
    "equipo": true,
    "jugador": true,
    "partido": true,
    "goleador": true,
    "nombre": true,
    "equipos": true,
    "sede": true,
    "posicion": true,
    "numero": true,
    "edad": true,
    "resultado": true,
    "goleadores": true,
    "minuto": true,
    "vs": true,
    "cuartos": true,
    "semifinal": true,
    "final": true,
    "PORTERO": true,
    "DEFENSA": true,
    "MEDIOCAMPO": true,
    "DELANTERO": true,
    "TBD": true,
    "Pendiente": true
};

// ============ CLASE PRINCIPAL DEL ANALIZADOR LÉXICO ============

/**
 * Analizador Léxico para el lenguaje TourneyJS.
 */
function AnalizadorLexico() {
    this.linea_actual = 1;
    this.columna_actual = 1;
    this.indice_actual = 0;
    this.texto_entrada = "";
    this.tokens = new ListaEnlazada();
    this.errores = new ListaEnlazada();
    this.pila_llaves = new ListaEnlazada();   // Para rastrear '{' abiertas
    this.pila_corchetes = new ListaEnlazada(); // Para rastrear '[' abiertas
    this.pila_comillas = new ListaEnlazada();  // Para rastrear cadenas abiertas
}

/**
 * Inicia el análisis léxico del texto proporcionado.
 */
AnalizadorLexico.prototype.analizar = function(texto) {
    this.texto_entrada = texto;
    this.linea_actual = 1;
    this.columna_actual = 1;
    this.indice_actual = 0;
    this.tokens = new ListaEnlazada();
    this.errores = new ListaEnlazada();

    while (this.indice_actual < this.texto_entrada.length) {
        const caracter = this.texto_entrada[this.indice_actual];

        // Saltamos espacios en blanco y tabulaciones
        if (caracter === ' ' || caracter === '\t') {
            this.columna_actual++;
            this.indice_actual++;
            continue;
        }

        // Manejo de saltos de línea
        if (caracter === '\n') {
            this.linea_actual++;
            this.columna_actual = 1;
            this.indice_actual++;
            continue;
        }

        // Comenzamos el análisis de un token
        const inicio_token = this.indice_actual;
        const linea_token = this.linea_actual;
        const columna_token = this.columna_actual;

        // --- AFD Manual ---
        if (this.es_letra(caracter)) {
            this.procesar_identificador(inicio_token, linea_token, columna_token);
        } else if (this.es_digito(caracter)) {
            this.procesar_numero(inicio_token, linea_token, columna_token);
        } else if (caracter === '"') {
            this.procesar_cadena(inicio_token, linea_token, columna_token);
        } else if (caracter === '{' || caracter === '}' || caracter === '[' || caracter === ']' || caracter === ',' || caracter === ':' || caracter === '-') {
            this.procesar_simbolo(inicio_token, linea_token, columna_token);
        } else {
            this.registrar_error("Token inválido", caracter, linea_token, columna_token);
            this.indice_actual++;
            this.columna_actual++;
        }
    }
    
    while (this.pila_llaves.cabeza) {
        const info = this.pila_llaves.cabeza.valor;
        this.registrar_error("Falta de símbolo esperado", "Llave de cierre '}' faltante", info.linea, info.columna);
        this.pila_llaves.cabeza = this.pila_llaves.cabeza.siguiente;
    }
    this.pila_llaves.longitud = 0;

    while (this.pila_corchetes.cabeza) {
        const info = this.pila_corchetes.cabeza.valor;
        this.registrar_error("Falta de símbolo esperado", "Corchete de cierre ']' faltante", info.linea, info.columna);
        this.pila_corchetes.cabeza = this.pila_corchetes.cabeza.siguiente;
    }
    this.pila_corchetes.longitud = 0;

    while (this.pila_comillas.cabeza) {
        const info = this.pila_comillas.cabeza.valor;
        this.registrar_error("Falta de símbolo esperado", "Comilla de cierre '\"' faltante", info.linea, info.columna);
        this.pila_comillas.cabeza = this.pila_comillas.cabeza.siguiente;
    }
    this.pila_comillas.longitud = 0;
};

/**
 * Verifica si un carácter es una letra.
 */
AnalizadorLexico.prototype.es_letra = function(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || 
           c === 'ñ' || c === 'Ñ' || 
           c === 'á' || c === 'é' || c === 'í' || c === 'ó' || c === 'ú' ||
           c === 'Á' || c === 'É' || c === 'Í' || c === 'Ó' || c === 'Ú';
};

/**
 * Verifica si un carácter es un dígito.
 */
AnalizadorLexico.prototype.es_digito = function(c) {
    return c >= '0' && c <= '9';
};

/**
 * Procesa un identificador o palabra reservada.
 */
/**
 * Procesa un identificador o palabra reservada.
 * Si el identificador contiene algún dígito, se considera ERROR LÉXICO (según ejemplo del PDF: "equip0").
 */
AnalizadorLexico.prototype.procesar_identificador = function(inicio, linea, columna) {
    let lexema = "";
    let contiene_digito = false; // Bandera para detectar dígitos

    while (this.indice_actual < this.texto_entrada.length && 
           (this.es_letra(this.texto_entrada[this.indice_actual]) || 
            this.es_digito(this.texto_entrada[this.indice_actual]) || 
            this.texto_entrada[this.indice_actual] === '_')) {
        
        const char_actual = this.texto_entrada[this.indice_actual];
        if (this.es_digito(char_actual)) {
            contiene_digito = true;
        }
        lexema += char_actual;
        this.columna_actual++;
        this.indice_actual++;
    }

    // Si el identificador contiene algún dígito, ¡es un error!
    if (contiene_digito) {
        this.registrar_error("Token inválido", lexema, linea, columna);
        return;
    }

    // Si no tiene dígitos, verificamos si es palabra reservada o identificador válido
    const tipo = PALABRAS_RESERVADAS[lexema] ? TOKEN_PALABRA_RESERVADA : TOKEN_IDENTIFICADOR;
    this.tokens.agregar({
        numero: this.tokens.longitud + 1,
        lexema: lexema,
        tipo: tipo,
        linea: linea,
        columna: columna
    });
};

/**
 * Procesa un número.
 */
AnalizadorLexico.prototype.procesar_numero = function(inicio, linea, columna) {
    let lexema = "";
    while (this.indice_actual < this.texto_entrada.length && this.es_digito(this.texto_entrada[this.indice_actual])) {
        lexema += this.texto_entrada[this.indice_actual];
        this.columna_actual++;
        this.indice_actual++;
    }
    this.tokens.agregar({
        numero: this.tokens.longitud + 1,
        lexema: lexema,
        tipo: TOKEN_NUMERO,
        linea: linea,
        columna: columna
    });
};

/**
 * Procesa una cadena de texto entre comillas.
 */
AnalizadorLexico.prototype.procesar_cadena = function(inicio, linea, columna) {
    // Registramos que se abrió una cadena
    this.pila_comillas.agregar({ linea: linea, columna: columna });

    this.indice_actual++; // Saltamos la comilla de apertura
    this.columna_actual++;

    let lexema = "";
    let caracter_actual = this.texto_entrada[this.indice_actual];

    while (this.indice_actual < this.texto_entrada.length && caracter_actual !== '"') {
        lexema += caracter_actual;
        this.columna_actual++;
        this.indice_actual++;
        caracter_actual = this.texto_entrada[this.indice_actual];
    }

    if (caracter_actual === '"') {
        this.indice_actual++; // Saltamos la comilla de cierre
        this.columna_actual++;
        // Desapilamos la cadena abierta
        this.pila_comillas.cabeza = this.pila_comillas.cabeza.siguiente;
        if (!this.pila_comillas.cabeza) this.pila_comillas.longitud = 0;
        else this.pila_comillas.longitud--;

        this.tokens.agregar({
            numero: this.tokens.longitud + 1,
            lexema: lexema,
            tipo: TOKEN_CADENA,
            linea: linea,
            columna: columna
        });
    } else {
        // ¡Error! Cadena sin cerrar
        const info_apertura = this.pila_comillas.cabeza ? this.pila_comillas.cabeza.valor : { linea: linea, columna: columna };
        this.registrar_error(
            "Falta de símbolo esperado",
            "Cadena sin cerrar",
            info_apertura.linea,
            info_apertura.columna
        );
        // Desapilamos para no dejar basura
        if (this.pila_comillas.cabeza) {
            this.pila_comillas.cabeza = this.pila_comillas.cabeza.siguiente;
            this.pila_comillas.longitud--;
        }
    }
};

/**
 * Procesa un símbolo individual.
 */
AnalizadorLexico.prototype.procesar_simbolo = function(inicio, linea, columna) {
    const lexema = this.texto_entrada[this.indice_actual];
    const token = {
        numero: this.tokens.longitud + 1,
        lexema: lexema,
        tipo: TOKEN_SIMBOLO,
        linea: linea,
        columna: columna
    };

    // Registrar aperturas
    if (lexema === '{') {
        this.pila_llaves.agregar({ linea: linea, columna: columna });
    } else if (lexema === '[') {
        this.pila_corchetes.agregar({ linea: linea, columna: columna });
    } else if (lexema === '}') {
        if (this.pila_llaves.longitud === 0) {
            this.registrar_error("Falta de símbolo esperado", "Llave de apertura '{' faltante", linea, columna);
        } else {
            this.pila_llaves.cabeza = this.pila_llaves.cabeza.siguiente; // Desapila
            if (!this.pila_llaves.cabeza) this.pila_llaves.longitud = 0;
            else this.pila_llaves.longitud--;
        }
    } else if (lexema === ']') {
        if (this.pila_corchetes.longitud === 0) {
            this.registrar_error("Falta de símbolo esperado", "Corchete de apertura '[' faltante", linea, columna);
        } else {
            this.pila_corchetes.cabeza = this.pila_corchetes.cabeza.siguiente; // Desapila
            if (!this.pila_corchetes.cabeza) this.pila_corchetes.longitud = 0;
            else this.pila_corchetes.longitud--;
        }
    }

    this.tokens.agregar(token);
    this.indice_actual++;
    this.columna_actual++;
};

/**
 * Registra un error léxico.
 */
AnalizadorLexico.prototype.registrar_error = function(tipo_error, lexema, linea, columna) {
    this.errores.agregar({
        numero: this.errores.longitud + 1,
        lexema: lexema,
        tipo: tipo_error,
        descripcion: "Error léxico detectado",
        linea: linea,
        columna: columna
    });
};

/**
 * Devuelve true si el análisis tuvo errores.
 */
AnalizadorLexico.prototype.hay_errores = function() {
    return this.errores.longitud > 0;
};

/**
 * Devuelve la lista de tokens.
 */
AnalizadorLexico.prototype.obtener_tokens = function() {
    return this.tokens;
};

/**
 * Devuelve la lista de errores.
 */
AnalizadorLexico.prototype.obtener_errores = function() {
    return this.errores;
};