import { Token } from "./Token.js";

export class Lexer {
    constructor(texto) {
        this.texto = texto;
        this.pos = 0;
        this.linea = 1;
        this.columna = 1;
        this.tokens = [];
        this.errores = [];
    }

    // Función auxiliar para obtener el carácter actual
    caracterActual() {
        if (this.pos >= this.texto.length) {
            return null;
        }
        return this.texto[this.pos];
    }

    // Función auxiliar para avanzar al siguiente carácter
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

    // Función auxiliar para ver el siguiente carácter sin avanzar
    siguienteCaracter() {
        if (this.pos + 1 >= this.texto.length) {
            return null;
        }
        return this.texto[this.pos + 1];
    }

    // Registrar un error léxico
    registrarError(lexema, tipoError, descripcion) {
        this.errores.push({
            numero: this.errores.length + 1,
            lexema: lexema,
            tipoError: tipoError,
            descripcion: descripcion,
            linea: this.linea,
            columna: this.columna
        });
    }

    // Analizar un identificador o palabra reservada
    analizarIdentificador() {
        let inicio = this.pos;
        let inicioColumna = this.columna;
        let valor = "";

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            if ((char >= 'a' && char <= 'z') || 
                (char >= 'A' && char <= 'Z') || 
                (char >= '0' && char <= '9') || 
                char === '_') {
                valor += char;
                this.avanzar();
            } else {
                break;
            }
        }

        // Verificar si es palabra reservada
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
        else if (valor === "PORTERO" || valor === "DEFENSA" || valor === "MEDIOCAMPO" || valor === "DELANTERO") {
            tipo = "POSICION";
        }
        else if (valor === "vs") {
            tipo = "VS";
        }

        this.tokens.push(new Token(tipo, valor, this.linea, inicioColumna));
    }

    // Analizar una cadena entre comillas dobles
    analizarCadena() {
        let inicioColumna = this.columna;
        this.avanzar(); // Saltar la comilla de apertura
        let valor = "";

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            if (char === '"') {
                this.avanzar(); // Saltar la comilla de cierre
                this.tokens.push(new Token("CADENA", valor, this.linea, inicioColumna));
                return;
            } else if (char === '\n') {
                this.registrarError(valor, "USO_INCORRECTO_COMILLAS", "Cadena no cerrada antes de salto de línea");
                this.avanzar();
                return;
            } else if (char === null) {
                this.registrarError(valor, "FALTA_SIMBOLO_ESPERADO", "Cadena no cerrada");
                return;
            } else {
                valor += char;
                this.avanzar();
            }
        }

        // Si llegamos aquí, no se cerró la cadena
        this.registrarError(valor, "FALTA_SIMBOLO_ESPERADO", "Cadena no cerrada");
    }

    // Analizar un número entero
    analizarNumero() {
        let inicioColumna = this.columna;
        let valor = "";

        while (this.pos < this.texto.length) {
            let char = this.caracterActual();
            if (char >= '0' && char <= '9') {
                valor += char;
                this.avanzar();
            } else {
                break;
            }
        }

        this.tokens.push(new Token("NUMERO", valor, this.linea, inicioColumna));
    }

    // Analizar el símbolo ':' o '::' (aunque en este lenguaje solo se usa ':')
    analizarDosPuntos() {
        let inicioColumna = this.columna;
        this.avanzar();
        this.tokens.push(new Token("DOS_PUNTOS", ":", this.linea, inicioColumna));
    }

    // Analizar el símbolo '-' (usado en resultados como "3-1")
    analizarGuion() {
        let inicioColumna = this.columna;
        this.avanzar();
        this.tokens.push(new Token("GUION", "-", this.linea, inicioColumna));
    }

    // Analizar el símbolo ',' (separador)
    analizarComa() {
        let inicioColumna = this.columna;
        this.avanzar();
        this.tokens.push(new Token("COMA", ",", this.linea, inicioColumna));
    }

    // Función principal de análisis léxico
    analizar() {
        while (this.pos < this.texto.length) {
            let char = this.caracterActual();

            if (char === '{') {
                this.tokens.push(new Token("LLAVE_IZQ", "{", this.linea, this.columna));
                this.avanzar();
            } else if (char === '}') {
                this.tokens.push(new Token("LLAVE_DER", "}", this.linea, this.columna));
                this.avanzar();
            } else if (char === '[') {
                this.tokens.push(new Token("CORCHETE_IZQ", "[", this.linea, this.columna));
                this.avanzar();
            } else if (char === ']') {
                this.tokens.push(new Token("CORCHETE_DER", "]", this.linea, this.columna));
                this.avanzar();
            } else if (char === ':') {
                this.analizarDosPuntos();
            } else if (char === '-') {
                this.analizarGuion();
            } else if (char === ',') {
                this.analizarComa();
            } else if (char === '"') {
                this.analizarCadena();
            } else if (char >= '0' && char <= '9') {
                this.analizarNumero();
            } else if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_') {
                this.analizarIdentificador();
            } else if (char === ' ' || char === '\t') {
                this.avanzar();
            } else if (char === '\n') {
                this.avanzar();
            } else if (char === '\r') {
                this.avanzar();
                if (this.caracterActual() === '\n') {
                    this.avanzar();
                }
            } else {
                // Carácter no reconocido
                this.registrarError(char, "TOKEN_INVALIDO", "Carácter no permitido en el lenguaje");
                this.avanzar();
            }
        }

        return {
            tokens: this.tokens,
            errores: this.errores
        };
    }
}