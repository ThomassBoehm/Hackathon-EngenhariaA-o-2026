import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ArrowLeft,
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Layers,
  Scale,
  HelpCircle,
  ChevronRight,
  Download,
  Share2,
  Edit,
  Plus,
  Check,
  Sparkles,
  DollarSign,
  Calendar,
  Building,
  CheckSquare,
  FileCheck2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getObraById,
  getObrigacoesByObra,
  getInconsistenciasByObra,
  getAditivosByObra,
  getLiquidacoesByObra,
  updateInconsistencia,
  createObrigacao,
  createAditivo,
  createLiquidacao,
} from '@/services/obrasService'
import {
  ObraRecord,
  ObrigacaoRecord,
  InconsistenciaRecord,
  AditivoRecord,
  LiquidacaoRecord,
} from '@/types/sigo'
import { formatarMoeda, formatarData, getStatusBadgeInfo } from '@/lib/sigoEngine'
import { toast } from '@/hooks/use-toast'

export default function ObraDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [obra, setObra] = useState<ObraRecord | null>(null)
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoRecord[]>([])
  const [inconsistencias, setInconsistencias] = useState<InconsistenciaRecord[]>([])
  const [aditivos, setAditivos] = useState<AditivoRecord[]>([])
  const [liquidacoes, setLiquidacoes] = useState<LiquidacaoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modal para validar inconsistência
  const [selectedInconsistencia, setSelectedInconsistencia] = useState<InconsistenciaRecord | null>(
    null,
  )
  const [parecerTexto, setParecerTexto] = useState('')
  const [statusVal, setStatusVal] = useState<'confirmado_fiscal' | 'desconsiderado'>(
    'confirmado_fiscal',
  )

  // Modal para ver trecho do PDF
  const [modalTrechoPdf, setModalTrechoPdf] = useState<{
    clausula: string
    trecho: string
    penalidade?: string
  } | null>(null)

  useEffect(() => {
    if (id) {
      loadAll(id)
    }
  }, [id])

  async function loadAll(obraId: string) {
    setLoading(true)
    const [obraData, obData, incData, adData, liqData] = await Promise.all([
      getObraById(obraId),
      getObrigacoesByObra(obraId),
      getInconsistenciasByObra(obraId),
      getAditivosByObra(obraId),
      getLiquidacoesByObra(obraId),
    ])

    if (!obraData) {
      toast({
        title: 'Obra não encontrada',
        description: 'O contrato solicitado não existe no banco.',
        variant: 'destructive',
      })
      navigate('/')
      return
    }

    setObra(obraData)
    setObrigacoes(obData)
    setInconsistencias(incData)
    setAditivos(adData)
    setLiquidacoes(liqData)
    setLoading(false)
  }

  async function handleSalvarParecer() {
    if (!selectedInconsistencia) return
    try {
      await updateInconsistencia(selectedInconsistencia.id, {
        status_validacao: statusVal,
        parecer_fiscal: parecerTexto,
      })
      toast({
        title: 'Parecer do Fiscal Registrado',
        description: 'A validação da inconsistência foi atualizada com sucesso.',
      })
      setSelectedInconsistencia(null)
      if (id) loadAll(id)
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar o parecer.',
        variant: 'destructive',
      })
    }
  }

  if (loading || !obra) {
    return (
      <div className="p-16 text-center text-slate-500 text-sm">
        Carregando auditoria completa do contrato...
      </div>
    )
  }

  const badgeInfo = getStatusBadgeInfo(obra.status_classificacao)
  const percLiq = obra.porcentagem_liquidada || 0
  const percPrazo = obra.porcentagem_prazo_decorrido || 0
  const descompasso = Math.max(0, percPrazo - percLiq)

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                CONTRATO Nº {obra.numero_contrato}
              </span>
              {obra.processo_adm && (
                <span className="text-xs text-slate-500 font-mono">{obra.processo_adm}</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {obra.titulo}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/obras/${obra.id}/editar`}>
            <Button variant="outline" size="sm" className="text-xs font-semibold">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Editar Dados
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
            onClick={() => window.print()}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Hero Banner de Classificação e Apontamento Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Estado & Apontamento (2 Colunas) */}
        <Card
          className={`lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${badgeInfo.cardBorder} shadow-sm`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeInfo.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${badgeInfo.dot}`} />
                {badgeInfo.label}
              </span>
              <span className="text-xs text-slate-500">Auditoria determinística atualizada</span>
            </div>

            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white pt-2">
              Apontamento do Fiscal: O que o SIGO detectou
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Box Destacado do Apontamento */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 font-medium space-y-2 border border-slate-800">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">
                    {obra.status_classificacao === 'prazo_vencido'
                      ? 'Situação Passível de Apuração / Abertura de Processo'
                      : obra.status_classificacao === 'fora_do_ritmo'
                        ? 'Alerta Prévio de Descompasso Físico-Financeiro'
                        : obra.status_classificacao === 'no_ritmo'
                          ? 'Execução em Conformidade Pactuada'
                          : 'Contrato Sinalizado para Validação de Réguas'}
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    {obra.resumo_motivo_status ||
                      'Dentro dos prazos e medições pactuadas no contrato.'}
                  </p>
                </div>
              </div>
            </div>

            {/* As Duas Réguas Explicadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
                <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 block mb-1">
                  1. Régua de Marco Contratual (Contratada)
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-tight">
                  {obra.tem_marco_vencido
                    ? 'Há obrigações de entrega vencidas sem carência.'
                    : 'Marcos contratuais datados cumpridos ou no prazo.'}
                </p>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  2. Régua de Liquidação (Administração)
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-tight">
                  {obra.dias_sem_liquidacao || 0} dias de silêncio contábil. Carência de trâmite de{' '}
                  {obra.carencia_dias || 15} dias aplicada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Gravidade G & Execução (1 Coluna) */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase text-slate-500">
              Priorização Determinística
            </CardDescription>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-3xl font-black text-slate-900 dark:text-white">
                G = {obra.gravidade_score > 0 ? obra.gravidade_score.toFixed(2) : '0,00'}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                G = A × log₁₀(V) × S
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1.5 text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex justify-between">
                <span>A (Dias ÷ Periodicidade):</span>
                <strong>
                  {((obra.dias_sem_liquidacao || 0) / (obra.periodicidade_dias || 30)).toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>V (Valor Global):</span>
                <strong>
                  {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>S (Multa % ÷ 10):</span>
                <strong>
                  {obra.multa_remissao_externa
                    ? '1.00 (TR/Edital)'
                    : ((obra.multa_max_percentual || 10) / 10).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Comparativo de Curva Físico-Financeira */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>Prazo Decorrido: {percPrazo.toFixed(1)}%</span>
                <span>Liquidado: {percLiq.toFixed(1)}%</span>
              </div>
              <div className="space-y-1">
                <Progress value={percPrazo} className="h-2 bg-slate-200 dark:bg-slate-800" />
                <Progress value={percLiq} className="h-2 bg-blue-100 dark:bg-blue-950" />
              </div>
              {descompasso >= 20 && (
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Descompasso de {descompasso.toFixed(1)} p.p. detectado
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Órgão: <strong>{obra.orgao}</strong> · Contratada:{' '}
            <strong>{obra.contratada_nome}</strong>
          </div>
        </Card>
      </div>

      {/* Tabs com os Detalhes da Auditoria */}
      <Tabs defaultValue="obrigacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="obrigacoes" className="text-xs py-2 font-semibold">
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            Obrigações & Marcos ({obrigacoes.length})
          </TabsTrigger>
          <TabsTrigger value="inconsistencias" className="text-xs py-2 font-semibold relative">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
            Inconsistências ({inconsistencias.length})
            {inconsistencias.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-2 right-2" />
            )}
          </TabsTrigger>
          <TabsTrigger value="aditivos" className="text-xs py-2 font-semibold">
            <Scale className="h-3.5 w-3.5 mr-1.5" />
            Comparativo Aditivos ({aditivos.length})
          </TabsTrigger>
          <TabsTrigger value="liquidacoes" className="text-xs py-2 font-semibold">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Medições & Liquidações ({liquidacoes.length})
          </TabsTrigger>
          <TabsTrigger value="contrato_ia" className="text-xs py-2 font-semibold">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
            Extração IA & Réguas
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Obrigações e Marcos Contratuais */}
        <TabsContent value="obrigacoes" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tabela Rastreável de Obrigações & Marcos
              </h3>
              <p className="text-xs text-slate-500">
                Cada obrigação vinculada à sua cláusula original e penalidade contratual.
              </p>
            </div>
          </div>

          {obrigacoes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">
                Nenhuma obrigação individual cadastrada ainda.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">Cláusula & Descrição</th>
                      <th className="p-3.5">Responsável</th>
                      <th className="p-3.5">Tipo de Régua</th>
                      <th className="p-3.5">Prazo Pactuado</th>
                      <th className="p-3.5">Penalidade Prevista</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {obrigacoes.map((ob) => {
                      const isVencido = ob.status_cumprimento === 'vencido'
                      const isCumprido = ob.status_cumprimento === 'cumprido'

                      return (
                        <tr key={ob.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 max-w-xs">
                            <div className="font-bold text-blue-900 dark:text-blue-300 font-mono">
                              {ob.clausula}
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2">
                              {ob.descricao}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={ob.responsavel === 'Contratada' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {ob.responsavel}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            <span className="capitalize text-slate-600 dark:text-slate-400">
                              {ob.tipo_regua.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {ob.prazo_texto || '—'}
                            </div>
                            {ob.data_limite && (
                              <div className="text-[10px] text-slate-400">
                                Limite: {formatarData(ob.data_limite)}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <div className="text-red-700 dark:text-red-400 font-medium line-clamp-2">
                              {ob.penalidade_associada || 'Não especificada'}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isVencido ? (
                              <Badge className="bg-red-600 text-white text-[10px]">
                                Vencido ({ob.dias_atraso || 0}d)
                              </Badge>
                            ) : isCumprido ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                Cumprido
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-blue-700 border-blue-300"
                              >
                                No Prazo
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {ob.trecho_original_pdf && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-blue-700"
                                onClick={() =>
                                  setModalTrechoPdf({
                                    clausula: ob.clausula,
                                    trecho: ob.trecho_original_pdf || '',
                                    penalidade: ob.penalidade_associada,
                                  })
                                }
                              >
                                Ver Trecho PDF
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: As 4 Checagens de Coerência (Sem IA) */}
        <TabsContent value="inconsistencias" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Painel de Inconsistências de Coerência Textual (Sem IA)
              </h3>
              <p className="text-xs text-slate-500">
                4 checagens determinísticas: Cláusula inexistente, extenso divergente, divergência
                aritmética e identificador conflitante.
              </p>
            </div>
          </div>

          {inconsistencias.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-emerald-300">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Nenhuma inconsistência detectada
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                O instrumento contratual passou com 100% de conformidade nas 4 checagens.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inconsistencias.map((inc) => {
                const isPendente = inc.status_validacao === 'pendente_analise'
                const isConfirmado = inc.status_validacao === 'confirmado_fiscal'

                return (
                  <Card
                    key={inc.id}
                    className="bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900 shadow-sm"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold border-amber-400 text-amber-800 bg-amber-50"
                        >
                          {inc.tipo_checagem.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant={
                            isConfirmado ? 'destructive' : isPendente ? 'secondary' : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {inc.status_validacao === 'confirmado_fiscal'
                            ? 'Confirmado pelo Fiscal'
                            : inc.status_validacao === 'desconsiderado'
                              ? 'Desconsiderado'
                              : 'Pendente de Parecer'}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                        {inc.titulo}
                      </CardTitle>
                      {inc.localizacao_clausula && (
                        <CardDescription className="text-xs font-mono text-blue-700 dark:text-blue-300">
                          Local: {inc.localizacao_clausula}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {inc.descricao}
                      </p>

                      {inc.trecho_original && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                            Trecho Original do PDF:
                          </span>
                          "{inc.trecho_original}"
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300">
                          <span className="font-bold block">Encontrado no PDF:</span>
                          {inc.valor_encontrado || '—'}
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300">
                          <span className="font-bold block">Esperado / Lei:</span>
                          {inc.valor_esperado || '—'}
                        </div>
                      </div>

                      {inc.parecer_fiscal && (
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200">
                          <span className="font-bold block">Parecer do Fiscal:</span>
                          {inc.parecer_fiscal}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold"
                          onClick={() => {
                            setSelectedInconsistencia(inc)
                            setParecerTexto(inc.parecer_fiscal || '')
                            setStatusVal(
                              inc.status_validacao === 'desconsiderado'
                                ? 'desconsiderado'
                                : 'confirmado_fiscal',
                            )
                          }}
                        >
                          {inc.parecer_fiscal ? 'Editar Parecer do Fiscal' : 'Validar Apontamento'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Comparativo de Aditivos (Original vs Atual) */}
        <TabsContent value="aditivos" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Comparativo: Contrato Original vs. Termos Aditivos
              </h3>
              <p className="text-xs text-slate-500">
                Rastreamento cumulativo de acréscimos de valor e prazo em face dos limites da Lei
                14.133/21.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase">
                  Valor Global Original
                </CardDescription>
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {formatarMoeda(obra.valor_global_original)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase">
                  Valor Atual com Aditivos
                </CardDescription>
                <CardTitle className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase">
                  Acréscimo Cumulativo
                </CardDescription>
                <CardTitle className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  +{obra.percentual_aditado_total || 0}% / Limite:{' '}
                  {obra.limite_aditivo_percentual || 25}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {aditivos.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">
                Nenhum termo aditivo averbado até o momento. Contrato opera com valor original.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Termo Aditivo</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Data Assinatura</th>
                    <th className="p-3.5">Valor Aditado</th>
                    <th className="p-3.5">Impacto %</th>
                    <th className="p-3.5">Justificativa Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {aditivos.map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                        {ad.numero_termo}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px]">
                          {ad.tipo_aditivo}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {formatarData(ad.data_assinatura)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-blue-700 dark:text-blue-300">
                        +{formatarMoeda(ad.valor_aditado)}
                      </td>
                      <td className="p-3.5 font-bold text-amber-700">
                        +{ad.percentual_aditado_individual || 0}%
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs line-clamp-2">
                        {ad.justificativa || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* TAB 4: Medições e Liquidações Orçamentárias */}
        <TabsContent value="liquidacoes" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rastro de Liquidações & Execução Orçamentária
              </h3>
              <p className="text-xs text-slate-500">
                Sinais financeiros capturados dos sistemas de contabilidade municipal para verificar
                o ritmo da obra.
              </p>
            </div>
          </div>

          {liquidacoes.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">
                Nenhuma medição liquidada registrada para esta obra até o momento.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Medição / Empenho</th>
                    <th className="p-3.5">Data da Liquidação</th>
                    <th className="p-3.5">Valor Liquidado</th>
                    <th className="p-3.5">Avanço Medido</th>
                    <th className="p-3.5">Situação</th>
                    <th className="p-3.5">Observações da Fiscalização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {liquidacoes.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          {l.numero_medicao || 'Medição'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {l.numero_nota_empenho || ''}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {formatarData(l.data_liquidacao)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatarMoeda(l.valor_liquidado)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {l.percentual_medido ? `${l.percentual_medido}%` : '—'}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300"
                        >
                          {l.status_tramitacao || 'Liquidado'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs">
                        {l.observacoes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* TAB 5: Extração com IA & Metadados do PDF */}
        <TabsContent value="contrato_ia" className="space-y-4 pt-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base font-bold">
                  Metadados da Extração com IA (Skip AI Auditor)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                "Não treinamos modelo. Usamos modelo de linguagem apenas para converter texto
                jurídico em campos estruturados."
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Modelo de Extração
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {obra.extracao_ia_raw?.modelo || 'Skip AI PDF Extractor'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Páginas Processadas
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {obra.extracao_ia_raw?.paginas_lidas || 1} páginas
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Tempo de Leitura
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {obra.extracao_ia_raw?.tempo_processamento || '1.2s'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Confiança Global
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {((obra.extracao_ia_raw?.confianca_geral || 0.95) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {obra.extracao_ia_raw?.texto_destaque && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200">
                  <span className="font-bold block mb-1">Destaque de IA Identificado:</span>
                  <p className="italic">"{obra.extracao_ia_raw.texto_destaque}"</p>
                </div>
              )}

              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                <pre>{JSON.stringify(obra.extracao_ia_raw || {}, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para Parecer do Fiscal sobre Inconsistência */}
      <Dialog
        open={!!selectedInconsistencia}
        onOpenChange={(open) => !open && setSelectedInconsistencia(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Validar Inconsistência / Parecer do Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs">
              O sistema observa; quem conclui é o agente público.
            </DialogDescription>
          </DialogHeader>

          {selectedInconsistencia && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900">
                <span className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                  {selectedInconsistencia.titulo}
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedInconsistencia.descricao}
                </p>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Decisão do Fiscal:
                </label>
                <Select value={statusVal} onValueChange={(v: any) => setStatusVal(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmado_fiscal">
                      Confirmar Inconsistência (Registrar para Saneamento)
                    </SelectItem>
                    <SelectItem value="desconsiderado">
                      Desconsiderar (Justificado por Documento Apenso)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Parecer Técnico / Justificativa do Fiscal:
                </label>
                <Textarea
                  placeholder="Ex: Apontamento procedente. Notificada a contratada para retificação em termo de aditamento..."
                  value={parecerTexto}
                  onChange={(e) => setParecerTexto(e.target.value)}
                  rows={4}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedInconsistencia(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                  onClick={handleSalvarParecer}
                >
                  Gravar Parecer Oficial
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para Visualizar Trecho do PDF da Cláusula */}
      <Dialog open={!!modalTrechoPdf} onOpenChange={(open) => !open && setModalTrechoPdf(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Trecho Original do Instrumento ({modalTrechoPdf?.clausula})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rastreabilidade de texto original extraído do PDF.
            </DialogDescription>
          </DialogHeader>

          {modalTrechoPdf && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-lg font-serif italic text-sm leading-relaxed border border-slate-800">
                "{modalTrechoPdf.trecho}"
              </div>

              {modalTrechoPdf.penalidade && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300 font-semibold">
                  <span className="font-bold block text-[10px] uppercase">
                    Penalidade Vinculada:
                  </span>
                  {modalTrechoPdf.penalidade}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
