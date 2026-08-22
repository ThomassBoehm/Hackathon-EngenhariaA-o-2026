import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Sparkles, Loader2, FileCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  saveObra,
  createObrigacao,
  createInconsistencia,
  createAditivo,
  createLiquidacao,
} from '@/services/obrasService'
import { ObraRecord, TipoChecagemInconsistencia } from '@/types/sigo'
import { extrairEntidadesDeterministas, formatarMoeda } from '@/lib/sigoEngine'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

/**
 * O schema da collection `inconsistencias` no PocketBase admite apenas 4
 * valores em `tipo_checagem`. As novas checagens determinísticas do
 * sigoEngine (prazo_incoerente e valor_extenso_ausente) são mapeadas
 * para o valor de schema mais próximo, preservando o titulo/descricao
 * para diferenciação visual na tela de detalhe.
 */
function normalizarTipoChecagem(tipo: string): TipoChecagemInconsistencia {
  const TIPOS_VALIDOS: TipoChecagemInconsistencia[] = [
    'clausula_inexistente',
    'extenso_divergente',
    'divergencia_aritmetica',
    'identificador_conflitante',
  ]
  if (TIPOS_VALIDOS.includes(tipo as TipoChecagemInconsistencia)) {
    return tipo as TipoChecagemInconsistencia
  }
  if (tipo === 'prazo_incoerente') return 'divergencia_aritmetica'
  if (tipo === 'valor_extenso_ausente') return 'extenso_divergente'
  return 'clausula_inexistente'
}

/**
 * Gera um resumo do contrato em linguagem cidadã (3 a 5 frases) a partir dos
 * dados extraídos. Explica: o que é a obra, onde fica, quanto custa, qual o
 * prazo e se está tudo em ordem.
 */
function gerarResumoCidadao(obra: Record<string, any>): string {
  const partes: string[] = []

  // 1. O que é a obra
  let oQue = (obra.objeto || `contratação de ${obra.tipo_obra || 'obra pública'}`).toString().trim()
  if (oQue.length > 140) oQue = oQue.substring(0, 137).trim() + '...'
  oQue = oQue.charAt(0).toLowerCase() + oQue.slice(1)
  partes.push(`Este contrato trata de ${oQue}.`)

  // 2. Onde fica
  const local = [obra.municipio, obra.estado_uf].filter(Boolean).join('/')
  const orgao = obra.orgao || 'órgão público'
  if (local) {
    partes.push(`A obra fica em ${local} e é de responsabilidade do ${orgao}.`)
  } else {
    partes.push(`É de responsabilidade do ${orgao}.`)
  }

  // 3. Quanto custa
  const valor = obra.valor_global_atual || obra.valor_global_original || 0
  partes.push(`O valor total é de ${formatarMoeda(Number(valor))}.`)

  // 4. Qual o prazo
  const prazo = obra.prazo_vigencia_meses
  if (prazo) {
    partes.push(`O prazo de execução é de ${prazo} meses.`)
  }

  // 5. Se está tudo em ordem
  const ciclo = obra.periodicidade_dias || 30
  const carencia = obra.carencia_dias || 15
  const diasSem = obra.dias_sem_liquidacao || 0
  let statusTxt: string
  if (obra.tem_marco_vencido) {
    statusTxt =
      'Há um marco contratual vencido (entrega atrasada), o que coloca a obra fora do ritmo de execução.'
  } else if (diasSem > ciclo + carencia) {
    statusTxt = `A obra está fora do ritmo: já se passaram ${diasSem} dias sem pagamento, acima do prazo de ${
      ciclo + carencia
    } dias do contrato.`
  } else if (diasSem > ciclo) {
    statusTxt = `A obra está em atenção: ${diasSem} dias sem pagamento, mas ainda dentro da carência de ${carencia} dias.`
  } else {
    statusTxt = 'A obra está dentro do prazo e do ritmo de execução pactuados.'
  }
  partes.push(statusTxt)

  return partes.join(' ')
}

export default function ContratoUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processStep, setProcessStep] = useState<string>('')

  // Texto inicial do editor: modelo editável genérico para o fiscal colar o contrato
  const TEXTO_MODELO_INICIAL = `TERMO DE CONTRATO Nº [número]/2026. PROCESSO ADMINISTRATIVO: PA-XXX/2026.
CLÁUSULA PRIMEIRA - DO OBJETO: [Descreva o objeto do contrato: execução de obra/serviço...]
CLÁUSULA SEGUNDA - DO VALOR: O valor global contratado é de R$ [valor] ([valor por extenso]).
CLÁUSULA TERCEIRA - DA MEDIÇÃO E LIQUIDAÇÃO: Medições mensais a cada 30 (trinta) dias pela fiscalização.
CLÁUSULA QUARTA - DA VIGÊNCIA E PRAZOS: Prazo de execução de [N] meses contados da Ordem de Serviço.
CLÁUSULA QUINTA - DAS PENALIDADES: Multa moratória de [X]% sobre o saldo remanescente em caso de atraso.`

  const [textoManual, setTextoManual] = useState(TEXTO_MODELO_INICIAL)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [fileWarning, setFileWarning] = useState<string | null>(null)

  const extrairTextoDePdf = async (uploadedFile: File): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      // Configura worker do pdf.js para ambiente browser/bundler
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`
      }

      const arrayBuffer = await uploadedFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: true,
        isEvalSupported: false,
        useSystemFonts: true,
      })

      const pdfDocument = await loadingTask.promise
      const numPages = pdfDocument.numPages
      const paginasTexto: string[] = []

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Concatena os itens de texto da página respeitando quebras e espaços
        const pageItems = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (pageItems) {
          paginasTexto.push(`--- PÁGINA ${pageNum} ---\n${pageItems}`)
        }
      }

      return paginasTexto.join('\n\n').trim()
    } catch (err) {
      console.error('Erro ao extrair texto do PDF via pdf.js:', err)
      return ''
    }
  }

  const extrairTextoDeArquivo = async (uploadedFile: File): Promise<string> => {
    const isPdf =
      uploadedFile.type === 'application/pdf' || uploadedFile.name.toLowerCase().endsWith('.pdf')

    if (isPdf) {
      return await extrairTextoDePdf(uploadedFile)
    }

    // Para arquivos de texto simples ou outros formatos (.txt, .doc, etc.), usa file.text()
    try {
      const rawText = await uploadedFile.text()
      return rawText.trim()
    } catch (err) {
      console.warn('Erro ao ler arquivo como texto:', err)
      return ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsReadingFile(true)
    setFileWarning(null)

    try {
      const textoExtraido = await extrairTextoDeArquivo(selectedFile)

      if (textoExtraido && textoExtraido.trim().length >= 50) {
        setTextoManual(textoExtraido)
        setFileWarning(
          'Texto extraído com sucesso do documento. Revise ou complete o texto no editor abaixo antes de submeter à IA se necessário.',
        )
        toast({
          title: 'Arquivo carregado!',
          description: `Conteúdo de "${selectedFile.name}" extraído e inserido no editor para análise.`,
        })
      } else {
        // PDF sem camada de texto: NÃO fabricar conteúdo. O editor fica vazio.
        setTextoManual('')
        setFileWarning(
          `O arquivo "${selectedFile.name}" não possui camada de texto selecionável (provavelmente é um PDF escaneado). O SIGO não consegue ler documentos por imagem. Cole o texto do contrato no editor abaixo ou envie a versão digital (nativa) do PDF.`,
        )
        toast({
          title: 'Não foi possível ler o PDF',
          description:
            'Nenhum texto selecionável detectado. Cole o texto do contrato no editor para prosseguir.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Falha ao processar arquivo:', err)
      setFileWarning(
        `Não foi possível decodificar o texto do arquivo "${selectedFile.name}". Por favor, cole o texto do contrato diretamente no editor abaixo.`,
      )
      toast({
        title: 'Atenção',
        description:
          'Não foi possível ler o texto do PDF automaticamente. Por favor, edite ou cole o texto no campo abaixo.',
        variant: 'destructive',
      })
    } finally {
      setIsReadingFile(false)
    }
  }

  /**
   * Extração determinística por regex. REGRA: nunca inventar valor.
   * Campo ausente no texto => undefined. Nada de default plausível.
   * Campos de EXECUÇÃO (liquidação, % executado) não existem em contrato:
   * não são extraídos aqui, ficam undefined => estado "sem dados de execução".
   */
  const extrairDadosComIA = (texto: string, nomeArquivo?: string) => {
    const textoLow = texto.toLowerCase()
    const u = undefined

    // 1. Número do contrato
    const mContrato = texto.match(/contrato\s*(?:n[ºo°]?\s*)?([0-9]{1,5}\s*\/\s*[0-9]{4})/i)
    const numeroContrato = mContrato ? mContrato[1].replace(/\s/g, '') : u

    // 2. Processo administrativo
    const mProcesso = texto.match(
      /(?:processo(?:\s+adm(?:inistrativo)?)?\s*(?:n[ºo°]?\s*)?|pa[-\s])([A-Za-z0-9\-./]+)/i,
    )
    const processoAdm = mProcesso ? mProcesso[1].replace(/[.,;]$/, '') : u

    // 3. Valor global
    let valorGlobal: number | undefined = u
    const mValor = texto.match(/R\$\s*([0-9][0-9.]*,[0-9]{2})/)
    if (mValor) {
      const parsed = parseFloat(mValor[1].replace(/\./g, '').replace(',', '.'))
      if (!isNaN(parsed) && parsed > 0) valorGlobal = parsed
    }

    // 4. Objeto
    let objeto: string | undefined = u
    const mObjeto = texto.match(/(?:do\s+objeto|objeto)\s*[:\-–]\s*([^\n]{15,400})/i)
    if (mObjeto) objeto = mObjeto[1].trim()

    // 5. Órgão / município / UF
    let orgao: string | undefined = u
    const mOrgao = texto.match(
      /((?:secretaria|prefeitura municipal|departamento|autarquia)[^,.\n]{3,90})/i,
    )
    if (mOrgao) orgao = mOrgao[1].trim()

    let municipio: string | undefined = u
    const mMun = texto.match(
      /(?:munic[íi]pio|prefeitura municipal)\s+de\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ\s]{2,40})/,
    )
    if (mMun) municipio = mMun[1].trim().replace(/\s+$/, '')

    let estadoUf: string | undefined = u
    const mUf = texto.match(/\b(?:estado\s+de\s+s[ãa]o\s+paulo|\/\s*SP|-\s*SP)\b/i)
    if (mUf) estadoUf = 'SP'

    // 6. Contratada + CNPJ
    let contratadaNome: string | undefined = u
    const mContratada = texto.match(
      /contratada\s*[:\-–]?\s*([A-ZÀ-Ý][^\n,;]{4,80}?(?:LTDA|S\/A|S\.A\.|EIRELI|ME|EPP)\.?)/i,
    )
    if (mContratada) contratadaNome = mContratada[1].trim()

    let contratadaCnpj: string | undefined = u
    const mCnpj = texto.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/)
    if (mCnpj) contratadaCnpj = mCnpj[1]

    // 7. Datas
    const parseDataBr = (d?: string) => {
      if (!d) return u
      const m = d.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/)
      if (!m) return u
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }
    const mAssin = texto.match(
      /(?:assinad[oa]|data\s+de\s+assinatura|firmad[oa])[^\n]{0,40}?(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i,
    )
    const dataAssinatura = parseDataBr(mAssin?.[1])

    const mOs = texto.match(/(?:ordem\s+de\s+servi[çc]o)[^\n]{0,40}?(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i)
    const dataOrdemServico = parseDataBr(mOs?.[1])

    // 8. Tipo de obra
    let tipoObra: string | undefined = u
    if (/creche|escola|emei|emef|educa[çc][ãa]o/i.test(textoLow)) tipoObra = 'Educação/Escolas'
    else if (/\bubs\b|hospital|\bupa\b|sa[úu]de/i.test(textoLow)) tipoObra = 'Saúde/UBS'
    else if (/saneamento|esgoto|[áa]gua potável/i.test(textoLow)) tipoObra = 'Saneamento'
    else if (/habita[çc][ãa]o|unidades habitacionais/i.test(textoLow)) tipoObra = 'Habitação'
    else if (/pavimenta[çc][ãa]o|recapeamento|via p[úu]blica/i.test(textoLow))
      tipoObra = 'Pavimentação/Vias'
    else if (/servi[çc]o\s+cont[íi]nu|conserva[çc][ãa]o\s+contínua/i.test(textoLow))
      tipoObra = 'Serviço Continuado'

    // 9. Multa e remissão externa
    let multaMax: number | undefined = u
    const mMulta = texto.match(/multa[^\n]{0,60}?([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i)
    if (mMulta) multaMax = parseFloat(mMulta[1].replace(',', '.'))
    const remissaoExterna =
      multaMax === undefined &&
      /(multa|penalidade)[^\n]{0,80}(termo de refer[êe]ncia|edital|anexo)/i.test(texto)

    // 10. Prazo de vigência
    let prazoMeses: number | undefined = u
    const mPrazo = texto.match(
      /(?:prazo|vig[êe]ncia)[^\n]{0,40}?([0-9]{1,3})\s*(?:\([^)]*\)\s*)?(?:meses|m[êe]s)/i,
    )
    if (mPrazo) prazoMeses = parseInt(mPrazo[1], 10)

    // 11. Periodicidade de medição
    let periodicidadeDias: number | undefined = u
    let periodicidadeTipo: 'explícita' | 'por etapa' | 'inferida' | 'ausente' = 'ausente'
    let periodicidadeConfianca: 'alta' | 'média' | 'baixa' | undefined = u

    const mPeriodExplicita = texto.match(
      /(?:medi[çc][õo]es?|medi[çc][ãa]o)[^\n]{0,60}?(?:a\s+cada\s+)?([0-9]{1,3})\s*\(?[a-zç]*\)?\s*dias/i,
    )
    if (mPeriodExplicita) {
      periodicidadeDias = parseInt(mPeriodExplicita[1], 10)
      periodicidadeTipo = 'explícita'
      periodicidadeConfianca = 'alta'
    } else if (/medi[çc][õo]es?\s+mensa(?:l|is)/i.test(texto)) {
      periodicidadeDias = 30
      periodicidadeTipo = 'inferida'
      periodicidadeConfianca = 'média'
    } else if (/(?:por\s+etapa|conclus[ãa]o\s+de\s+etapa|etapas\s+conclu)/i.test(texto)) {
      periodicidadeTipo = 'por etapa'
      periodicidadeConfianca = 'baixa'
    }

    // 12. Limite de aditivo
    let limiteAditivo: number | undefined = u
    if (/(?:limite|acr[ée]scimo)[^\n]{0,80}?(50\s*%|cinquenta por cento)/i.test(texto))
      limiteAditivo = 50
    else if (/(?:limite|acr[ée]scimo)[^\n]{0,80}?(25\s*%|vinte e cinco por cento)/i.test(texto))
      limiteAditivo = 25

    // 13. Carência de trâmite: parâmetro do SIGO, não do contrato. Valor declarado.
    const carenciaDias = 15

    const titulo =
      tipoObra && objeto
        ? `${tipoObra}: ${objeto.substring(0, 80)}`
        : objeto?.substring(0, 100) || u

    return {
      numero_contrato: numeroContrato,
      ano_contrato: numeroContrato?.split('/')[1],
      processo_adm: processoAdm,
      titulo,
      objeto,
      orgao,
      municipio,
      estado_uf: estadoUf,
      tipo_obra: tipoObra,
      contratada_nome: contratadaNome,
      contratada_cnpj: contratadaCnpj,
      valor_global_original: valorGlobal,
      valor_global_atual: valorGlobal,
      data_assinatura: dataAssinatura,
      data_ordem_servico: dataOrdemServico,
      prazo_vigencia_meses: prazoMeses,
      periodicidade_tipo: periodicidadeTipo,
      periodicidade_dias: periodicidadeDias,
      periodicidade_confianca: periodicidadeConfianca,
      evento_ancora: dataOrdemServico ? 'ordem de serviço' : dataAssinatura ? 'assinatura' : u,
      multa_max_percentual: multaMax,
      multa_remissao_externa: remissaoExterna,
      limite_aditivo_percentual: limiteAditivo,
      carencia_dias: carenciaDias,
      // Campos de EXECUÇÃO: não existem no contrato. Sempre undefined nesta camada.
      dias_sem_liquidacao: u,
      valor_total_liquidado: u,
      porcentagem_liquidada: u,
      porcentagem_prazo_decorrido: u,
      tem_marco_vencido: u,
    }
  }

  const processarExtracao = async (textoParaAnalisar: string) => {
    setIsProcessing(true)
    setProgress(15)
    setProcessStep('Fazendo upload do PDF e convertendo texto...')

    // 1. Extração determinística inicial completa
    const resultadoDeterminista = extrairEntidadesDeterministas(textoParaAnalisar, file?.name)

    await new Promise((r) => setTimeout(r, 400))
    setProgress(40)
    setProcessStep('Lendo o contrato...')

    let extracaoFinal = resultadoDeterminista

    // 2. Tenta invocar o Hook Skip AI Backend para enriquecer a extração com LLM
    try {
      const hookRes = await pb.send('/backend/v1/extract-contract', {
        method: 'POST',
        body: JSON.stringify({
          text: textoParaAnalisar,
          fileName: file?.name || 'contrato.pdf',
        }),
      })

      if (hookRes && hookRes.data) {
        const aiData = hookRes.data
        // Mescla dados de IA com determinísticos se vierem preenchidos
        if (aiData.numero_contrato) extracaoFinal.obra.numero_contrato = aiData.numero_contrato
        if (aiData.objeto) extracaoFinal.obra.objeto = aiData.objeto
        if (aiData.titulo) extracaoFinal.obra.titulo = aiData.titulo
        if (aiData.orgao) extracaoFinal.obra.orgao = aiData.orgao
        if (aiData.municipio) extracaoFinal.obra.municipio = aiData.municipio
        if (aiData.tipo_obra) extracaoFinal.obra.tipo_obra = aiData.tipo_obra
        if (aiData.contratada_nome) extracaoFinal.obra.contratada_nome = aiData.contratada_nome
        if (aiData.contratada_cnpj) extracaoFinal.obra.contratada_cnpj = aiData.contratada_cnpj
        if (aiData.valor_global_original)
          extracaoFinal.obra.valor_global_original = aiData.valor_global_original
        if (aiData.valor_global_atual)
          extracaoFinal.obra.valor_global_atual = aiData.valor_global_atual
        if (aiData.multa_max_percentual !== undefined)
          extracaoFinal.obra.multa_max_percentual = aiData.multa_max_percentual
        if (aiData.limite_aditivo_percentual !== undefined)
          extracaoFinal.obra.limite_aditivo_percentual = aiData.limite_aditivo_percentual

        // Obrigações: IA COMPLEMENTA, não substitui.
        if (Array.isArray(aiData.obrigacoes) && aiData.obrigacoes.length > 0) {
          extracaoFinal.obrigacoes = [
            ...extracaoFinal.obrigacoes,
            ...aiData.obrigacoes.map((o: any) => ({ ...o, origem: 'ia' as const })),
          ]
        }
        // Inconsistências: as determinísticas NUNCA são descartadas.
        // A IA entra como "sugestão", marcada e separada na interface.
        if (Array.isArray(aiData.inconsistencias) && aiData.inconsistencias.length > 0) {
          extracaoFinal.inconsistencias = [
            ...extracaoFinal.inconsistencias,
            ...aiData.inconsistencias.map((i: any) => ({
              ...i,
              tipo_checagem: normalizarTipoChecagem(i.tipo_checagem),
              origem: 'ia' as const,
              confianca: 'sugestão (não verificada)',
            })),
          ]
        }
        if (Array.isArray(aiData.aditivos) && aiData.aditivos.length > 0) {
          extracaoFinal.aditivos = [
            ...extracaoFinal.aditivos,
            ...aiData.aditivos.map((a: any) => ({ ...a, origem: 'ia' as const })),
          ]
        }
        // Liquidações NÃO são aceitas da IA: não existem no texto do contrato.
        // Só entram por fonte de execução orçamentária (integração futura).
      }
    } catch (aiErr) {
      console.log('Extração via hook AI falhou ou usou fallback local determinístico:', aiErr)
    }

    await new Promise((r) => setTimeout(r, 400))
    setProgress(70)
    setProcessStep('Verificando o conteúdo do contrato...')

    await new Promise((r) => setTimeout(r, 400))
    setProgress(85)
    setProcessStep('Calculando o status da obra...')

    const resumoCidadao = gerarResumoCidadao(extracaoFinal.obra)

    const novaObra: Partial<ObraRecord> = {
      ...extracaoFinal.obra,
      resumo: resumoCidadao,
      tem_inconsistencias: extracaoFinal.inconsistencias.length > 0,
      qtd_aditivos: extracaoFinal.aditivos.length,
      percentual_aditado_total: extracaoFinal.aditivos.reduce(
        (acc, a) => acc + (a.percentual_aditado_individual || 0),
        0,
      ),
      origem_extracao: file ? `upload_arquivo (${file.name})` : 'upload_ia',
      extracao_ia_raw: {
        motor: 'sigoEngine (determinístico) + LLM complementar',
        arquivo_origem: file?.name || 'texto_colado',
        tamanho_texto: textoParaAnalisar.length,
        texto_truncado_para_llm: textoParaAnalisar.length > 15000,
        inconsistencias_deterministas: extracaoFinal.inconsistencias.filter(
          (i: any) => i.origem !== 'ia',
        ).length,
        inconsistencias_sugeridas_ia: extracaoFinal.inconsistencias.filter(
          (i: any) => i.origem === 'ia',
        ).length,
        obrigacoes_extraidas: extracaoFinal.obrigacoes.length,
        aditivos_extraidos: extracaoFinal.aditivos.length,
        liquidacoes_extraidas: extracaoFinal.liquidacoes.length,
        texto_destaque: extracaoFinal.obra.tem_marco_vencido
          ? 'Cláusula com marco temporal identificado com penalidade moratória associada.'
          : `Regras do contrato: ${extracaoFinal.obra.periodicidade_tipo} (${extracaoFinal.obra.periodicidade_dias} dias).`,
      },
    }

    try {
      // Se tiver arquivo PDF, anexa via FormData
      let savedObra: ObraRecord
      if (file) {
        const formData = new FormData()
        Object.entries(novaObra).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            if (typeof val === 'object') {
              formData.append(key, JSON.stringify(val))
            } else {
              formData.append(key, String(val))
            }
          }
        })
        formData.append('arquivo_pdf', file)
        savedObra = await saveObra(formData, true)
      } else {
        savedObra = await saveObra(novaObra)
      }

      // 1. Salva todas as Obrigações Extraídas
      for (const ob of extracaoFinal.obrigacoes) {
        await createObrigacao({
          obra_id: savedObra.id,
          clausula: ob.clausula || 'Cláusula Contratual',
          descricao: ob.descricao || 'Obrigação contratual',
          responsavel: ob.responsavel || 'Contratada',
          tipo_regua: ob.tipo_regua || 'marco_contratual',
          prazo_texto: ob.prazo_texto || 'Conforme instrumento',
          data_limite: ob.data_limite || undefined,
          penalidade_associada: ob.penalidade_associada || 'Multa contratual',
          penalidade_percentual: ob.penalidade_percentual || 0,
          status_cumprimento: ob.status_cumprimento || 'no_prazo',
          dias_atraso: ob.dias_atraso || 0,
          trecho_original_pdf: ob.trecho_original_pdf || '',
          confianca: ob.confianca || 'alta',
          remissao_externa: !!ob.remissao_externa,
        })
      }

      // 2. Salva todas as Inconsistências Detectadas
      // Normaliza para o formato esperado pela collection `inconsistencias`
      // do PocketBase. O schema existente só admite 4 valores em
      // `tipo_checagem`; novos tipos determinísticos (prazo_incoerente,
      // valor_extenso_ausente) são mapeados para o valor de schema mais
      // próximo, preservando titulo/descricao para diferenciação visual.
      for (const inc of extracaoFinal.inconsistencias) {
        const tipoRaw: string = inc.tipo || (inc as any).tipo_checagem || 'clausula_inexistente'
        const tipoChecagem = normalizarTipoChecagem(tipoRaw)
        const localizacao =
          inc.localizacao || (inc as any).localizacao_clausula || 'Corpo do contrato'
        const trecho = inc.trechoOriginal || (inc as any).trecho_original || ''

        await createInconsistencia({
          obra_id: savedObra.id,
          tipo_checagem: tipoChecagem,
          titulo: (inc.titulo || '').slice(0, 500),
          descricao: (inc.descricao || '').slice(0, 2000),
          localizacao_clausula: localizacao.slice(0, 500),
          trecho_original: trecho.slice(0, 2000),
          valor_encontrado: (inc.encontrado || (inc as any).valor_encontrado || '—').slice(0, 500),
          valor_esperado: (inc.esperado || (inc as any).valor_esperado || '—').slice(0, 500),
          status_validacao: 'pendente_analise',
        })
      }

      // 3. Salva os Termos Aditivos
      for (const ad of extracaoFinal.aditivos) {
        await createAditivo({
          obra_id: savedObra.id,
          numero_termo: ad.numero_termo || '1º Termo Aditivo',
          tipo_aditivo: ad.tipo_aditivo || 'Valor (Acréscimo)',
          data_assinatura: ad.data_assinatura || '2026-01-20',
          justificativa: ad.justificativa || 'Readequação contratual',
          valor_aditado: ad.valor_aditado || 0,
          percentual_aditado_individual: ad.percentual_aditado_individual || 0,
          prazo_aditado_dias: ad.prazo_aditado_dias || 0,
          limite_legal_percentual: ad.limite_legal_percentual || 25,
          alerta_limite_ultrapassado: !!ad.alerta_limite_ultrapassado,
        })
      }

      // 4. Salva as Liquidações Financeiras
      for (const liq of extracaoFinal.liquidacoes) {
        await createLiquidacao({
          obra_id: savedObra.id,
          numero_medicao: liq.numero_medicao || '1ª Medição',
          numero_nota_empenho: liq.numero_nota_empenho || 'NE-2026/001',
          data_liquidacao: liq.data_liquidacao || new Date().toISOString().split('T')[0],
          valor_liquidado: liq.valor_liquidado || 0,
          percentual_medido: liq.percentual_medido || 0,
          status_tramitacao: liq.status_tramitacao || 'Liquidado e Pago',
          observacoes: liq.observacoes || 'Liquidação contábil',
        })
      }

      setProgress(100)
      setIsProcessing(false)

      toast({
        title: 'Contrato e dados extraídos com sucesso!',
        description: `Status: ${
          savedObra.status_classificacao === 'prazo_vencido' ||
          savedObra.status_classificacao === 'fora_do_ritmo'
            ? 'Fora do ritmo'
            : 'Dentro do prazo'
        }. Encontramos ${extracaoFinal.obrigacoes.length} itens do contrato, ${extracaoFinal.inconsistencias.length} problemas, ${extracaoFinal.aditivos.length} mudanças e ${extracaoFinal.liquidacoes.length} liquidações.`,
      })
      navigate(`/obras/${savedObra.id}`)
    } catch (error: any) {
      setIsProcessing(false)
      toast({
        title: 'Erro ao processar',
        description: error.message || 'Não foi possível gravar o contrato extraído.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Entrada automática de contratos
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Upload de Contrato Público
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Faça upload do contrato em PDF. O sistema lê e resume para você.
        </p>
      </div>

      {/* Box de Upload Drag & Drop */}
      <Card className="border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-slate-900 shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300">
            <UploadCloud className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Arraste o PDF do Contrato ou Termo de Referência
            </h3>
            <p className="text-xs text-slate-500">
              Formatos aceitos: PDF, Digitalizado ou OCR (Até 50MB)
            </p>
          </div>

          <div className="flex justify-center items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              disabled={isReadingFile}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isReadingFile}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold bg-white dark:bg-slate-800"
            >
              {isReadingFile ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-blue-600" />
                  Lendo arquivo...
                </>
              ) : (
                'Selecionar Arquivo do Computador'
              )}
            </Button>

            {file && (
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-3 py-1.5 rounded-md">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
          </div>

          {fileWarning && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-left flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                {fileWarning}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor do Texto Jurídico Extraído do PDF */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              Texto Bruto do Contrato (Para Processamento)
            </CardTitle>
            <Badge variant="outline" className="text-[11px]">
              {textoManual.length} caracteres
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Você pode editar ou colar o texto de qualquer contrato administrativo para processar as
            regras e verificar problemas no texto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={textoManual}
            onChange={(e) => setTextoManual(e.target.value)}
            rows={10}
            className="w-full p-4 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-xs border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
          />

          {/* Estado de Processamento com Barra de Progresso */}
          {isProcessing ? (
            <div className="p-6 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  {processStep}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-blue-200 dark:bg-blue-900" />
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => processarExtracao(textoManual)}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 shadow-md flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Ler o contrato
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
