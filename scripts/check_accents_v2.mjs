import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("src/data/banco.json", "utf8"));
const cards = data.jurisprudencias || [];

// ─── Complete dictionary of (unaccented → accented) ───
const fixes = {
  // Words the user specifically mentioned
  "alguem": "alguém",
  "fisico": "físico",
  "fisica": "física",
  "fisicos": "físicos",
  "fisicas": "físicas",

  // "é" as verb (3rd person singular of "ser")
  // This is handled by a pattern check below

  // Proparoxítonas (ALL must have accent in Portuguese)
  "publico": "público",
  "publica": "pública",
  "publicos": "públicos",
  "publicas": "públicas",
  "especifico": "específico",
  "especifica": "específica",
  "especificos": "específicos",
  "especificas": "específicas",
  "juridico": "jurídico",
  "juridica": "jurídica",
  "juridicos": "jurídicos",
  "juridicas": "jurídicas",
  "generico": "genérico",
  "generica": "genérica",
  "genericos": "genéricos",
  "genericas": "genéricas",
  "tipico": "típico",
  "tipica": "típica",
  "tipicos": "típicos",
  "tipicas": "típicas",
  "atipico": "atípico",
  "atipica": "atípica",
  "valido": "válido",
  "valida": "válida",
  "validos": "válidos",
  "validas": "válidas",
  "invalido": "inválido",
  "invalida": "inválida",
  "invalidos": "inválidos",
  "invalidas": "inválidas",
  "necessario": "necessário",
  "necessaria": "necessária",
  "necessarios": "necessários",
  "necessarias": "necessárias",
  "arbitrario": "arbitrário",
  "arbitraria": "arbitrária",
  "arbitrarios": "arbitrários",
  "arbitrarias": "arbitrárias",
  "judiciario": "judiciário",
  "judiciaria": "judiciária",
  "judiciarios": "judiciários",
  "judiciarias": "judiciárias",
  "intrinseco": "intrínseco",
  "intrinseca": "intrínseca",
  "intrinsecos": "intrínsecos",
  "intrinsecas": "intrínsecas",
  "extrinseco": "extrínseco",
  "extrinseca": "extrínseca",
  "estavel": "estável",
  "estaveis": "estáveis",
  "provavel": "provável",
  "provaveis": "prováveis",
  "responsavel": "responsável",
  "responsaveis": "responsáveis",
  "improvavel": "improvável",
  "improvaveis": "improváveis",
  "parabens": "parabéns",
  "tambem": "também",
  "conteudo": "conteúdo",
  "conteudos": "conteúdos",
  "conteuda": "conteúda",
  "nivel": "nível",
  "niveis": "níveis",
  "possivel": "possível",
  "possiveis": "possíveis",
  "impossivel": "impossível",
  "impossiveis": "impossíveis",
  "incrivel": "incrível",
  "incriveis": "incríveis",
  "carater": "caráter",
  "caracteres": "caracteres",

  // Words with tilde missing
  "revisao": "revisão",
  "revisoes": "revisões",
  "execucao": "execução",
  "execucoes": "execuções",
  "atuacao": "atuação",
  "atuacoes": "atuações",
  "fundamentacao": "fundamentação",
  "fundamentacoes": "fundamentações",
  "autorizacao": "autorização",
  "autorizacoes": "autorizações",
  "investigacao": "investigação",
  "investigacoes": "investigações",
  "condenacao": "condenação",
  "condenacoes": "condenações",
  "organizacao": "organização",
  "organizacoes": "organizações",
  "administracao": "administração",
  "comunicacao": "comunicação",
  "comunicacoes": "comunicações",
  "obrigacao": "obrigação",
  "obrigacoes": "obrigações",
  "prescricao": "prescrição",
  "prescricoes": "prescrições",
  "disposicao": "disposição",
  "disposicoes": "disposições",
  "sessao": "sessão",
  "sessoes": "sessões",
  "secao": "seção",
  "secoes": "seções",
  "transgressao": "transgressão",
  "transgressoes": "transgressões",
  "omissao": "omissão",
  "omissoes": "omissões",
  "comissao": "comissão",
  "comissoes": "comissões",
  "exclusao": "exclusão",
  "inclusao": "inclusão",
  "privacao": "privação",
  "privacoes": "privações",
  "analise": "análise",
  "analises": "análises",
  "inquerito": "inquérito",
  "inqueritos": "inquéritos",
  "sumula": "súmula",
  "sumulas": "súmulas",
  "materia": "matéria",
  "materias": "matérias",
  "especie": "espécie",
  "especies": "espécies",
  "oficio": "ofício",
  "oficios": "ofícios",
  "orgao": "órgão",
  "orgaos": "órgãos",
  "jurisprudencia": "jurisprudência",
  "jurisprudencias": "jurisprudências",
  "silencio": "silêncio",
  "tribunal": "tribunal",
  "tribunais": "tribunais",

  // Specific words with accent
  "ilicito": "ilícito",
  "ilicita": "ilícita",
  "ilicitos": "ilícitos",
  "ilicitas": "ilícitas",
  "licito": "lícito",
  "licita": "lícita",
  "licitos": "lícitos",
  "licitas": "lícitas",
  "saude": "saúde",
  "juizo": "juízo",
  "juizes": "juízes",
  "raiz": "raiz",
  "raizes": "raízes",
  "pais": "país",
  "paises": "países",
  "proprio": "próprio",
  "propria": "própria",
  "proprios": "próprios",
  "proprias": "próprias",
  "serie": "série",
  "series": "séries",
  "indole": "índole",
  "carateres": "caracteres",
  "texto": "texto",
};

function normalize(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Build reverse map: unaccented form -> accented form
const fixMap = {};
for (const [wrong, correct] of Object.entries(fixes)) {
  const key = normalize(correct);
  // Only add if it's not already in the map or if this is a better match
  if (!fixMap[key] || correct !== key) {
    fixMap[key] = correct;
  }
}

let issues = [];

for (const c of cards) {
  for (const field of ["pergunta", "resposta", "dica"]) {
    const val = c[field] || "";
    // Split into words (keep only alpha chars for comparison)
    const words = val.split(/(\s+|[.,;:!?()"'\[\]{}–\-/\\])/);
    for (const token of words) {
      const clean = token.replace(/[^a-záéíóúãõâêôçàèìòùäëïöüA-ZÁÉÍÓÚÃÕÂÊÔÇÀÈÌÒÙÄËÏÖÜ]/g, "").toLowerCase();
      if (!clean || clean.length < 2) continue;
      const norm = normalize(clean);

      if (fixMap[norm]) {
        // Check if the actual word already has the correct accent
        const expectedForm = fixMap[norm].toLowerCase();
        if (clean !== expectedForm && norm === normalize(expectedForm)) {
          // Found a word that's missing an accent
          issues.push({
            id: c.id,
            field,
            word: token.trim(),
            correct: fixMap[norm],
            context: val.substring(Math.max(0, val.indexOf(token) - 25), Math.min(val.length, val.indexOf(token) + token.length + 30)).trim(),
          });
        }
      }
    }

    // Also check for standalone "e" when it should be "é" (verb ser)
    // "e " followed by a noun or used as verb
    // This is tricky in Portuguese. Let's check specific patterns.
    // "e " as verb: when it's followed by a word that makes it clearly "é"
    const ePatterns = [
      { re: /\bE\s+(obrigatorio|necessario|possivel|ilícito|vedado|permitido|proibido|direito|dever|crime|cabivel|aplicavel|valido|nulo|fato|caso|funcao)\b/gi, context: (m) => `'É' como verbo ser` },
      { re: /\bE\s+(o|a|os|as|um|uma|uns|umas)\s+(que|quem|onde|quando|como)\b/gi, context: (m) => `'É' como verbo ser` },
      { re: /\bNao\s+e\s+(o|a|no|na)\b/gi, context: (m) => `'É' como verbo ser` },
      { re: /\b(e)\s+(um|uma|o|a)\s+(crime|ato|fato|dever|direito|poder|funcao|medida|hipotese|excecao|regra)\b/gi, context: (m) => `'É' como verbo ser` },
    ];
    // We'll handle this in the regex-based fixer
  }
}

if (issues.length === 0) {
  console.log("✅ Nenhum problema de acentuação adicional encontrado.");
} else {
  console.log(`❌ ${issues.length} problema(s) de acentuação:\n`);
  const grouped = {};
  for (const iss of issues) {
    const key = `${iss.id}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(iss);
  }
  for (const [id, issList] of Object.entries(grouped)) {
    console.log(`  ${id}:`);
    for (const iss of issList) {
      console.log(`    [${iss.field}] "${iss.word}" → "${iss.correct}" | ...${iss.context}...`);
    }
    console.log();
  }
}

// Also check for "e" vs "é" and "a" vs "á" patterns
console.log("\n--- Verificação de 'e' (verbo) e 'a' (preposição com crase) ---\n");
for (const c of cards) {
  for (const field of ["pergunta", "resposta", "dica"]) {
    const val = c[field] || "";

    // Check for "E" used as verb (should be "É") before certain words
    const reEverb = /\bE\s+(obrigatorio|necessario|possivel|vedado|permitido|proibido|cabivel|aplicavel|exigivel|crime|dever|direito|ilicit[oa]|valido|nulo|ato|fato|funcao|medida|hipotese|excecao|regra|caso|função)\b/gi;
    let match;
    while ((match = reEverb.exec(val)) !== null) {
      console.log(`  ${c.id} [${field}]: "${match[0].trim()}" → "É ${match[1].toLowerCase()}"`);
    }
  }
}

console.log("\n--- Fim da verificação ---");
