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

  // Modais de criação rápida (para o fiscal adicionar novos registros na tela)
  const [modalNovaObrigacao, setModalNovaObrigacao] = useState(false)
  const [formObrigacao, setFormObrigacao] = useState<Partial<ObrigacaoRecord>>({
    clausula: '',
    descricao: '',
    responsavel: 'Contratada',
    tipo_regua: 'marco_contratual',
    prazo_texto: '',
    data_limite: '',
    penalidade_associada: '',
    penalidade_percentual: 10,
    status_cumprimento: 'no_prazo',
    dias_atraso: 0,
    confianca: 'alta',
  })

  const [modalNovoAditivo, setModalNovoAditivo] = useState(false)
  const [formAditivo, setFormAditivo] = useState<Partial<AditivoRecord>>({
    numero_termo: '',
    tipo_aditivo: 'Valor (Acréscimo)',
    data_assinatura: new Date().toISOString().split('T')[0],
    justificativa: '',
    valor_aditado: 0,
    percentual_aditado_individual: 0,
    prazo_aditado_dias: 0,
    limite_legal_percentual: 25,
  })

  const [modalNovaLiquidacao, setModalNovaLiquidacao] = useState(false)
  const [formLiquidacao, setFormLiquidacao] = useState<Partial<LiquidacaoRecord>>({
    numero_medicao: '',
    numero_nota_empenho: '',
    data_liquidacao: new Date().toISOString().split('T')[0],
    valor_liquidado: 0,
    percentual_medido: 0,
    status_tramitacao: 'Liquidado e Pago',
    observacoes: '',
  })

  async function handleCriarObrigacao() {
    if (!id || !formObrigacao.clausula || !formObrigacao.descricao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a cláusula e a descrição da obrigação.',
        variant: 'destructive',
      })
      return
    }
    try {
      await createObrigacao({
        ...formObrigacao,
        obra_id: id,
      })
      toast({
        title: 'Obrigação cadastrada',
        description: 'Novo marco/obrigação registrado com sucesso.',
      })
      setModalNovaObrigacao(false)
      setFormObrigacao({
        clausula: '',
        descricao: '',
        responsavel: 'Contratada',
        tipo_regua: 'marco_contratual',
        prazo_texto: '',
        data_limite: '',
        penalidade_associada: '',
        penalidade_percentual: 10,
        status_cumprimento: 'no_prazo',
        dias_atraso: 0,
        confianca: 'alta',
      })
      loadAll(id)
    } catch (e: any) {
      toast({
        title: 'Erro ao cadastrar',
        description: e.message || 'Não foi possível salvar a obrigação.',
        variant: 'destructive',
      })
    }
  }

  async function handleCriarAditivo() {
    if (!id || !formAditivo.numero_termo || !formAditivo.justificativa) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o número do termo e a justificativa.',
        variant: 'destructive',
      })
      return
    }
    try {
      await createAditivo({
        ...formAditivo,
        obra_id: id,
        alerta_limite_ultrapassado:
          (formAditivo.percentual_aditado_individual || 0) >
          (formAditivo.limite_legal_percentual || 25),
      })
      toast({
        title: 'Termo Aditivo averbado',
        description: 'Aditivo registrado com sucesso.',
      })
      setModalNovoAditivo(false)
      loadAll(id)
    } catch (e: any) {
      toast({
        title: 'Erro ao cadastrar',
        description: e.message || 'Não foi possível salvar o aditivo.',
        variant: 'destructive',
      })
    }
  }

  async function handleCriarLiquidacao() {
    if (!id || !formLiquidacao.data_liquidacao || !formLiquidacao.valor_liquidado) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a data e o valor liquidado.',
        variant: 'destructive',
      })
      return
    }
    try {
      await createLiquidacao({
        ...formLiquidacao,
        obra_id: id,
      })
      toast({
        title: 'Liquidação registrada',
        description: 'Nova medição/liquidação contabilizada com sucesso.',
      })
      setModalNovaLiquidacao(false)
      loadAll(id)
    } catch (e: any) {
      toast({
        title: 'Erro ao cadastrar',
        description: e.message || 'Não foi possível salvar a liquidação.',
        variant: 'destructive',
      })
    }
  }

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

      {/* Resumo do Contrato em Linguagem Cidadã */}
      {obra.resumo && (
        <Card className="bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600" />
          <CardHeader className="pb-2 pl-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              </div>
              <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-200">
                Resumo do contrato
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-blue-700/80 dark:text-blue-300/80">
              Explicação em linguagem simples para o cidadão
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-6">
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {obra.resumo}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hero Banner de Classificação e Apontamento Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Card Estado & Apontamento */}
        <Card
          className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${badgeInfo.cardBorder} shadow-sm`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeInfo.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${badgeInfo.dot}`} />
                {badgeInfo.label}
              </span>
              <span className="text-xs text-slate-500">Resultado da análise atualizado</span>
            </div>

            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white pt-2">
              Status do sistema: o que o SIGO detectou
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Box Destacado do Apontamento */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 font-medium space-y-2 border border-slate-800">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">
                    {badgeInfo.label === 'Fora do ritmo'
                      ? 'Obra fora do ritmo de execução'
                      : 'Execução dentro do prazo'}
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
                  1. Entregas da empresa (Contratada)
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-tight">
                  {obra.tem_marco_vencido
                    ? 'Há entregas atrasadas sem carência.'
                    : 'Entregas datadas cumpridas ou no prazo.'}
                </p>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  2. Liquidações (Administração)
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-tight">
                  {obra.dias_sem_liquidacao || 0} dias sem pagamento. Carência de trâmite de{' '}
                  {obra.carencia_dias || 15} dias aplicada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com os Detalhes da Auditoria */}
      <Tabs defaultValue="obrigacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="obrigacoes" className="text-xs py-2 font-semibold">
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            O que o contrato promete ({obrigacoes.length})
          </TabsTrigger>
          <TabsTrigger value="inconsistencias" className="text-xs py-2 font-semibold relative">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
            Problemas encontrados ({inconsistencias.length})
            {inconsistencias.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-2 right-2" />
            )}
          </TabsTrigger>
          <TabsTrigger value="aditivos" className="text-xs py-2 font-semibold">
            <Scale className="h-3.5 w-3.5 mr-1.5" />
            Mudanças no contrato ({aditivos.length})
          </TabsTrigger>
          <TabsTrigger value="liquidacoes" className="text-xs py-2 font-semibold">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Liquidações Financeiras ({liquidacoes.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Obrigações e Marcos Contratuais */}
        <TabsContent value="obrigacoes" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                O que o contrato promete ({obrigacoes.length})
              </h3>
              <p className="text-xs text-slate-500">
                Cada item vinculado à cláusula original e à multa prevista no contrato.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalNovaObrigacao(true)}
              className="text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar item
            </Button>
          </div>

          {obrigacoes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">Nenhum item cadastrado ainda.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">Cláusula & Descrição</th>
                      <th className="p-3.5">Responsável</th>
                      <th className="p-3.5">Regras do contrato</th>
                      <th className="p-3.5">Prazo combinado</th>
                      <th className="p-3.5">Multa prevista</th>
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
                Problemas no texto
              </h3>
              <p className="text-xs text-slate-500">
                4 verificações automáticas: cláusula inexistente, número por extenso divergente,
                conta errada e identificador conflitante.
              </p>
            </div>
          </div>

          {inconsistencias.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-emerald-300">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Sem problemas
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                O contrato passou nas 4 verificações sem problemas.
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
                          {inc.parecer_fiscal ? 'Editar parecer' : 'Ver detalhes'}
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
                Mudanças no contrato ({aditivos.length})
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento de acréscimos de valor e prazo, conforme limites da Lei 14.133/21.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalNovoAditivo(true)}
              className="text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar mudança
            </Button>
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
                  Valor atual com mudanças
                </CardDescription>
                <CardTitle className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase">
                  Acréscimo acumulado
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
                Nenhuma mudança registrada até o momento. Contrato opera com valor original.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Mudança</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Data assinatura</th>
                    <th className="p-3.5">Valor alterado</th>
                    <th className="p-3.5">Impacto %</th>
                    <th className="p-3.5">Justificativa</th>
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

        {/* TAB 4: Liquidações Financeiras Orçamentárias */}
        <TabsContent value="liquidacoes" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rastro de Liquidações & Execução Orçamentária ({liquidacoes.length})
              </h3>
              <p className="text-xs text-slate-500">
                Sinais financeiros capturados dos sistemas de contabilidade municipal para verificar
                o ritmo da obra.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalNovaLiquidacao(true)}
              className="text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Registrar Liquidação
            </Button>
          </div>

          {liquidacoes.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">
                Nenhuma liquidação registrada para esta obra até o momento.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Nota de Empenho</th>
                    <th className="p-3.5">Data da Liquidação</th>
                    <th className="p-3.5">Valor Liquidado</th>
                    <th className="p-3.5">Situação</th>
                    <th className="p-3.5">Observações da Fiscalização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {liquidacoes.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white font-mono">
                        {l.numero_nota_empenho || '—'}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {formatarData(l.data_liquidacao)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatarMoeda(l.valor_liquidado)}
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
              Ver detalhes / Parecer do fiscal
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
                      Confirmar problema (Registrar para correção)
                    </SelectItem>
                    <SelectItem value="desconsiderado">
                      Desconsiderar (justificado por documento anexo)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Parecer / Justificativa do fiscal:
                </label>
                <Textarea
                  placeholder="Ex: Alerta procedente. Contratada notificada para correção..."
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
                  Salvar parecer
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

      {/* Modal Adicionar Nova Obrigação */}
      <Dialog open={modalNovaObrigacao} onOpenChange={setModalNovaObrigacao}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              Adicionar item do contrato
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre uma entrega ou obrigação com a multa prevista no contrato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold block mb-1">Cláusula / Identificador *</label>
              <Input
                placeholder="Ex: Cláusula 3.2 - Entrega da Estrutura"
                value={formObrigacao.clausula || ''}
                onChange={(e) => setFormObrigacao({ ...formObrigacao, clausula: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Descrição da entrega / obrigação *</label>
              <Textarea
                placeholder="Ex: Conclusão e entrega da laje de cobertura..."
                value={formObrigacao.descricao || ''}
                onChange={(e) => setFormObrigacao({ ...formObrigacao, descricao: e.target.value })}
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Responsável</label>
                <Select
                  value={formObrigacao.responsavel}
                  onValueChange={(v: any) => setFormObrigacao({ ...formObrigacao, responsavel: v })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contratada">Contratada</SelectItem>
                    <SelectItem value="Administração">Administração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-bold block mb-1">Regras do contrato</label>
                <Select
                  value={formObrigacao.tipo_regua}
                  onValueChange={(v: any) => setFormObrigacao({ ...formObrigacao, tipo_regua: v })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marco_contratual">Marco Contratual</SelectItem>
                    <SelectItem value="liquidacao_medicao">Liquidação / Medição</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Prazo combinado (texto)</label>
                <Input
                  placeholder="Ex: 90 dias da OS"
                  value={formObrigacao.prazo_texto || ''}
                  onChange={(e) =>
                    setFormObrigacao({ ...formObrigacao, prazo_texto: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Data limite (calendário)</label>
                <Input
                  type="date"
                  value={formObrigacao.data_limite || ''}
                  onChange={(e) =>
                    setFormObrigacao({ ...formObrigacao, data_limite: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Multa prevista</label>
                <Input
                  placeholder="Ex: Multa de 10% sobre saldo"
                  value={formObrigacao.penalidade_associada || ''}
                  onChange={(e) =>
                    setFormObrigacao({ ...formObrigacao, penalidade_associada: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Status</label>
                <Select
                  value={formObrigacao.status_cumprimento}
                  onValueChange={(v: any) =>
                    setFormObrigacao({ ...formObrigacao, status_cumprimento: v })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_prazo">No Prazo</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cumprido">Cumprido</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalNovaObrigacao(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                onClick={handleCriarObrigacao}
              >
                Salvar item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Novo Aditivo */}
      <Dialog open={modalNovoAditivo} onOpenChange={setModalNovoAditivo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Adicionar mudança ao contrato
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre mudança de valor ou prazo para verificar o limite legal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Número da mudança *</label>
                <Input
                  placeholder="Ex: 1ª mudança"
                  value={formAditivo.numero_termo || ''}
                  onChange={(e) => setFormAditivo({ ...formAditivo, numero_termo: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Tipo de mudança</label>
                <Select
                  value={formAditivo.tipo_aditivo}
                  onValueChange={(v: any) => setFormAditivo({ ...formAditivo, tipo_aditivo: v })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Valor (Acréscimo)">Valor (Acréscimo)</SelectItem>
                    <SelectItem value="Valor (Supressão)">Valor (Supressão)</SelectItem>
                    <SelectItem value="Prazo (Prorrogação)">Prazo (Prorrogação)</SelectItem>
                    <SelectItem value="Misto (Prazo e Valor)">Misto (Prazo e Valor)</SelectItem>
                    <SelectItem value="Qualitativo/Readequação">Qualitativo/Readequação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1">Justificativa *</label>
              <Textarea
                placeholder="Ex: Acréscimo de quantitativos e readequação de fundações..."
                value={formAditivo.justificativa || ''}
                onChange={(e) => setFormAditivo({ ...formAditivo, justificativa: e.target.value })}
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold block mb-1">Valor alterado (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formAditivo.valor_aditado || 0}
                  onChange={(e) =>
                    setFormAditivo({
                      ...formAditivo,
                      valor_aditado: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">% alterado (individual)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formAditivo.percentual_aditado_individual || 0}
                  onChange={(e) =>
                    setFormAditivo({
                      ...formAditivo,
                      percentual_aditado_individual: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Data Assinatura</label>
                <Input
                  type="date"
                  value={formAditivo.data_assinatura || ''}
                  onChange={(e) =>
                    setFormAditivo({ ...formAditivo, data_assinatura: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalNovoAditivo(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                onClick={handleCriarAditivo}
              >
                Salvar mudança
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Nova Liquidação */}
      <Dialog open={modalNovaLiquidacao} onOpenChange={setModalNovaLiquidacao}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Registrar Liquidação Financeira
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lançamento contábil e orçamentário de medição da obra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Número da Medição</label>
                <Input
                  placeholder="Ex: 3ª Medição"
                  value={formLiquidacao.numero_medicao || ''}
                  onChange={(e) =>
                    setFormLiquidacao({ ...formLiquidacao, numero_medicao: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nota de Empenho</label>
                <Input
                  placeholder="Ex: NE-2026/00451"
                  value={formLiquidacao.numero_nota_empenho || ''}
                  onChange={(e) =>
                    setFormLiquidacao({ ...formLiquidacao, numero_nota_empenho: e.target.value })
                  }
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold block mb-1">Data da Liquidação *</label>
                <Input
                  type="date"
                  value={formLiquidacao.data_liquidacao || ''}
                  onChange={(e) =>
                    setFormLiquidacao({ ...formLiquidacao, data_liquidacao: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Valor Liquidado (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formLiquidacao.valor_liquidado || 0}
                  onChange={(e) =>
                    setFormLiquidacao({
                      ...formLiquidacao,
                      valor_liquidado: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">% Medido</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formLiquidacao.percentual_medido || 0}
                  onChange={(e) =>
                    setFormLiquidacao({
                      ...formLiquidacao,
                      percentual_medido: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1">Observações da Fiscalização</label>
              <Textarea
                placeholder="Ex: Medição física dos serviços de alvenaria e instalações elétricas..."
                value={formLiquidacao.observacoes || ''}
                onChange={(e) =>
                  setFormLiquidacao({ ...formLiquidacao, observacoes: e.target.value })
                }
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalNovaLiquidacao(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                onClick={handleCriarLiquidacao}
              >
                Salvar Liquidação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
