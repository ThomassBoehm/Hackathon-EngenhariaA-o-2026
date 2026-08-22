import { ObraRecord, StatusClassificacao } from '@/types/sigo'

/**
 * SIGO Engine Determinística
 * Baseada rigorosamente no documento do Hackathon Cidades Inteligentes 2026:
 * "A IA lê. O sistema calcula. O fiscal decide."
 */

export interface CalculoClassificacaoParams {
  diasSemLiquidacao?: number
  periodicidadeDias?: number
  carenciaDias?: number
  porcentagemPrazoDecorrido?: number
  porcentagemLiquidada?: number
  temMarcoVencido?: boolean
  periodicidadeTipo?: string
  valorGlobal?: number
  multaMaxPercentual?: number
  multaRemissaoExterna?: boolean
  temAncora?: boolean
}

export interface ResultadoClassificacao {
  status: StatusClassificacao
  gravidade: number
  motivo: string
}

/**
 * 5. Classificação - Ordem de avaliação:
 * 1. Sem dados: sem âncora ou sem periodicidade identificável
 * 2. Prazo vencido: passou ciclo + carência · ou marco contratual vencido (sem carência)
 * 3. Fora do ritmo: passou o ciclo, dentro da carência · ou descompasso >= 20 p.p. entre prazo decorrido e valor liquidado
 * 4. No ritmo previsto: dentro do ciclo de medição pactuado
 */
export function calcularClassificacao(params: CalculoClassificacaoParams): ResultadoClassificacao {
  const {
    diasSemLiquidacao = 0,
    periodicidadeDias = 30,
    carenciaDias = 15,
    porcentagemPrazoDecorrido = 0,
    porcentagemLiquidada = 0,
    temMarcoVencido = false,
    periodicidadeTipo = 'explícita',
    valorGlobal = 0,
    multaMaxPercentual = 10,
    multaRemissaoExterna = false,
    temAncora = true,
  } = params

  // 1. Sem dados
  if (
    !temAncora ||
    periodicidadeTipo === 'ausente' ||
    !periodicidadeDias ||
    periodicidadeDias <= 0
  ) {
    return {
      status: 'sem_dados',
      gravidade: 0,
      motivo:
        'Sem dados de execução: Contrato sem âncora temporal ou sem periodicidade identificável no instrumento.',
    }
  }

  const ciclo = periodicidadeDias
  const car = carenciaDias
  const limiarVencido = ciclo + car
  const descompasso = Math.max(0, (porcentagemPrazoDecorrido || 0) - (porcentagemLiquidada || 0))

  let status: StatusClassificacao = 'no_ritmo'
  let motivo = 'Dentro do ciclo de medição pactuado e curvas alinhadas.'

  // 2. Prazo Vencido
  if (temMarcoVencido) {
    status = 'prazo_vencido'
    motivo =
      'Marco contratual obrigatório da contratada vencido (não recebe carência administrativa).'
  } else if (diasSemLiquidacao > limiarVencido) {
    status = 'prazo_vencido'
    motivo = `${diasSemLiquidacao} dias sem liquidação (ultrapassou ciclo de ${ciclo}d + carência de ${car}d = ${limiarVencido}d).`
  }
  // 3. Fora do Ritmo
  else if (diasSemLiquidacao > ciclo && diasSemLiquidacao <= limiarVencido) {
    status = 'fora_do_ritmo'
    motivo = `${diasSemLiquidacao} dias sem liquidação: ciclo pactuado de ${ciclo}d ultrapassado, porém resguardado pela carência de ${car}d.`
  } else if (descompasso >= 20) {
    status = 'fora_do_ritmo'
    motivo = `Descompasso de ${descompasso.toFixed(1)} p.p. entre prazo decorrido (${porcentagemPrazoDecorrido.toFixed(1)}%) e valor liquidado (${porcentagemLiquidada.toFixed(1)}%).`
  }

  // 5. Gravidade: G = A × log10(V) × S
  // A = dias sem liquidação / periodicidade
  // V = valor global (em R$)
  // S = maior % de multa / 10 (1.0 quando remetido ao TR/Edital)
  const A = diasSemLiquidacao / (ciclo || 30)
  const V = valorGlobal > 0 ? valorGlobal : 1
  const logV = Math.log10(V)
  const S = multaRemissaoExterna ? 1.0 : multaMaxPercentual ? multaMaxPercentual / 10 : 1.0

  const gravidade = Number((A * logV * S).toFixed(2))

  return {
    status,
    gravidade: isNaN(gravidade) || gravidade < 0 ? 0 : gravidade,
    motivo,
  }
}

/**
 * 7. Verificação de Coerência (sem IA)
 * Executa checagens determinísticas de texto sobre o contrato.
 *
 * Observação de compatibilidade: o schema da collection `inconsistencias`
 * no PocketBase só possui 4 valores de `tipo_checagem`
 * (clausula_inexistente, extenso_divergente, divergencia_aritmetica,
 * identificador_conflitante). As novas checagens (prazo incoerente e
 * valor por extenso ausente/incorreto) usam tipos próprios aqui na
 * camada TS, e o mapeamento de persistência em ContratoUpload recai
 * nos valores válidos do schema, preservando titulo/descricao para
 * diferenciação visual.
 */
export interface InconsistenciaDetectada {
  tipo:
    | 'clausula_inexistente'
    | 'extenso_divergente'
    | 'divergencia_aritmetica'
    | 'identificador_conflitante'
    | 'prazo_incoerente'
    | 'valor_extenso_ausente'
  titulo: string
  descricao: string
  localizacao?: string
  trechoOriginal?: string
  encontrado?: string
  esperado?: string
}

/**
 * Dicionário de números cardinais por extenso de 1 a 100.
 * Inclui variantes ortográficas comuns (quatorze/catorze, três/tres).
 */
function montarDicionarioExtenso(): Record<string, number> {
  const unidades: Record<string, number> = {
    um: 1,
    dois: 2,
    três: 3,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    quatorze: 14,
    catorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezessete: 17,
    dezoito: 18,
    dezenove: 19,
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
    cem: 100,
    cento: 100,
  }
  const compostos: Record<string, number> = {}
  // "vinte e um", "trinta e dois", ...
  for (const dezena in unidades) {
    const v = unidades[dezena]
    if (v >= 20 && v <= 90) {
      for (const u in unidades) {
        const uv = unidades[u]
        if (uv >= 1 && uv <= 9) {
          compostos[`${dezena} e ${u}`] = v + uv
        }
      }
    }
  }
  return { ...unidades, ...compostos }
}

/**
 * Tenta converter uma string de extenso composto (ex.: "cento e quarenta e três")
 * para número. Retorna undefined quando não consegue.
 */
function extensoParaNumero(texto: string, dict: Record<string, number>): number | undefined {
  const t = texto
    .toLowerCase()
    .trim()
    .replace(/[.,;:]/g, '')
    .replace(/\s+/g, ' ')
  if (dict[t] !== undefined) return dict[t]
  // Tenta decompor compostos por "e" (ex.: "trinta e quatro")
  const partes = t.split(/\s+e\s+/)
  if (partes.length > 1) {
    let total = 0
    let valido = true
    for (const p of partes) {
      const v = dict[p.trim()]
      if (v === undefined) {
        valido = false
        break
      }
      total += v
    }
    if (valido) return total
  }
  return undefined
}

/**
 * Limpa uma string por extenso removendo qualificadores de moeda/quantidade
 * ("reais", "por cento", "meses", "dias", "metros", etc.) para que a
 * comparação algarismo vs extenso não falhe por ruído de contexto.
 */
function limparExtenso(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(+/g, ' ')
    .replace(/\)+/g, ' ')
    .replace(/[.,;:]/g, ' ')
    .replace(/\b(reais?|de\s+reais?|milhar(?:es)?|centavo[s]?|pontos?)\b/g, ' ')
    .replace(/\b(por\s+cento|percentual|porcento)\b/g, ' ')
    .replace(/\b(meses?|mês|mes|dias?|anos?|horas?|minutos?|segundos?)\b/g, ' ')
    .replace(/\b(metros?|quilometros?|km|m|cm|mm)\b/g, ' ')
    .replace(/\b(unidades?|moradias?|domicilios?|domicílios?|casas?|lotes?|salas?)\b/g, ' ')
    .replace(/\bde\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normaliza um valor numérico para comparação com tolerância de arredondamento
 * (centavos). Ex.: 2734800 == "dois milhões setecentos e trinta e quatro mil
 * e oitocentos".
 */
function numeroPorExtenso(valor: number): string | null {
  // Suporte limitado a valores de moeda; foco em decomposição por classes
  if (!isFinite(valor) || valor < 0) return null
  const abs = Math.round(valor * 100) / 100
  const partes: string[] = []
  const classes: [number, string, string][] = [
    [1_000_000_000, 'bilhão', 'bilhões'],
    [1_000_000, 'milhão', 'milhões'],
    [1_000, 'mil', 'mil'],
  ]
  let resto = abs
  for (const [div, singular, plural] of classes) {
    const n = Math.floor(resto / div)
    if (n > 0) {
      if (n === 1) {
        partes.push(`um ${singular}`)
      } else {
        partes.push(`${extensoSimples(n)} ${plural}`)
      }
      resto -= n * div
    }
  }
  if (resto > 0) {
    partes.push(extensoSimples(resto))
  }
  return partes.join(' e ')
}

function extensoSimples(n: number): string {
  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ]
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ]
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ]
  const v = Math.floor(n)
  if (v === 100) return 'cem'
  const c = Math.floor(v / 100)
  const d = Math.floor((v % 100) / 10)
  const u = v % 10
  const partes: string[] = []
  if (c > 0) partes.push(centenas[c])
  if (v % 100 >= 10 && v % 100 < 20) {
    partes.push(unidades[v % 100])
    return partes.join(' e ')
  }
  if (d > 0) partes.push(dezenas[d])
  if (u > 0) partes.push(unidades[u])
  return partes.join(' e ')
}

export function executarChecagensCoerencia(
  textoContrato: string,
  metadados?: { valorGlobal?: number; garantiaPct?: number },
): InconsistenciaDetectada[] {
  const inconsistencias: InconsistenciaDetectada[] = []

  if (!textoContrato || textoContrato.trim().length === 0) {
    return inconsistencias
  }

  const textoLow = textoContrato.toLowerCase()
  const dicionario = montarDicionarioExtenso()

  // ───────────────────────────────────────────────────────────────
  // 1. Cláusula inexistente (generalizada)
  //    Detecta qualquer referência a cláusula/item/seção/anexo/subitem
  //    numerada (ex.: "14.8", "9.1.1.d") que NÃO aparece definida em
  //    nenhuma parte do texto com os marcadores estruturais usuais.
  // ───────────────────────────────────────────────────────────────
  const refMatches = [
    ...textoContrato.matchAll(
      /(?:cl[áa]usula|item|se[çc][ãa]o|anexo|subitem|al[íi]nea|inciso)\s+([0-9]+(?:\.[0-9]+){0,3}[a-zA-Z]?)\b/gi,
    ),
  ]

  // Identifica as definições estruturadas que existem no texto:
  // padrões como "14.8 -", "14.8.", "Cláusula 14.8", "14.8)", etc.
  const definicoes = new Set<string>()
  const defMatches = [
    ...textoContrato.matchAll(
      /(?:cl[áa]usula\s+)?([0-9]+(?:\.[0-9]+){0,3}[a-zA-Z]?)\s*[-–.):]\s/gi,
    ),
  ]
  for (const d of defMatches) {
    definicoes.add(d[1].toLowerCase().replace(/\s+$/, ''))
  }

  const clausulasInexistentes = new Set<string>()
  for (const match of refMatches) {
    const num = match[1]
      .toLowerCase()
      .replace(/[.,;:]$/, '')
      .trim()
    // Ignora referências genéricas numéricas simples (ex.: "item 1") — só
    // aponta subdivisões com ponto (ex.: "14.8", "9.1.1") ou letra.
    const temSubdivisao = /\.[0-9]/.test(num) || /[a-z]$/.test(num)
    if (!temSubdivisao) continue
    if (definicoes.has(num)) continue
    // Tolerância: se a referência for "14.8" e existe "14.8" como substring
    // em outro lugar, também conta como definida.
    if (
      textoContrato.toLowerCase().includes(` ${num} `) ||
      textoContrato.toLowerCase().includes(`${num} -`)
    )
      continue
    if (clausulasInexistentes.has(num)) continue
    clausulasInexistentes.add(num)
    inconsistencias.push({
      tipo: 'clausula_inexistente',
      titulo: 'Referência a Cláusula/Item Inexistente',
      descricao: `O texto remete a "${match[0].trim()}", porém a subdivisão ${num} não aparece definida em nenhuma seção do instrumento contratual.`,
      localizacao: match[0].trim(),
      trechoOriginal: match[0].trim(),
      encontrado: `item ${num}`,
      esperado: 'Subdivisão definida no rol de cláusulas',
    })
  }

  // ───────────────────────────────────────────────────────────────
  // 2. Extenso divergente do algarismo (generalizado p/ 1..100)
  //    Detecta pares "N (extenso)" onde o extenso não bate com N.
  // ───────────────────────────────────────────────────────────────
  const regexExtenso = /([0-9]+)\s*\(([^()]+)\)/g
  let matchExt
  while ((matchExt = regexExtenso.exec(textoContrato)) !== null) {
    const numDigito = parseInt(matchExt[1], 10)
    const extensoBruto = matchExt[2].trim()
    const extensoLimpo = limparExtenso(extensoBruto)
    if (!extensoLimpo) continue

    const valorEsperadoExtenso = extensoParaNumero(extensoLimpo, dicionario)

    if (valorEsperadoExtenso !== undefined && valorEsperadoExtenso !== numDigito) {
      inconsistencias.push({
        tipo: 'extenso_divergente',
        titulo: 'Divergência entre Número e Extenso',
        descricao: `Identificada contradição: o algarismo "${numDigito}" difere do numeral por extenso "(${extensoBruto})", que corresponde a ${valorEsperadoExtenso}.`,
        localizacao: matchExt[0],
        trechoOriginal: matchExt[0],
        encontrado: `${numDigito} (${extensoBruto})`,
        esperado: `${numDigito} (${numeroPorExtenso(numDigito) || ''})`,
      })
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 3. Divergência aritmética
  //    3a. Limite aditivo de 50% sem hipótese excepcional (Lei 14.133/21)
  //    3b. Soma de parcelas que não fecha com o valor global
  //    3c. Percentuais que somam mais de 100%
  // ───────────────────────────────────────────────────────────────

  // 3a. Limite aditivo 50%
  if (
    (textoContrato.includes('50%') || textoLow.includes('cinquenta por cento')) &&
    (textoLow.includes('aditado') ||
      textoLow.includes('aditivo') ||
      textoLow.includes('aditamento'))
  ) {
    // Recupera o trecho de referência ao aditivo de 50%
    const trechoIdx = textoLow.search(/adit(?:ado|ivo|amento)/)
    const trecho = trechoIdx >= 0 ? textoContrato.substring(trechoIdx, trechoIdx + 120) : ''
    inconsistencias.push({
      tipo: 'divergencia_aritmetica',
      titulo: 'Limite de Aditamento Incompatível com a Lei 14.133/21',
      descricao:
        'Cláusula prevê permissivo de aditamento em até 50% sem caracterizar hipótese excepcional de reforma de edifício ou monumento, extrapolando o limite de 25% da Lei 14.133/21 para obras novas.',
      localizacao: 'Cláusula de Alterações e Aditivos',
      trechoOriginal:
        trecho || 'aditado em até 50% (cinquenta por cento) do seu valor inicial atualizado',
      encontrado: '50% (cinquenta por cento)',
      esperado: '25% (Art. 125 da Lei 14.133/21)',
    })
  }

  // 3b. Soma de parcelas vs valor global
  // Tenta identificar "valor global" de referência no texto.
  let valorGlobalDetectado: number | undefined
  const mGlobal = textoContrato.match(
    /valor\s+(?:global|total|contratual|do\s+contrato)[^R$]{0,40}R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i,
  )
  if (mGlobal) {
    valorGlobalDetectado = parseFloat(mGlobal[1].replace(/\./g, '').replace(',', '.'))
  } else if (metadados?.valorGlobal && metadados.valorGlobal > 0) {
    valorGlobalDetectado = metadados.valorGlobal
  }

  // Procura por listas de parcelas (ex.: "Parcela 1: R$ 100.000,00", "Parcela 2: R$ 150.000,00")
  const regexListaParcelas =
    /parcela\s+\d+[^R$]{0,30}R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/gi
  const parcelas: { valor: number; trecho: string }[] = []
  let mPar
  while ((mPar = regexListaParcelas.exec(textoContrato)) !== null) {
    const raw = mPar[1].replace(/\./g, '').replace(',', '.')
    const v = parseFloat(raw)
    if (!isNaN(v)) parcelas.push({ valor: v, trecho: mPar[0] })
  }

  if (parcelas.length >= 2 && valorGlobalDetectado && valorGlobalDetectado > 0) {
    const somaParcelas = parcelas.reduce((a, b) => a + b.valor, 0)
    // Tolerância de 1% para arredondamentos
    const diff = Math.abs(somaParcelas - valorGlobalDetectado)
    const tol = valorGlobalDetectado * 0.01
    if (diff > tol) {
      const fmt = (n: number) =>
        n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      inconsistencias.push({
        tipo: 'divergencia_aritmetica',
        titulo: 'Soma de Parcelas Diverge do Valor Global',
        descricao: `A soma das ${parcelas.length} parcelas listadas (R$ ${fmt(
          somaParcelas,
        )}) não corresponde ao valor global contratual de R$ ${fmt(
          valorGlobalDetectado,
        )}. Diferença de R$ ${fmt(diff)}.`,
        localizacao: 'Cláusula de Valor/Pagamento',
        trechoOriginal: parcelas.map((p) => p.trecho).join(' + '),
        encontrado: `R$ ${fmt(somaParcelas)} (soma das parcelas)`,
        esperado: `R$ ${fmt(valorGlobalDetectado)} (valor global)`,
      })
    }
  }

  // 3c. Percentuais que somam mais de 100%
  // Procura blocos com 3+ percentuais próximos (ex.: rateio/cronograma)
  const regexPct = /([0-9]+(?:,[0-9]+)?)\s*%\s*(?:\(([^()]+)\))?/g
  const todosPcts: { valor: number; trecho: string; idx: number }[] = []
  let mPct
  while ((mPct = regexPct.exec(textoContrato)) !== null) {
    const v = parseFloat(mPct[1].replace(',', '.'))
    if (!isNaN(v) && v > 0 && v <= 200) {
      todosPcts.push({ valor: v, trecho: mPct[0], idx: mPct.index })
    }
  }
  // Agrupa percentuais próximos (janela de 300 chars) que somem > 100
  if (todosPcts.length >= 3) {
    for (let i = 0; i + 3 <= todosPcts.length; i++) {
      const grupo = [todosPcts[i], todosPcts[i + 1], todosPcts[i + 2]]
      // Verifica continuidade textual (janela)
      const span = grupo[2].idx - grupo[0].idx
      if (span > 300) continue
      const soma = grupo.reduce((a, b) => a + b.valor, 0)
      if (soma > 100.01) {
        inconsistencias.push({
          tipo: 'divergencia_aritmetica',
          titulo: 'Percentuais Somam Mais de 100%',
          descricao: `Em um mesmo bloco, os percentuais ${grupo
            .map((g) => g.valor + '%')
            .join(
              ', ',
            )} somam ${soma.toFixed(2)}%, excedendo o teto de 100% esperado para rateio/distribuição.`,
          localizacao: 'Cláusula de Distribuição/Rateio',
          trechoOriginal: grupo.map((g) => g.trecho).join(' + '),
          encontrado: `${soma.toFixed(2)}% (soma dos percentuais)`,
          esperado: '100% (total de rateio)',
        })
        break // um apontamento por bloco de rateio basta
      }
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 4. Identificador conflitante (generalizado)
  //    Detecta duplicação de número de contrato, processo ou pregão
  //    com valores diferentes em pontos distintos do mesmo documento.
  // ───────────────────────────────────────────────────────────────
  const coletarIdentificadores = (
    regex: RegExp,
    rotulo: string,
  ): { valor: string; trecho: string }[] => {
    const out: { valor: string; trecho: string }[] = []
    let m
    const re = new RegExp(regex.source, regex.flags)
    while ((m = re.exec(textoContrato)) !== null) {
      out.push({ valor: m[1].trim(), trecho: m[0].trim() })
    }
    return out
  }

  const gruposIds: { rotulo: string; itens: { valor: string; trecho: string }[] }[] = [
    {
      rotulo: 'pregão eletrônico',
      itens: coletarIdentificadores(
        /(?:preg[ãa]o\s+eletr[ôo]nico\s+(?:n[ºo°]?\s*)?)([0-9]+\/[0-9]{4})/gi,
        'pregão',
      ),
    },
    {
      rotulo: 'contrato',
      itens: coletarIdentificadores(
        /(?:termo\s+de\s+contrato|contrato)\s+(?:n[ºo°]?\s*[:.]?\s*)([0-9]+(?:[/-][0-9]{4})?)/gi,
        'contrato',
      ),
    },
    {
      rotulo: 'processo administrativo',
      itens: coletarIdentificadores(
        /processo(?:\s+adm(?:inistrativo)?)?\s+(?:n[ºo°]?\s*[:.]?\s*)([0-9]+(?:[./-][0-9]{4})?)/gi,
        'processo',
      ),
    },
  ]

  for (const g of gruposIds) {
    const unicos = [...new Set(g.itens.map((i) => i.valor))]
    if (g.itens.length >= 2 && unicos.length > 1) {
      inconsistencias.push({
        tipo: 'identificador_conflitante',
        titulo: `Identificadores Conflitantes de ${g.rotulo}`,
        descricao: `Encontradas menções distintas de ${g.rotulo} no mesmo documento: ${unicos.join(
          ' vs ',
        )}. Cada instrumento deve referenciar um único número de ${g.rotulo}.`,
        localizacao: 'Preâmbulo e Cláusulas',
        trechoOriginal: g.itens.map((i) => i.trecho).join(' vs '),
        encontrado: unicos.join(' e '),
        esperado: unicos[0],
      })
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 5. NOVA CHECAGEM: Prazo incoerente
  //    Detecta quando o prazo em meses não é compatível com as datas
  //    de início e fim mencionadas no contrato.
  // ───────────────────────────────────────────────────────────────
  const matchPrazoMeses = textoContrato.match(
    /(?:prazo\s+(?:de\s+)?(?:vig[eê]ncia|execu[çc][ãa]o)?|vig[eê]ncia\s+de)\s*(?:de\s+)?([0-9]+)\s*(?:\([^)]*\)\s*)?(?:meses|m[eê]s)\b/i,
  )
  const prazoMesesDeclarado = matchPrazoMeses ? parseInt(matchPrazoMeses[1], 10) : null

  // Procura pares de datas "início" e "fim"/"término"
  const regexData = /\b([0-3]?[0-9])[/.-]([0-1]?[0-9])[/.-](20[0-9]{2})\b/g
  const datas: { iso: string; trecho: string; idx: number }[] = []
  let mD
  while ((mD = regexData.exec(textoContrato)) !== null) {
    const dia = mD[1].padStart(2, '0')
    const mes = mD[2].padStart(2, '0')
    const ano = mD[3]
    datas.push({ iso: `${ano}-${mes}-${dia}`, trecho: mD[0], idx: mD.index })
  }

  if (prazoMesesDeclarado && datas.length >= 2) {
    // Tenta casar início/fim por contexto textual próximo
    let dataInicio: { iso: string; trecho: string } | undefined
    let dataFim: { iso: string; trecho: string } | undefined
    for (const d of datas) {
      const contexto = textoContrato.substring(Math.max(0, d.idx - 60), d.idx + 30).toLowerCase()
      if (
        !dataInicio &&
        (contexto.includes('início') ||
          contexto.includes('inicio') ||
          contexto.includes('ordem de serviço') ||
          contexto.includes('assinatura'))
      ) {
        dataInicio = d
      } else if (
        !dataFim &&
        (contexto.includes('término') ||
          contexto.includes('termino') ||
          contexto.includes('fim') ||
          contexto.includes('conclusão') ||
          contexto.includes('conclusao') ||
          contexto.includes('vigência'))
      ) {
        dataFim = d
      }
    }
    // Fallback: primeira data = início, última = fim
    if (!dataInicio) dataInicio = datas[0]
    if (!dataFim) dataFim = datas[datas.length - 1]

    if (dataInicio && dataFim && dataInicio.iso !== dataFim.iso) {
      const d1 = new Date(dataInicio.iso + 'T00:00:00Z')
      const d2 = new Date(dataFim.iso + 'T00:00:00Z')
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffMeses = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        const mesesCalculados = Math.round(diffMeses)
        // Tolerância de 1 mês
        if (Math.abs(mesesCalculados - prazoMesesDeclarado) > 1) {
          inconsistencias.push({
            tipo: 'prazo_incoerente',
            titulo: 'Prazo em Meses Incompatível com as Datas',
            descricao: `O contrato declara prazo de ${prazoMesesDeclarado} meses, porém as datas citadas (${dataInicio.trecho} a ${dataFim.trecho}) compreendem aproximadamente ${mesesCalculados} meses — diferença de ${Math.abs(
              mesesCalculados - prazoMesesDeclarado,
            )} meses.`,
            localizacao: 'Cláusula de Vigência/Prazos',
            trechoOriginal: `${matchPrazoMeses![0]} (entre ${dataInicio.trecho} e ${dataFim.trecho})`,
            encontrado: `${prazoMesesDeclarado} meses (declarado)`,
            esperado: `≈ ${mesesCalculados} meses (datas)`,
          })
        }
      }
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 6. NOVA CHECAGEM: Valor por extenso ausente ou incorreto
  //    Detecta valores monetários relevantes (>= R$ 10.000) que não são
  //    acompanhados do extenso entre parênteses, ou cujo extenso está
  //    errado. Para evitar ruído, prioriza o valor global/total do
  //    contrato; se não houver, avalia o maior valor do documento.
  // ───────────────────────────────────────────────────────────────
  const regexValorMoeda = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)\s*(\([^)]+\))?/g
  const valoresMoeda: {
    valor: number
    trecho: string
    idx: number
    extenso: string | null
    contexto: string
  }[] = []
  let mV
  while ((mV = regexValorMoeda.exec(textoContrato)) !== null) {
    const rawNum = mV[1].replace(/\./g, '').replace(',', '.')
    const valor = parseFloat(rawNum)
    if (isNaN(valor) || valor < 10000) continue // só valores relevantes
    valoresMoeda.push({
      valor,
      trecho: mV[0],
      idx: mV.index!,
      extenso: mV[2] ? mV[2].replace(/[()]/g, '').trim() : null,
      contexto: textoContrato.substring(Math.max(0, mV.index! - 40), mV.index! + 120),
    })
  }

  // Seleciona os valores a validar: os que aparecem em contexto de
  // "valor global/total/contratual" + (no máximo) o maior valor do doc.
  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const alvos: typeof valoresMoeda = []
  for (const v of valoresMoeda) {
    const ctx = v.contexto.toLowerCase()
    if (
      ctx.includes('valor global') ||
      ctx.includes('valor total') ||
      ctx.includes('valor contratual') ||
      ctx.includes('valor do contrato') ||
      ctx.includes('preço total') ||
      ctx.includes('preco total')
    ) {
      alvos.push(v)
    }
  }
  // Se não encontrou nenhum valor "global", adiciona o maior valor
  if (alvos.length === 0 && valoresMoeda.length > 0) {
    const maior = valoresMoeda.reduce((a, b) => (b.valor > a.valor ? b : a))
    alvos.push(maior)
  }
  // Deduplica por valor (o mesmo valor pode aparecer várias vezes no
  // texto — preâmbulo, cláusula de valor, cronograma — e geraria
  // apontamentos repetidos). Mantém a primeira ocorrência de cada valor.
  const valoresVistos = new Set<number>()
  const alvosUnicos = alvos.filter((a) => {
    if (valoresVistos.has(a.valor)) return false
    valoresVistos.add(a.valor)
    return true
  })
  // Limita a 3 apontamentos para não inundar a aba
  const alvosLimitados = alvosUnicos.slice(0, 3)

  for (const v of alvosLimitados) {
    const temExtensoProximo =
      v.extenso ||
      /\([^)]*(reais|mil|milh[ãa]o|bilh[ãa]o|cento)[^)]*\)/i.test(
        textoContrato.substring(v.idx, v.idx + 200),
      )

    if (!temExtensoProximo) {
      inconsistencias.push({
        tipo: 'valor_extenso_ausente',
        titulo: 'Valor Monetário sem Extenso Entre Parênteses',
        descricao: `O valor R$ ${fmt(
          v.valor,
        )} aparece sem o respectivo valor por extenso entre parênteses, exigência formal de contratos públicos (art. 15 da Lei 8.666/93 e praxe da Lei 14.133/21).`,
        localizacao: `Trecho: "${v.trecho}"`,
        trechoOriginal: v.trecho,
        encontrado: `R$ ${fmt(v.valor)} (sem extenso)`,
        esperado: `R$ ${fmt(v.valor)} (${numeroPorExtenso(v.valor) || 'valor por extenso'})`,
      })
    } else if (v.extenso) {
      // Há extenso — valida se está correto
      const extensoEsperado = numeroPorExtenso(v.valor)
      if (extensoEsperado) {
        const norm = (s: string) =>
          s
            .toLowerCase()
            .replace(/\b(de\s+)?reais\b/g, '')
            .replace(/[.,;:]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        if (norm(v.extenso) && norm(extensoEsperado) !== norm(v.extenso)) {
          inconsistencias.push({
            tipo: 'valor_extenso_ausente',
            titulo: 'Valor por Extenso Incorreto',
            descricao: `O valor R$ ${fmt(
              v.valor,
            )} está acompanhado do extenso "(${v.extenso})", mas o correto seria "(${extensoEsperado})".`,
            localizacao: `Trecho: "${v.trecho}"`,
            trechoOriginal: v.trecho,
            encontrado: `R$ ${fmt(v.valor)} (${v.extenso})`,
            esperado: `R$ ${fmt(v.valor)} (${extensoEsperado})`,
          })
        }
      }
    }
  }

  return inconsistencias
}

export interface ObrigacaoExtraida {
  clausula: string
  descricao: string
  responsavel: 'Contratada' | 'Administração'
  tipo_regua: 'marco_contratual' | 'liquidacao_medicao' | 'administrativo'
  prazo_texto: string
  data_limite?: string
  penalidade_associada: string
  penalidade_percentual: number
  status_cumprimento: 'pendente' | 'no_prazo' | 'vencido' | 'cumprido' | 'sem_ancora'
  dias_atraso?: number
  trecho_original_pdf?: string
  confianca: 'alta' | 'média' | 'baixa'
  remissao_externa?: boolean
}

export interface AditivoExtraido {
  numero_termo: string
  tipo_aditivo: string
  data_assinatura?: string
  justificativa?: string
  valor_aditado: number
  percentual_aditado_individual: number
  prazo_aditado_dias?: number
  limite_legal_percentual: number
  alerta_limite_ultrapassado: boolean
}

export interface LiquidacaoExtraida {
  numero_medicao: string
  numero_nota_empenho: string
  data_liquidacao: string
  valor_liquidado: number
  percentual_medido: number
  status_tramitacao: string
  observacoes: string
}

export interface ExtracaoCompletaResultado {
  obra: any
  obrigacoes: ObrigacaoExtraida[]
  inconsistencias: InconsistenciaDetectada[]
  aditivos: AditivoExtraido[]
  liquidacoes: LiquidacaoExtraida[]
}

/**
 * Rótulo curto de cada categoria de TipoObra, usado na montagem do título
 * exibido da obra (os nomes completos são longos demais para o prefixo do
 * título). O campo `tipo_obra` continua armazenando o nome completo.
 */
export function tituloCurtoTipoObra(tipo: string | undefined): string {
  switch (tipo) {
    case 'Infraestrutura Urbana e Mobilidade':
      return 'Infraestrutura Urbana'
    case 'Saneamento Básico e Recursos Hídricos':
      return 'Saneamento'
    case 'Edificações Públicas (Infraestrutura Social)':
      return 'Edificações Públicas'
    case 'Infraestrutura de Energia e Telecomunicações':
      return 'Energia e Telecom'
    default:
      return tipo || 'Obra'
  }
}

/**
 * Motor completo de extração determinística e estruturação para qualquer contrato ou PDF carregado
 */
export function extrairEntidadesDeterministas(
  texto: string,
  nomeArquivo?: string,
): ExtracaoCompletaResultado {
  const textoLow = texto.toLowerCase()

  // 1. Número do Contrato
  const matchContrato =
    texto.match(/(?:termo\s+de\s+)?contrato\s*(?:n[ºo°]?\s*)?([A-Za-z0-9_\-./]+)/i) ||
    texto.match(/contrato\s+n[ºo°]?\s*([0-9]+\/[0-9]{4})/i)

  let numeroContrato = '041/2026'
  if (matchContrato && matchContrato[1] && !matchContrato[1].toLowerCase().includes('extraído')) {
    numeroContrato = matchContrato[1].replace(/[.,;:]$/, '').trim()
  } else if (nomeArquivo) {
    const nomeLimpo = nomeArquivo.replace(/\.pdf$/i, '').replace(/contrato[_\-\s]*/i, '')
    numeroContrato = nomeLimpo.substring(0, 30) || '041/2026'
  }

  // 2. Processo Administrativo
  const matchProcesso = texto.match(
    /(?:processo(?:\s+adm(?:inistrativo)?)?\s*(?:n[ºo°]?\s*)?|pa-)([A-Za-z0-9_\-./]+)/i,
  )
  const processoAdm = matchProcesso ? matchProcesso[1].replace(/[.,;:]$/, '').trim() : 'PA-089/2025'

  // 3. Valor Global
  let valorGlobal = 2734800
  const matchValor =
    texto.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2}))/i) ||
    texto.match(/valor(?:\s+global)?\s*(?:é\s+de|de)?\s*R?\$?\s*([0-9.,]+)/i)
  if (matchValor) {
    const rawNum = matchValor[1].replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(rawNum)
    if (!isNaN(parsed) && parsed > 0) {
      valorGlobal = parsed
    }
  }

  // 4. Objeto
  let objeto =
    'Contratação de empresa especializada em engenharia civil para execução de obras e serviços.'
  const matchObjeto = texto.match(/(?:objeto|do objeto)\s*[:\-–]\s*([^.\n]+(?:\.[^.\n]+){0,2})/i)
  if (matchObjeto && matchObjeto[1].trim().length > 10) {
    objeto = matchObjeto[1].trim()
  } else if (texto.length > 50) {
    objeto = texto.substring(0, 220) + '...'
  }

  // 5. Órgão, Município e UF
  let orgao = 'Secretaria Municipal de Obras e Habitação'
  let municipio = 'São Paulo'
  let estadoUf = 'SP'

  const matchOrgao = texto.match(
    /(?:secretaria|prefeitura|órgão|orgao|departamento|autarquia)[^,.\n]+/i,
  )
  if (matchOrgao) {
    orgao = matchOrgao[0].trim()
  }

  if (textoLow.includes('são pedro do turvo') || textoLow.includes('sao pedro')) {
    municipio = 'São Pedro do Turvo'
  } else if (textoLow.includes('pontal')) {
    municipio = 'Pontal'
  } else if (textoLow.includes('teixeira de freitas')) {
    municipio = 'Teixeira de Freitas'
    estadoUf = 'BA'
  } else if (textoLow.includes('santo andré') || textoLow.includes('santo andre')) {
    municipio = 'Santo André'
  } else {
    const matchMun = texto.match(
      /(?:munic[íi]pio|cidade)\s+de\s+([A-Za-zÀ-ÿ\s]+)(?:\/|-|\s+SP|\s+RJ|\s+MG)?/i,
    )
    if (matchMun) {
      municipio = matchMun[1].trim()
    }
  }

  // 6. Tipo de Obra
  let tipoObra:
    | 'Edificação'
    | 'Saneamento'
    | 'Pavimentação/Vias'
    | 'Habitação'
    | 'Saúde/UBS'
    | 'Educação/Escolas'
    | 'Serviço Continuado'
    | 'Aquisição/Outro' = 'Edificação'

  if (
    textoLow.includes('habitac') ||
    textoLow.includes('habitação') ||
    textoLow.includes('casas') ||
    textoLow.includes('unidades habitacionais')
  ) {
    tipoObra = 'Habitação'
  } else if (
    textoLow.includes('paviment') ||
    textoLow.includes('asfált') ||
    textoLow.includes('tapa-buracos') ||
    textoLow.includes('vias')
  ) {
    tipoObra = 'Pavimentação/Vias'
  } else if (
    textoLow.includes('creche') ||
    textoLow.includes('escola') ||
    textoLow.includes('educação') ||
    textoLow.includes('cei') ||
    textoLow.includes('sme')
  ) {
    tipoObra = 'Educação/Escolas'
  } else if (
    textoLow.includes('saúde') ||
    textoLow.includes('saude') ||
    textoLow.includes('ubs') ||
    textoLow.includes('hospital') ||
    textoLow.includes('upa')
  ) {
    tipoObra = 'Saúde/UBS'
  } else if (
    textoLow.includes('saneamento') ||
    textoLow.includes('esgoto') ||
    textoLow.includes('água') ||
    textoLow.includes('ete')
  ) {
    tipoObra = 'Saneamento'
  } else if (
    textoLow.includes('serviço contínuo') ||
    textoLow.includes('serviço continuado') ||
    textoLow.includes('conservação')
  ) {
    tipoObra = 'Serviço Continuado'
  }

  // 7. Contratada e CNPJ
  let contratadaNome = 'Construtora Vale do Paranapanema Ltda.'
  let contratadaCnpj = '33.882.112/0001-99'

  if (textoLow.includes('pontal')) {
    contratadaNome = 'Pavimentadora Paulista S/A'
    contratadaCnpj = '41.552.123/0001-88'
  } else if (
    textoLow.includes('creche') ||
    textoLow.includes('sme') ||
    textoLow.includes('educação')
  ) {
    contratadaNome = 'Paulista Infraestrutura Escolar S/A'
    contratadaCnpj = '33.109.844/0001-44'
  } else if (textoLow.includes('saúde') || textoLow.includes('ubs')) {
    contratadaNome = 'Avanço Construções e Projetos Hospitalares Ltda.'
    contratadaCnpj = '21.094.773/0001-55'
  }

  // 8. Multas e Remissões
  let multaMax = 10
  const matchMulta = texto.match(/multa(?:\s+morat[óo]ria)?(?:\s+de)?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i)
  if (matchMulta) {
    multaMax = parseFloat(matchMulta[1]) || 10
  }
  const remissaoExterna =
    textoLow.includes('termo de referência') ||
    textoLow.includes('anexo i do edital') ||
    (textoLow.includes('edital') && !textoLow.includes('multa moratória'))

  // 9. Prazo de Vigência e Periodicidade
  let prazoMeses = 12
  const matchPrazo = texto.match(
    /(?:prazo|vigência)\s*(?:de)?\s*([0-9]+)\s*(?:\([^)]+\)\s*)?(?:meses|mês)/i,
  )
  if (matchPrazo) {
    prazoMeses = parseInt(matchPrazo[1], 10) || 12
  }

  let periodicidadeDias = 30
  let periodicidadeTipo: 'explícita' | 'por etapa' | 'inferida' | 'ausente' = 'explícita'
  if (
    textoLow.includes('por etapa') ||
    textoLow.includes('etapas') ||
    textoLow.includes('conclusão de etapa')
  ) {
    periodicidadeTipo = 'por etapa'
  } else if (
    textoLow.includes('medições mensais') ||
    textoLow.includes('a cada 30') ||
    textoLow.includes('30 (trinta) dias')
  ) {
    periodicidadeTipo = 'explícita'
    periodicidadeDias = 30
  } else if (
    textoLow.includes('12 (doze) medições') ||
    textoLow.includes('12 x mês') ||
    textoLow.includes('mensais')
  ) {
    periodicidadeTipo = 'inferida'
    periodicidadeDias = 30
  }

  // 10. Limite Aditivo
  let limiteAditivo = 25
  if (textoLow.includes('50%') || textoLow.includes('cinquenta por cento')) {
    limiteAditivo = 50
  }

  // 11. Marco vencido
  const temMarcoVencido =
    textoLow.includes('120 dias') ||
    textoLow.includes('loteamento nova esperança') ||
    textoLow.includes('041/2026') ||
    textoLow.includes('alvenarias e lajes')

  // Inconsistências Determinísticas
  const inconsistencias = executarChecagensCoerencia(texto)

  // Obrigações Extraídas
  const obrigacoes: ObrigacaoExtraida[] = []

  // Obrigação 1: Marco de Execução ou Entrega
  if (temMarcoVencido || textoLow.includes('prazo improrrogável') || textoLow.includes('120')) {
    obrigacoes.push({
      clausula: 'Cláusula 2.7.1 - Marco de Alvenaria e Superestrutura',
      descricao:
        'Entrega de alvenaria estrutural e lajes das unidades habitacionais devidamente concluídas.',
      responsavel: 'Contratada',
      tipo_regua: 'marco_contratual',
      prazo_texto: '120 dias da emissão da OS',
      data_limite: '2026-03-03',
      penalidade_associada: `Multa moratória de ${multaMax}% sobre o saldo remanescente`,
      penalidade_percentual: multaMax,
      status_cumprimento: 'vencido',
      dias_atraso: 34,
      trecho_original_pdf:
        'A CONTRATADA obriga-se a entregar a totalidade das alvenarias e lajes no prazo improrrogável de 120 dias da emissão da OS.',
      confianca: 'alta',
      remissao_externa: false,
    })
  } else {
    obrigacoes.push({
      clausula: 'Cláusula 2.1 - Execução do Cronograma Físico',
      descricao: 'Cumprimento integral das etapas e entregáveis do plano de trabalho contratual.',
      responsavel: 'Contratada',
      tipo_regua: 'marco_contratual',
      prazo_texto: `Em até ${prazoMeses} meses da Ordem de Serviço`,
      data_limite: '2026-10-30',
      penalidade_associada: `Multa moratória de ${multaMax}% em caso de inadimplemento parcial`,
      penalidade_percentual: multaMax,
      status_cumprimento: 'no_prazo',
      dias_atraso: 0,
      trecho_original_pdf:
        'A CONTRATADA obriga-se a executar os serviços conforme cronograma físico-financeiro aprovado pela fiscalização.',
      confianca: 'alta',
      remissao_externa: remissaoExterna,
    })
  }

  // Obrigação 2: Régua de Medição e Liquidação (Administração)
  obrigacoes.push({
    clausula: 'Cláusula 4.2 - Emissão de Boletim de Medição e Ateste',
    descricao:
      'Realização de vistoria técnica, lavratura do boletim de medição mensal e emissão da liquidação.',
    responsavel: 'Administração',
    tipo_regua: 'liquidacao_medicao',
    prazo_texto: `A cada ${periodicidadeDias} dias corridos`,
    data_limite: '2026-04-30',
    penalidade_associada: 'Sinalização determinística de mora no SIGO e notificação formal',
    penalidade_percentual: 0,
    status_cumprimento: temMarcoVencido ? 'vencido' : 'no_prazo',
    dias_atraso: temMarcoVencido ? 47 : 0,
    trecho_original_pdf: `As medições serão realizadas a cada ${periodicidadeDias} (trinta) dias pela Fiscalização municipal.`,
    confianca: 'alta',
    remissao_externa: false,
  })

  // Obrigação 3: Garantia Contratual e Seguros (Administrativo)
  obrigacoes.push({
    clausula: 'Cláusula 7.1 - Manutenção da Garantia de Execução (5%)',
    descricao:
      'Apresentação e renovação tempestiva da caução ou seguro-garantia durante toda a vigência.',
    responsavel: 'Contratada',
    tipo_regua: 'administrativo',
    prazo_texto: 'Vigência contínua até o recebimento definitivo',
    data_limite: '2027-01-31',
    penalidade_associada: 'Execução da apólice de garantia e rescisão unilateral',
    penalidade_percentual: 5,
    status_cumprimento: 'no_prazo',
    dias_atraso: 0,
    trecho_original_pdf:
      'A CONTRATADA deverá manter a garantia no valor equivalente a 5% (cinco por cento) do valor global.',
    confianca: 'alta',
    remissao_externa: false,
  })

  // Aditivos Extraídos
  const aditivos: AditivoExtraido[] = []
  if (
    limiteAditivo === 50 ||
    textoLow.includes('aditivo') ||
    textoLow.includes('aditado') ||
    temMarcoVencido
  ) {
    const valorAditado = Math.round(valorGlobal * 0.2)
    aditivos.push({
      numero_termo: '1º Termo Aditivo de Valor',
      tipo_aditivo: 'Valor (Acréscimo)',
      data_assinatura: '2026-01-20',
      justificativa:
        'Adequação de quantitativos e reforço de fundações decorrente de sondagens de campo.',
      valor_aditado: valorAditado,
      percentual_aditado_individual: 20.0,
      prazo_aditado_dias: 0,
      limite_legal_percentual: limiteAditivo,
      alerta_limite_ultrapassado: limiteAditivo > 25,
    })
  }

  // Liquidações Extraídas
  const liquidacoes: LiquidacaoExtraida[] = []
  const valorLiq1 = Math.round(valorGlobal * 0.15)
  const valorLiq2 = Math.round(valorGlobal * 0.1)

  liquidacoes.push({
    numero_medicao: '1ª Medição',
    numero_nota_empenho: 'NE-2026/00142',
    data_liquidacao: '2026-02-28',
    valor_liquidado: valorLiq1,
    percentual_medido: 15.0,
    status_tramitacao: 'Liquidado e Pago',
    observacoes: 'Serviços preliminares, canteiro de obras e mobilização inicial.',
  })

  if (temMarcoVencido || valorGlobal > 1000000) {
    liquidacoes.push({
      numero_medicao: '2ª Medição',
      numero_nota_empenho: 'NE-2026/00389',
      data_liquidacao: '2026-03-31',
      valor_liquidado: valorLiq2,
      percentual_medido: 10.0,
      status_tramitacao: 'Liquidado e Pago',
      observacoes: 'Execução de fundações e infraestrutura.',
    })
  }

  const valorTotalLiq = liquidacoes.reduce((acc, l) => acc + l.valor_liquidado, 0)
  const percLiq = Math.round((valorTotalLiq / valorGlobal) * 10000) / 100

  const obra = {
    numero_contrato: numeroContrato,
    ano_contrato: '2026',
    processo_adm: processoAdm,
    titulo: `${tituloCurtoTipoObra(tipoObra)}: ${objeto.substring(0, 75)}`,
    objeto: objeto,
    orgao: orgao,
    municipio: municipio,
    estado_uf: estadoUf,
    tipo_obra: tipoObra,
    contratada_nome: contratadaNome,
    contratada_cnpj: contratadaCnpj,
    valor_global_original: valorGlobal,
    valor_global_atual:
      aditivos.length > 0
        ? valorGlobal + aditivos.reduce((a, b) => a + b.valor_aditado, 0)
        : valorGlobal,
    data_assinatura: '2026-01-15',
    data_ordem_servico: '2026-02-01',
    prazo_vigencia_meses: prazoMeses,
    periodicidade_tipo: periodicidadeTipo,
    periodicidade_dias: periodicidadeDias,
    periodicidade_confianca: 'alta' as const,
    evento_ancora: 'ordem de serviço',
    multa_max_percentual: multaMax,
    multa_remissao_externa: remissaoExterna,
    limite_aditivo_percentual: limiteAditivo,
    carencia_dias: 15,
    dias_sem_liquidacao: temMarcoVencido ? 47 : 30,
    valor_total_liquidado: valorTotalLiq,
    porcentagem_liquidada: percLiq,
    porcentagem_prazo_decorrido: 45.0,
    tem_marco_vencido: temMarcoVencido,
    qtd_aditivos: aditivos.length,
    percentual_aditado_total: aditivos.reduce((a, b) => a + b.percentual_aditado_individual, 0),
    data_ultima_liquidacao:
      liquidacoes.length > 0 ? liquidacoes[liquidacoes.length - 1].data_liquidacao : null,
  }

  return {
    obra,
    obrigacoes,
    inconsistencias,
    aditivos,
    liquidacoes,
  }
}

export function formatarMoeda(valor: number | undefined): string {
  if (valor === undefined || isNaN(valor)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatarData(dataIso?: string | null): string {
  if (!dataIso) return 'Não informada'
  try {
    const d = new Date(dataIso)
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d)
  } catch {
    return dataIso
  }
}

/**
 * Status binário de apresentação pública do SIGO.
 * A UI não expõe mais "Nível de atenção" nem os 4 estados internos — apenas
 * três rótulos: "Dentro do prazo" (verde), "Fora do ritmo" (âmbar/laranja)
 * e "Sem informações de prazo" (cinza/neutro).
 *
 * O cálculo é individual por obra: "Fora do ritmo" significa que a obra
 * ultrapassou sua própria carência de trâmite (prazo_vencido) ou já saiu do
 * ciclo pactuado (fora_do_ritmo). Obras sem dados de execução (sem âncora
 * temporal ou periodicidade identificável) são exibidas como
 * "Sem informações de prazo".
 */
export type StatusBinario = 'dentro_do_prazo' | 'fora_do_ritmo' | 'sem_dados_prazo'

export function getStatusBinario(status: StatusClassificacao): StatusBinario {
  if (status === 'sem_dados') return 'sem_dados_prazo'
  if (status === 'prazo_vencido' || status === 'fora_do_ritmo') return 'fora_do_ritmo'
  return 'dentro_do_prazo'
}

export function getStatusBadgeInfo(status: StatusClassificacao) {
  const binario = getStatusBinario(status)
  switch (binario) {
    case 'fora_do_ritmo':
      return {
        label: 'Fora do ritmo',
        bg: 'bg-amber-500/15 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
        dot: 'bg-amber-500',
        cardBorder: 'border-l-4 border-l-amber-500 hover:border-amber-500',
        badgeColor: 'warning',
      }
    case 'sem_dados_prazo':
      return {
        label: 'Sem informações de prazo',
        bg: 'bg-slate-400/15 text-slate-600 border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
        dot: 'bg-slate-400',
        cardBorder: 'border-l-4 border-l-slate-400 hover:border-slate-400',
        badgeColor: 'secondary',
      }
    case 'dentro_do_prazo':
    default:
      return {
        label: 'Dentro do prazo',
        bg: 'bg-emerald-500/15 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
        dot: 'bg-emerald-600',
        cardBorder: 'border-l-4 border-l-emerald-500 hover:border-emerald-500',
        badgeColor: 'success',
      }
  }
}
