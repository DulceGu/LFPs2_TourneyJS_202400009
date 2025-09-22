import { Lexer } from "./Lexer.js";

// Ejemplo de entrada exacto proporcionado
const entrada = `TORNEO {
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

// Crear instancia del analizador léxico
const lexer = new Lexer(entrada);

// Ejecutar el análisis
const resultado = lexer.analizar();

// Mostrar tokens generados
console.log("========= TOKENS GENERADOS =========");
resultado.tokens.forEach((token, index) => {
    console.log(`[${index + 1}] Tipo: ${token.tipo}, Valor: "${token.valor}", Línea: ${token.fila}, Columna: ${token.columna}`);
});

// Mostrar errores (si los hay)
if (resultado.errores.length > 0) {
    console.log("\n========= ERRORES LÉXICOS =========");
    resultado.errores.forEach(error => {
        console.log(`Error ${error.numero}: "${error.lexema}" - ${error.descripcion} (Línea: ${error.linea}, Columna: ${error.columna})`);
    });
} else {
    console.log("\n✅ Análisis léxico completado sin errores.");
}

// Para fines de depuración, también puedes imprimir la estructura completa
// console.log(JSON.stringify(resultado, null, 2));