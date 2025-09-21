// graphviz.js
// Generador .dot para Bracket (Graphviz)
// Provee: generar_reporte_bracket(tokensOrParsed, options)
// - Si pasas el objeto tokens (tu estructura actual) intenta leer tokens.a_array()
// - Si pasas un objeto parseado (estructura JS), lo usa directamente.
// - Devuelve HTML listo para inyectar en tu contenedor de salida.

/* eslint-disable no-unused-vars */
(function(global){

  // ================= utilidades =================
  function escape_dot(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  function escape_html(texto) {
    if (typeof texto !== 'string') return texto;
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  }

  // Extrae un array de tokens si se pasó el objeto tokens (compatibilidad)
  function tokens_to_array(tokensOrParsed) {
    if (!tokensOrParsed) return null;
    // si tiene a_array(), lo usamos
    if (typeof tokensOrParsed.a_array === 'function') {
      try {
        return tokensOrParsed.a_array();
      } catch (e) {
        // continue
      }
    }
    // si ya es array
    if (Array.isArray(tokensOrParsed)) return tokensOrParsed;
    return null;
  }

  // ================= parseador ligero para hallar estructura de ELIMINACION =================
  // Intentamos obtener una estructura mínima: fases -> lista de partidos { equipo1, equipo2, resultado, goleadores: [] }
  function extract_bracket_from_tokens(tokensOrParsed) {
    // Si el usuario proporcionó un objeto parseado (con claves torne, equipos, eliminacion)
    if (tokensOrParsed && typeof tokensOrParsed === 'object' && !tokens_to_array(tokensOrParsed)) {
      // asumimos que la estructura ya está parseada
      const p = tokensOrParsed;
      if (p.ELIMINACION) return p.ELIMINACION;
    }

    const arr = tokens_to_array(tokensOrParsed);
    if (!arr) return {}; // no hay tokens interpretables

    // Transformamos el arreglo de tokens en un array simple de lexemas para búsquedas
    const lex = arr.map(t => ({ lexema: (t.lexema ?? "").toString(), tipo: t.tipo ?? "" }));

    const phases = {}; // fase -> [{equipo1,equipo2,resultado,goleadores:[]}]
    for (let i = 0; i < lex.length; i++) {
      if (lex[i].lexema.toLowerCase() === "partido") {
        // intento heurístico de extraer: partido : "A" vs "B" [ resultado: "x-y", goleadores: [ ... ] ]
        // buscamos las comillas siguientes para equipo1
        const eq1Token = find_next_string(lex, i);
        const vsIdx = find_next_lexeme_index(lex, i, "vs");
        const eq2Token = (vsIdx >= 0) ? find_next_string(lex, vsIdx) : null;

        // buscar fase hacia atrás (final, semifinal, cuartos, etc.)
        let fase = "fase_desconocida";
        for (let j = i-1; j >= 0; j--) {
          const L = lex[j].lexema.toLowerCase();
          if (["final","semifinal","cuartos","octavos","eliminacion"].includes(L)) {
            fase = L;
            break;
          }
        }

        // buscar resultado cercano hacia adelante
        let resultado = null;
        for (let j = i; j < Math.min(lex.length, i+40); j++) {
          if (lex[j].lexema.toLowerCase() === "resultado") {
            const r = find_next_string(lex, j);
            if (r) { resultado = r; break; }
          }
        }

        // buscar goleadores en bloque cercano
        const goleadores = [];
        for (let j = i; j < Math.min(lex.length, i+200); j++) {
          if (lex[j].lexema.toLowerCase() === "goleador" || lex[j].lexema.toLowerCase() === "goleadores") {
            const gname = find_next_string(lex, j);
            if (gname) {
              // buscar minuto cercano
              let minuto = null;
              for (let k = j; k < Math.min(lex.length, j+12); k++) {
                if (lex[k].lexema.toLowerCase() === "minuto") {
                  const m = find_next_number(lex, k);
                  if (m !== null) { minuto = m; break; }
                }
              }
              goleadores.push({ nombre: gname, minuto });
            }
          }
        }

        const equipo1 = eq1Token || "TBD";
        const equipo2 = eq2Token || "TBD";
        if (!phases[fase]) phases[fase] = [];
        phases[fase].push({ equipo1, equipo2, resultado: resultado || "Pendiente", goleadores });
      }
    }

    return phases;
  }

  // helpers para tokens
  function find_next_string(arr, startIndex) {
    for (let i = startIndex+1; i < arr.length; i++) {
      if (arr[i].tipo && arr[i].tipo.toLowerCase() === "cadena") return arr[i].lexema;
      // fallback si lexema muestra comillas
      if (typeof arr[i].lexema === "string" && /^".*"$/.test(arr[i].lexema)) return arr[i].lexema.replace(/^"|"$/g,'');
    }
    return null;
  }
  function find_next_number(arr, startIndex) {
    for (let i = startIndex+1; i < arr.length; i++) {
      const v = arr[i].lexema;
      if (!isNaN(Number(v))) return Number(v);
      // también aceptar "12"
      if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
    }
    return null;
  }
  function find_next_lexeme_index(arr, startIndex, lexemeNeeded) {
    const target = lexemeNeeded.toLowerCase();
    for (let i = startIndex+1; i < arr.length; i++) {
      if ((arr[i].lexema||"").toLowerCase() === target) return i;
    }
    return -1;
  }

  // ================= generación .dot =================
  function generar_dot_bracket_from_phases(phases) {
    // phases: { faseName: [ {equipo1,equipo2,resultado,goleadores:[]} ] }
    const fasesOrden = Object.keys(phases).length ? Object.keys(phases) : ["final"];
    let dot = 'digraph Bracket {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=record, style=rounded];\n\n';

    let matchId = 0;
    const matchNodes = {};

    for (const fase of fasesOrden) {
      const list = phases[fase] || [];
      dot += `  subgraph cluster_${fase.replace(/\s+/g,'_')} {\n    label = "${fase.toUpperCase()}";\n    color = gray;\n`;
      matchNodes[fase] = [];
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        matchId++;
        const id = `m${matchId}`;
        matchNodes[fase].push(id);

        // calcular ganador si hay resultado
        let ganador = null;
        if (typeof m.resultado === 'string' && m.resultado.includes("-")) {
          const parts = m.resultado.split("-").map(x => parseInt(x.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (parts[0] > parts[1]) ganador = m.equipo1;
            else if (parts[1] > parts[0]) ganador = m.equipo2;
            else ganador = "EMPATE";
          }
        }

        // etiqueta: Equipo1 \n resultado \n Equipo2
        const etiqueta = `${escape_dot(m.equipo1)}\\n${escape_dot(m.resultado)}\\n${escape_dot(m.equipo2)}`;
        // destacar si es ganador conocido
        const extra = ganador && ganador !== "EMPATE" ? ', penwidth=3' : '';
        const color = ganador && ganador !== "EMPATE" ? ', color="darkgreen"' : '';

        dot += `    ${id} [label="${etiqueta}"${extra}${color}];\n`;
      }
      dot += '  }\n\n';
    }

    // Conexión heurística entre fases (si hay >1 fase)
    const fasesKeys = Object.keys(matchNodes);
    for (let fi = 0; fi < fasesKeys.length-1; fi++) {
      const orig = matchNodes[fasesKeys[fi]];
      const dest = matchNodes[fasesKeys[fi+1]];
      if (!orig || !dest) continue;
      for (let i = 0; i < orig.length; i++) {
        const idxDest = Math.floor(i / Math.max(1, Math.ceil(orig.length / dest.length)));
        if (dest[idxDest]) dot += `  ${orig[i]} -> ${dest[idxDest]};\n`;
      }
    }

    dot += '}\n';
    return dot;
  }

  // Public: recibe tokens o parsed object y devuelve HTML con preview + descarga
  function generar_reporte_bracket(tokensOrParsed, opts) {
    opts = opts || {};
    const phases = extract_bracket_from_tokens(tokensOrParsed);

    // Si extract no devolvió nada útil, y el usuario pasó un objeto con "ELIMINACION", lo usamos
    const dot = generar_dot_bracket_from_phases(phases);

    const safeDot = escape_html(dot);
    let html = "<div class='bracket-report'>";
    html += "<h3>🏆 Bracket (Graphviz .dot)</h3>";
    html += `<p>Puedes descargar el archivo .dot y luego renderizar con Graphviz (dot -Tpng bracket.dot -o bracket.png).</p>`;
    html += `<pre id="dot_preview" style="white-space:pre-wrap; background:#fafafa; padding:12px; border-radius:8px; border:1px solid #eee;">${safeDot}</pre>`;
    html += `<button id="download_dot">Descargar .dot</button>`;
    html += "</div>";

    // al inyectar el HTML en el DOM, este script permitirá descarga
    setTimeout(function(){ // delay leve para asegurar que el HTML ya está en DOM si el caller lo acaba de inyectar
      const btn = document.getElementById('download_dot');
      if (!btn) return;
      btn.onclick = function(){
        const blob = new Blob([dot], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bracket.dot';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };
    }, 50);

    return html;
  }

  // Exponer en global (compatibilidad con tu código actual)
  global.generar_reporte_bracket = generar_reporte_bracket;
  global.generar_dot_bracket_from_phases = generar_dot_bracket_from_phases;
  global.extract_bracket_from_tokens = extract_bracket_from_tokens;

})(window);
