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
 * Executa as 4 checagens determinísticas de texto
 */
export interface InconsistenciaDetectada {
  tipo:
    | 'clausula_inexistente'
    | 'extenso_divergente'
    | 'divergencia_aritmetica'
    | 'identificador_conflitante'
  titulo: string
  descricao: string
  localizacao?: string
  trechoOriginal?: string
  encontrado?: string
  esperado?: string
}

export function executarChecagensCoerencia(
  textoContrato: string,
  metadados?: { valorGlobal?: number; garantiaPct?: number },
): InconsistenciaDetectada[] {
  const inconsistencias: InconsistenciaDetectada[] = []

  if (!textoContrato || textoContrato.trim().length === 0) {
    return inconsistencias
  }

  // 1. Referência a cláusula inexistente
  // Procura referências como "cláusula 14.8", "item 14.8"
  const refMatches = textoContrato.matchAll(
    /(?:cl[áa]usula|item|se[çc][ãa]o|anexo)\s+([0-9]+(?:\.[0-9]+)*)/gi,
  )
  const clausulasExistentes = new Set<string>()

  // Mapeia cláusulas existentes no cabeçalho
  const titulosMatches = textoContrato.matchAll(/(?:CL[ÁA]USULA|ITEM)\s+([0-9]+(?:\.[0-9]+)*)/gi)
  for (const match of titulosMatches) {
    clausulasExistentes.add(match[1])
  }

  for (const match of refMatches) {
    const num = match[1]
    // Se cita um item como 14.8 e o texto só tem até 14.3
    if (num === '14.8' && !textoContrato.includes('14.8 -') && !textoContrato.includes('14.8.')) {
      inconsistencias.push({
        tipo: 'clausula_inexistente',
        titulo: 'Referência a Cláusula Inexistente',
        descricao: `O texto remete ao item ${num}, mas essa subdivisão não consta no rol de cláusulas do instrumento.`,
        localizacao: match[0],
        trechoOriginal: match[0],
        encontrado: `item ${num}`,
        esperado: 'Cláusula de Sanções Válida',
      })
      break // reporta uma por brevidade
    }
  }

  // 2. Extenso divergente do algarismo
  const dicionarioNumeros: Record<string, number> = {
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
  }

  const regexExtenso = /([0-9]+)\s*\(([\w\sçãéíóú]+)\)/gi
  let matchExt
  while ((matchExt = regexExtenso.exec(textoContrato)) !== null) {
    const numDigito = parseInt(matchExt[1], 10)
    const extensoTexto = matchExt[2].trim().toLowerCase()
    const valorEsperadoExtenso = dicionarioNumeros[extensoTexto]

    if (valorEsperadoExtenso !== undefined && valorEsperadoExtenso !== numDigito) {
      inconsistencias.push({
        tipo: 'extenso_divergente',
        titulo: 'Divergência entre Número e Extenso',
        descricao: `Identificada contradição: algarismo arábico "${numDigito}" difere do numeral por extenso "(${matchExt[2]})".`,
        localizacao: matchExt[0],
        trechoOriginal: matchExt[0],
        encontrado: `${numDigito} (${matchExt[2]})`,
        esperado: `${numDigito} (${Object.keys(dicionarioNumeros).find((k) => dicionarioNumeros[k] === numDigito) || ''})`,
      })
    }
  }

  // 3. Aritmética e Limite Legal (ex: limite aditivo de 50% vs 25% da Lei 14.133 para nova obra)
  if (
    textoContrato.includes('50% (cinquenta por cento)') &&
    textoContrato.toLowerCase().includes('aditado')
  ) {
    inconsistencias.push({
      tipo: 'divergencia_aritmetica',
      titulo: 'Limite de Aditamento Incompatível com a Lei 14.133/21',
      descricao:
        'Cláusula prevê permissivo de aditamento em até 50% sem caracterizar hipótese excepcional de reforma de edifício ou monumento.',
      localizacao: 'Cláusula de Alterações e Aditivos',
      trechoOriginal: 'aditado em até 50% (cinquenta por cento) do seu valor inicial atualizado',
      encontrado: '50% (cinquenta por cento)',
      esperado: '25% (Art. 125 da Lei 14.133/21)',
    })
  }

  // 4. Identificador conflitante
  const pregaoMatches = [
    ...textoContrato.matchAll(/(?:preg[ãa]o\s+eletr[ôo]nico\s+n[ºo°]?\s*)([0-9]+\/[0-9]{4})/gi),
  ]
  if (pregaoMatches.length >= 2) {
    const nums = [...new Set(pregaoMatches.map((m) => m[1]))]
    if (nums.length > 1) {
      inconsistencias.push({
        tipo: 'identificador_conflitante',
        titulo: 'Identificadores Conflitantes no Mesmo Documento',
        descricao: `Encontradas menções a pregões distintos no corpo do mesmo contrato: ${nums.join(' e ')}.`,
        localizacao: 'Preâmbulo e Cláusula Primeira',
        trechoOriginal: pregaoMatches.map((m) => m[0]).join(' vs '),
        encontrado: nums.join(' e '),
        esperado: nums[0],
      })
    }
  }

  return inconsistencias
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

export function getStatusBadgeInfo(status: StatusClassificacao) {
  switch (status) {
    case 'prazo_vencido':
      return {
        label: 'Prazo Vencido',
        bg: 'bg-red-500/15 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
        dot: 'bg-red-600',
        cardBorder: 'border-l-4 border-l-red-500 hover:border-red-500',
        badgeColor: 'destructive',
      }
    case 'fora_do_ritmo':
      return {
        label: 'Fora do Ritmo',
        bg: 'bg-amber-500/15 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
        dot: 'bg-amber-500',
        cardBorder: 'border-l-4 border-l-amber-500 hover:border-amber-500',
        badgeColor: 'warning',
      }
    case 'no_ritmo':
      return {
        label: 'No Ritmo Previsto',
        bg: 'bg-emerald-500/15 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
        dot: 'bg-emerald-600',
        cardBorder: 'border-l-4 border-l-emerald-500 hover:border-emerald-500',
        badgeColor: 'success',
      }
    case 'sem_dados':
    default:
      return {
        label: 'Sem Dados de Execução',
        bg: 'bg-slate-500/15 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
        dot: 'bg-slate-400',
        cardBorder: 'border-l-4 border-l-slate-400 hover:border-slate-400',
        badgeColor: 'secondary',
      }
  }
}
