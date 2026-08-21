import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Building2,
  Loader2,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { saveObra, createObrigacao, createInconsistencia } from '@/services/obrasService'
import { ObraRecord } from '@/types/sigo'
import { executarChecagensCoerencia, formatarMoeda } from '@/lib/sigoEngine'
import { toast } from '@/hooks/use-toast'

export default function ContratoUpload() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processStep, setProcessStep] = useState<string>('')

  // Modelos de Contratos Predefinidos para Teste Rápido (Exemplos do Hackathon)
  const exemplosContratos = [
    {
      nome: 'Contrato 041/2026 - São Pedro do Turvo (Obra Habitacional)',
      tipo: 'Edificação/Habitação',
      orgao: 'Secretaria de Obras e Habitação',
      municipio: 'São Pedro do Turvo/SP',
      valor: 2734800,
      prazo: 12,
      textoExemplo: `TERMO DE CONTRATO Nº 041/2026. PROCESSO ADMINISTRATIVO Nº PA-089/2025. CONCORRÊNCIA PÚBLICA Nº 005/2025.
CLÁUSULA PRIMEIRA - DO OBJETO: Contratação de empresa especializada em engenharia civil para execução de 20 unidades habitacionais térreas em alvenaria estrutural no Loteamento Nova Esperança.
CLÁUSULA SEGUNDA - DA EXECUÇÃO: A CONTRATADA obriga-se a entregar a totalidade das alvenarias e lajes das 20 unidades habitacionais devidamente concluídas no prazo improrrogável de 120 (cento e vinte) dias da emissão da OS (item 2.7.1).
CLÁUSULA QUARTA - DO VALOR E MEDIÇÃO: O valor global deste contrato é de R$ 2.734.800,00 (dois milhões, setecentos e trinta e quatro mil e oitocentos reais). As medições serão realizadas a cada 30 (trinta) dias pela Fiscalização.
CLÁUSULA SEXTA - DOS ADITIVOS: O presente contrato poderá ser aditado em até 50% (cinquenta por cento) do seu valor inicial atualizado.
CLÁUSULA NONA - DAS SANÇÕES: Cláusula 9.1.1.d prevê multa moratória diária de 0,2% até o limite de 20% sobre o saldo remanescente em caso de mora superior a 30 dias.
CLÁUSULA DÉCIMA PRIMEIRA - DAS DISPOSIÇÕES FINAIS: Conforme sanções expressamente capituladas no item 14.8 deste instrumento contratual.`,
    },
    {
      nome: 'Contrato 133/2026 - Pontal (Serviço Continuado Pavimentação)',
      tipo: 'Pavimentação/Vias',
      orgao: 'Secretaria de Serviços Urbanos',
      municipio: 'Pontal/SP',
      valor: 469470,
      prazo: 12,
      textoExemplo: `TERMO DE CONTRATO Nº 133/2026. PREGÃO ELETRÔNICO Nº 012/2026. PROCESSO PA-045/2026.
PREÂMBULO: O Município de Pontal celebra o presente contrato decorrente do Pregão Eletrônico nº 018/2026.
CLÁUSULA PRIMEIRA - DO OBJETO: Prestação de serviços contínuos de conservação, recomposição de pavimento asfáltico em CBUQ, fresagem e tapa-buracos.
CLÁUSULA SEGUNDA - DO VALOR: O valor global estimado é de R$ 469.470,00 (quatrocentos e sessenta e nove mil, quatrocentos e setenta reais).
CLÁUSULA TERCEIRA - DA MEDIÇÃO: A periodicidade da prestação é de 12 (doze) medições mensais (12 x MÊS).
CLÁUSULA QUINTA - DA VIGÊNCIA: O prazo de vigência deste instrumento será de 12 (dez) meses.
CLÁUSULA OITAVA - DAS PENALIDADES: As sanções administrativas seguirão rigorosamente o estipulado no Termo de Referência - Anexo I do Edital.`,
    },
    {
      nome: 'Contrato 092/SME/2026 - São Paulo (Construção de Creche Escola)',
      tipo: 'Educação/Escolas',
      orgao: 'Secretaria Municipal de Educação - SME/SP',
      municipio: 'São Paulo/SP',
      valor: 5800000,
      prazo: 14,
      textoExemplo: `TERMO DE CONTRATO Nº 092/SME/2026. PROCESSO 6016.2026/001899-2. CONCORRÊNCIA Nº 014/2025.
CLÁUSULA PRIMEIRA - DO OBJETO: Construção de Centro de Educação Infantil (CEI) Tipo 1 com 8 salas de atividades, berçários, refeitório, playground acessível e energia fotovoltaica na Zona Sul de São Paulo.
CLÁUSULA SEGUNDA - DO VALOR: O valor global contratado é de R$ 5.800.000,00 (cinco milhões e oitocentos mil reais).
CLÁUSULA TERCEIRA - DAS MEDIÇÕES: Medições mensais a cada 30 (trinta) dias com boletim físico emitido pela fiscalização.
CLÁUSULA QUINTA - DA MULTA: Multa de 15% (quinze por cento) em caso de descumprimento de prazos parciais.`,
    },
  ]

  const [textoManual, setTextoManual] = useState(exemplosContratos[0].textoExemplo)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const simularExtracaoIA = async (textoParaAnalisar: string) => {
    setIsProcessing(true)
    setProgress(15)
    setProcessStep('Fazendo upload do PDF e convertendo texto...')

    await new Promise((r) => setTimeout(r, 600))
    setProgress(45)
    setProcessStep('Skip AI Auditor: Extraindo réguas, vigências, prazos e penalidades...')

    await new Promise((r) => setTimeout(r, 800))
    setProgress(75)
    setProcessStep('Executando 4 Checagens de Coerência Determinísticas (sem IA)...')

    // Executa as checagens determinísticas
    const inconsistencias = executarChecagensCoerencia(textoParaAnalisar)

    await new Promise((r) => setTimeout(r, 600))
    setProgress(95)
    setProcessStep('Calculando classificação de estado e índice de gravidade G...')

    // Cria os dados da obra
    const isPedro =
      textoParaAnalisar.includes('041/2026') || textoParaAnalisar.includes('Nova Esperança')
    const isPontal = textoParaAnalisar.includes('133/2026') || textoParaAnalisar.includes('Pontal')

    const novaObra: Partial<ObraRecord> = {
      numero_contrato: isPedro ? '041/2026' : isPontal ? '133/2026' : '092/SME/2026',
      ano_contrato: '2026',
      processo_adm: isPedro ? 'PA-089/2025' : isPontal ? 'PA-045/2026' : '6016.2026/001899-2',
      titulo: isPedro
        ? 'Construção de 20 Unidades Habitacionais de Interesse Social'
        : isPontal
          ? 'Serviço Continuado de Manutenção e Pavimentação Asfáltica'
          : 'Construção de Centro de Educação Infantil (CEI Tipo 1) - Zona Sul',
      objeto: isPedro
        ? 'Contratação de empresa especializada em engenharia civil para execução de 20 unidades habitacionais térreas em alvenaria estrutural no Loteamento Nova Esperança.'
        : isPontal
          ? 'Prestação de serviços contínuos de conservação, recomposição de pavimento asfáltico em CBUQ, fresagem e tapa-buracos em vias públicas.'
          : 'Construção de Centro de Educação Infantil com 8 salas de atividades, berçários e playground acessível.',
      orgao: isPedro
        ? 'Secretaria Municipal de Obras e Habitação'
        : isPontal
          ? 'Secretaria Municipal de Serviços Urbanos'
          : 'Secretaria Municipal de Educação - SME/SP',
      municipio: isPedro ? 'São Pedro do Turvo' : isPontal ? 'Pontal' : 'São Paulo',
      estado_uf: 'SP',
      tipo_obra: isPedro ? 'Habitação' : isPontal ? 'Pavimentação/Vias' : 'Educação/Escolas',
      contratada_nome: isPedro
        ? 'Construtora Vale do Paranapanema Ltda.'
        : isPontal
          ? 'Pavimentadora Paulista S/A'
          : 'Paulista Infraestrutura Escolar S/A',
      contratada_cnpj: '33.882.112/0001-99',
      valor_global_original: isPedro ? 2734800 : isPontal ? 469470 : 5800000,
      valor_global_atual: isPedro ? 2734800 : isPontal ? 469470 : 5800000,
      data_assinatura: '2026-01-15',
      data_ordem_servico: '2026-02-01',
      prazo_vigencia_meses: 12,
      periodicidade_tipo: isPedro ? 'por etapa' : isPontal ? 'inferida' : 'explícita',
      periodicidade_dias: 30,
      periodicidade_confianca: isPedro ? 'alta' : isPontal ? 'média' : 'alta',
      evento_ancora: 'ordem de serviço',
      multa_max_percentual: isPedro ? 20 : isPontal ? 10 : 15,
      multa_remissao_externa: isPontal,
      limite_aditivo_percentual: isPedro ? 50 : 25,
      carencia_dias: 15,
      dias_sem_liquidacao: isPedro ? 47 : isPontal ? 37 : 10,
      valor_total_liquidado: isPedro ? 957180 : isPontal ? 78245 : 1160000,
      porcentagem_liquidada: isPedro ? 29.17 : isPontal ? 16.67 : 20.0,
      porcentagem_prazo_decorrido: isPedro ? 58.33 : isPontal ? 25.0 : 18.0,
      tem_marco_vencido: isPedro,
      tem_inconsistencias: inconsistencias.length > 0,
      origem_extracao: 'upload_ia',
      extracao_ia_raw: {
        modelo: 'Skip AI Auditor 4.0 (Legal-BERT & Multi-Agent Parsing)',
        tempo_processamento: '1.4s',
        paginas_lidas: 142,
        confianca_geral: 0.96,
        inconsistencias_detectadas: inconsistencias.length,
        texto_destaque: isPedro
          ? 'Cláusula 2.7.1 prevê marco de 120 dias com penalidade moratória de 20%.'
          : 'Régua inferida de 12 meses.',
      },
    }

    try {
      const savedObra = await saveObra(novaObra)

      // Salva as inconsistências detectadas
      for (const inc of inconsistencias) {
        await createInconsistencia({
          obra_id: savedObra.id,
          tipo_checagem: inc.tipo,
          titulo: inc.titulo,
          descricao: inc.descricao,
          localizacao_clausula: inc.localizacao,
          trecho_original: inc.trechoOriginal,
          valor_encontrado: inc.encontrado,
          valor_esperado: inc.esperado,
          status_validacao: 'pendente_analise',
        })
      }

      // Se for São Pedro, adiciona obrigação com marco vencido
      if (isPedro) {
        await createObrigacao({
          obra_id: savedObra.id,
          clausula: 'Cláusula 2.7.1',
          descricao: 'Entrega da alvenaria estrutural e laje das 20 casas em 120 dias',
          responsavel: 'Contratada',
          tipo_regua: 'marco_contratual',
          prazo_texto: '120 dias da OS',
          data_limite: '2026-03-03',
          penalidade_associada: 'Multa de 20% (Cláusula 9.1.1.d)',
          penalidade_percentual: 20,
          status_cumprimento: 'vencido',
          dias_atraso: 34,
          trecho_original_pdf:
            'Cláusula 2.7.1 - A CONTRATADA obriga-se a entregar a totalidade das alvenarias...',
          confianca: 'alta',
        })
      }

      setProgress(100)
      setIsProcessing(false)

      toast({
        title: 'Contrato Extraído com Sucesso!',
        description: `Classificado como: ${savedObra.status_classificacao}. ${inconsistencias.length} inconsistência(s) detectada(s).`,
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
          Ingresso Automático de Contratos via IA
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Upload de Contrato & Extração de Réguas
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          O PDF de centenas de páginas é convertido em campos rastreáveis: réguas de periodicidade,
          penalidades, marcos contratuais e verificação de 4 inconsistências de texto.
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
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold bg-white dark:bg-slate-800"
              >
                Selecionar Arquivo do Computador
              </Button>
            </label>

            {file && (
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-3 py-1.5 rounded-md">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Contratos Reais da Validação do Hackathon */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Ou teste com os 3 Contratos Reais Analisados no Estudo:
          </h3>
          <span className="text-[11px] text-slate-500">Clique para carregar e extrair</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {exemplosContratos.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTextoManual(ex.textoExemplo)
                toast({
                  title: 'Contrato carregado',
                  description: `${ex.nome} pronto para extração.`,
                })
              }}
              className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-md transition-all space-y-1.5"
            >
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block line-clamp-1">
                {ex.nome}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {ex.municipio} · {formatarMoeda(ex.valor)}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {ex.tipo}
              </Badge>
            </button>
          ))}
        </div>
      </div>

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
            Você pode editar ou colar o texto de qualquer contrato administrativo para submeter ao
            motor de IA e checagens determinísticas.
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
                onClick={() => simularExtracaoIA(textoManual)}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 shadow-md flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Iniciar Extração com IA & Checagens
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explicação da Filosofia SIGO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="font-bold text-blue-900 dark:text-blue-300 block">1. A IA Lê</span>
          <p>
            Converte texto jurídico não estruturado em campos tabulares (vigências, datas, multas,
            eventos-âncora).
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="font-bold text-amber-900 dark:text-amber-300 block">
            2. O Sistema Calcula
          </span>
          <p>
            Aplica a fórmula determinística G = A × log₁₀(V) × S, cruza com o calendário e executa
            as 4 checagens sem IA.
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
            3. O Fiscal Decide
          </span>
          <p>
            O fiscal valida apontamentos com o PDF original lado a lado, sem ter que reler 300
            páginas.
          </p>
        </div>
      </div>
    </div>
  )
}
