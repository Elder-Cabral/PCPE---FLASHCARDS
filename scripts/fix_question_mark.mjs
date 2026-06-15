import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixMap = {
  '?s': 'ões',
  '?rg?os': 'órgãos',
  '?rg?o': 'órgão',
  '?rg': 'órg',
  '?mbito': 'âmbito',
  'n?o': 'não',
  's?o': 'são',
  's?': 'são',
  'n?': 'não',
  'j?': 'já',
  'tamb?m': 'também',
  'est?': 'está',
  'est?o': 'estão',
  'est?vel': 'estável',
  'est?veis': 'estáveis',
  'est?gio': 'estágio',
  'ser?': 'será',
  'ap?s': 'após',
  'tr?s': 'três',
  'tr?fico': 'tráfico',
  'car?ter': 'caráter',
  'm?xima': 'máxima',
  'n?mero': 'número',
  'n?vel': 'nível',
  'm?todos': 'métodos',
  'of?cio': 'ofício',
  'per?odo': 'período',
  'p?blica': 'pública',
  'p?blico': 'público',
  'p?blicos': 'públicos',
  'pol?cia': 'polícia',
  'cient?fica': 'científica',
  'judici?ria': 'judiciária',
  'judici?rio': 'judiciário',
  'org?nica': 'orgânica',
  'espec?fica': 'específica',
  'hier?rquica': 'hierárquica',
  'pr?prio': 'próprio',
  'obrigat?rio': 'obrigatório',
  'preparat?rio': 'preparatório',
  'probat?rio': 'probatório',
  'sum?rio': 'sumário',
  'remunerat?ria': 'remuneratória',
  'subsidi?ria': 'subsidiária',
  'volunt?ria': 'voluntária',
  'contradit?rio': 'contraditório',
  'contr?rio': 'contrário',
  'secret?rio': 'secretário',
  'sal?rio': 'salário',
  'patrim?nio': 'patrimônio',
  'quinqu?nio': 'quinquênio',
  'interst?cio': 'interstício',
  'latroc?nios': 'latrocínios',
  'homic?dio': 'homicídio',
  'homic?dios': 'homicídios',
  'les?es': 'lesões',
  'for?as': 'forças',
  'seguran?a': 'segurança',
  'crian?a': 'criança',
  'crian?as': 'crianças',
  'diferen?a': 'diferença',
  'licen?a': 'licença',
  'senten?a': 'sentença',
  'intelig?ncia': 'inteligência',
  'compet?ncia': 'competência',
  'insufici?ncia': 'insuficiência',
  'aus?ncia': 'ausência',
  'cust?dia': 'custódia',
  'hip?tese': 'hipótese',
  'hip?teses': 'hipóteses',
  'servi?o': 'serviço',
  'servi?os': 'serviços',
  'v?nculo': 'vínculo',
  'sindic?ncia': 'sindicância',
  'transgress?o': 'transgressão',
  'suspens?o': 'suspensão',
  'repreens?o': 'repreensão',
  'demiss?o': 'demissão',
  'progress?o': 'progressão',
  'conclus?o': 'conclusão',
  'decis?o': 'decisão',
  'remiss?o': 'remissão',
  'omiss?o': 'omissão',
  'omiss?es': 'omissões',
  'comiss?o': 'comissão',
  'gest?o': 'gestão',
  'reintegra?': 'reintegração',
  'recondu?': 'recondução',
  'redistribui?': 'redistribuição',
  'remo?': 'remoção',
  'readapta?': 'readaptação',
  'promo?': 'promoção',
  'exonera?': 'exoneração',
  'nomea?': 'nomeação',
  'lota?': 'lotação',
  'avalia?': 'avaliação',
  'capacita?': 'capacitação',
  'certifica?': 'certificação',
  'eleva?': 'elevação',
  'aquisi?': 'aquisição',
  'infra?': 'infração',
  'puni?': 'punição',
  'cassa?': 'cassação',
  'investiga?': 'investigação',
  'apura?': 'apuração',
  'aplica?': 'aplicação',
  'altera?': 'alteração',
  'colabora?': 'colaboração',
  'elucida?': 'elucidação',
  'infiltra?': 'infiltração',
  'instala?': 'instalação',
  'instaura?': 'instauração',
  'institui?': 'instituição',
  'instru?': 'instrução',
  'motiva?': 'motivação',
  'ocupa?': 'ocupação',
  'organiza?': 'organização',
  'publica?': 'publicação',
  'rela?': 'relação',
  'repara?': 'reparação',
  'subordina?': 'subordinação',
  'vincula?': 'vinculação',
  'viola?': 'violação',
  'fun?': 'função',
  'fun?es': 'funções',
  'disp?e': 'dispõe',
  'obt?m': 'obtém',
  'prev?': 'prevê',
  'v?o': 'vão',
  'v?tima': 'vítima',
  'v?timas': 'vítimas',
  'inclu?da': 'incluída',
  'institu?da': 'instituída',
  'amea?adas': 'ameaçadas',
  'mil?cias': 'milícias',
  'n?cleos': 'núcleos',
  'pec?nia': 'pecúnia',
  'per?cias': 'perícias',
  'peri?dica': 'periódica',
  'prorrog?vel': 'prorrogável',
  'respons?vel': 'responsável',
  'revers?o': 'reversão',
  't?tulo': 'título',
  't?tulos': 'títulos',
  'escriv?es': 'escrivães',
  'acumula?': 'acumulação',
  'advert?ncia': 'advertência',
  'associa?': 'associação',
  'at?': 'até',
  'atribui?': 'atribuição',
  'atua?': 'atuação',
  'autom?tica': 'automática',
  'b?sica': 'básica',
  'cont?nuo': 'contínuo',
  'corre?': 'correção',
  'cr?tica': 'crítica',
  'f?sica': 'física',
  'mudan?a': 'mudança',
  'admiss?o': 'admissão',
  'atribui?': 'atribuição',
  'concess?o': 'concessão',
  'convoca?': 'convocação',
  'destitui?': 'destituição',
  'distribui?': 'distribuição',
  'documenta?': 'documentação',
  'federa?': 'federação',
  'fixa?': 'fixação',
  'forma?': 'formação',
  'fundamenta?': 'fundamentação',
  'garantia?': 'garantia',
  'identifica?': 'identificação',
  'implanta?': 'implantação',
  'indisponibilidade?': 'indisponibilidade',
  'individua?': 'individualização',
  'inib?': 'inibe',
  'integra?': 'integração',
  'mobiliza?': 'mobilização',
  'modifica?': 'modificação',
  'preserva?': 'preservação',
  'prorroga?': 'prorrogação',
  'regulamenta?': 'regulamentação',
  'repara?': 'reparação',
  'representa?': 'representação',
  'requisi?': 'requisição',
  'responsabilidade?': 'responsabilidade',
  'situa?': 'situação',
  'suspende?': 'suspende',
  'transfer?ncia': 'transferência',
  'transforma?': 'transformação',
  'verifica?': 'verificação',
  'viabiliza?': 'viabilização',
  'legisla?': 'legislação',
  'nacional?': 'nacional',
  'profissional?': 'profissional',
  'constitucional?': 'constitucional',
  'relativa?': 'relativa',
  'execu?': 'execução',
  'prescri?': 'prescrição',
  'concess?o': 'concessão',
  'correi?': 'correição',
  'audi?ncia': 'audiência',
  'dilig?ncia': 'diligência',
};

function fixText(text) {
  if (!text) return text;
  const sortedKeys = Object.keys(fixMap).sort((a, b) => b.length - a.length);
  let result = text;
  sortedKeys.forEach(key => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    result = result.replace(re, match => {
      const val = fixMap[key];
      if (match === key) return val;
      if (match === key.toUpperCase()) {
        const uc = /[A-Z]/.test(key[0]) ? val.toUpperCase() : val[0].toUpperCase() + val.slice(1);
        return uc;
      }
      if (match[0] === key[0] || match[0] === key[0].toUpperCase()) {
        const uc = /[A-Z]/.test(match[0]) ? val[0].toUpperCase() + val.slice(1) : val;
        return uc;
      }
      return val;
    });
  });
  return result;
}

// Apply to banco.json
const bancoPath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
let fixed = 0;
Object.entries(banco).forEach(([section, cards]) => {
  cards.forEach(c => {
    ['pergunta','resposta','dica'].forEach(f => {
      if (c[f]) {
        const fixedText = fixText(c[f]);
        if (fixedText !== c[f]) {
          c[f] = fixedText;
          fixed++;
        }
      }
    });
  });
});
console.log('Fixed cards in banco:', fixed);
fs.writeFileSync(bancoPath, JSON.stringify(banco, null, 2), 'utf8');
console.log('Saved banco.json');

// Fix rewrite data files
['leg_estadual','dir_adm','dir_const'].forEach(subj => {
  const p = path.resolve(__dirname, '..', 'scripts', 'rewrite_data', subj + '.json');
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    let cnt = 0;
    if (data.rewrites) {
      data.rewrites.forEach(r => {
        [1,2,3].forEach(i => {
          if (r[i]) {
            const f = fixText(r[i]);
            if (f !== r[i]) { r[i] = f; cnt++; }
          }
        });
      });
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    console.log('Fixed', cnt, 'fields in', subj + '.json');
  }
});

console.log('Done');
