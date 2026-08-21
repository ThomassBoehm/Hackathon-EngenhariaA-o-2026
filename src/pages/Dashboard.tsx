import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  UploadCloud,
  ArrowRight,
  FileText,
  ShieldAlert,
  DollarSign,
  Calendar,
  Filter,
  BarChart3,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getObrasList } from '@/services/obrasService'
import { ObraRecord, StatusClassificacao } from '@/types/sigo'
import { formatarMoeda, formatarData, getStatusBadgeInfo } from '@/lib/sigoEngine'

export default function Dashboard() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<StatusClassificacao | 'todos'>('todos')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getObrasList()
      setObras(data)
      setLoading(false)
    }
    loadData()
  }, [])

  // Métricas
  const totalObras = obras.length
  const prazoVencido = obras.filter((o) => o.status_classificacao === 'prazo_vencido')
  const foraRitmo = obras.filter((o) => o.status_classificacao === 'fora_do_ritmo')
  const noRitmo = obras.filter((o) => o.status_classificacao === 'no_ritmo')
  const semDados = obras.filter((o) => o.status_classificacao === 'sem_dados')

  const valorTotalCarteira = obras.reduce(
    (acc, o) => acc + (o.valor_global_atual || o.valor_global_original || 0),
    0,
  )
  const valorTotalLiquidado = obras.reduce((acc, o) => acc + (o.valor_total_liquidado || 0), 0)
  const percLiquidacaoGlobal =
    valorTotalCarteira > 0 ? (valorTotalLiquidado / valorTotalCarteira) * 100 : 0

  const obrasComInconsistencias = obras.filter((o) => o.tem_inconsistencias).length
  const obrasComMarcoVencido = obras.filter((o) => o.tem_marco_vencido).length

  // Filtragem
  const obrasFiltradas =
    filtroStatus === 'todos' ? obras : obras.filter((o) => o.status_classificacao === filtroStatus)

  // Ordenadas por Gravidade
  const rankingGravidade = [...obrasFiltradas].sort(
    (a, b) => (b.gravidade_score || 0) - (a.gravidade_score || 0),
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner SIGO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-blue-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Priorização Determinística de Fiscalização
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Onde o fiscal deve olhar primeiro.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              O SIGO extrai as réguas do contrato em PDF, vigia o silêncio de liquidações
              orçamentárias e ranqueia a carteira por gravidade de impacto econômico.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/upload">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/40">
                <UploadCloud className="h-4 w-4 mr-2" />
                Extrair Novo Contrato (PDF)
              </Button>
            </Link>
            <Link to="/obras">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Ver Carteira Completa
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      {/* 4 Cards de Estado - Conforme Item 5 e 9 do PDF */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-700" />
              Classificação da Carteira de Contratos
            </h2>
            <p className="text-xs text-slate-500">
              Clique no cartão para filtrar a lista abaixo por estado contratual
            </p>
          </div>
          {filtroStatus !== 'todos' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltroStatus('todos')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Limpar filtro ({obras.length} contratos)
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Prazo Vencido (Vermelho) */}
          <button
            onClick={() =>
              setFiltroStatus(filtroStatus === 'prazo_vencido' ? 'todos' : 'prazo_vencido')
            }
            className={`text-left transition-all p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md relative overflow-hidden ${
              filtroStatus === 'prazo_vencido'
                ? 'ring-2 ring-red-500 border-red-500 bg-red-50/20 dark:bg-red-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-red-300'
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Prazo Vencido
              </span>
              <span className="text-2xl font-black text-red-600 dark:text-red-400">
                {loading ? '-' : prazoVencido.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Passou ciclo + carência (15d) ou marco datado vencido.
            </p>
            <div className="mt-3 text-[11px] text-red-800 dark:text-red-300 font-semibold bg-red-100/70 dark:bg-red-950/60 px-2 py-1 rounded inline-block">
              {obrasComMarcoVencido} com marco vencido
            </div>
          </button>

          {/* Card 2: Fora do Ritmo (Âmbar) */}
          <button
            onClick={() =>
              setFiltroStatus(filtroStatus === 'fora_do_ritmo' ? 'todos' : 'fora_do_ritmo')
            }
            className={`text-left transition-all p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md relative overflow-hidden ${
              filtroStatus === 'fora_do_ritmo'
                ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                Fora do Ritmo
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {loading ? '-' : foraRitmo.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Na carência · ou descompasso ≥ 20 p.p. de execução.
            </p>
            <div className="mt-3 text-[11px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-100/70 dark:bg-amber-950/60 px-2 py-1 rounded inline-block">
              Alerta prévio de mora
            </div>
          </button>

          {/* Card 3: No Ritmo (Verde) */}
          <button
            onClick={() => setFiltroStatus(filtroStatus === 'no_ritmo' ? 'todos' : 'no_ritmo')}
            className={`text-left transition-all p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md relative overflow-hidden ${
              filtroStatus === 'no_ritmo'
                ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No Ritmo Previsto
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {loading ? '-' : noRitmo.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Dentro do ciclo pactuado e cronograma compatível.
            </p>
            <div className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-1 rounded inline-block">
              Liquidação regular
            </div>
          </button>

          {/* Card 4: Sem Dados (Cinza/Neutro) */}
          <button
            onClick={() => setFiltroStatus(filtroStatus === 'sem_dados' ? 'todos' : 'sem_dados')}
            className={`text-left transition-all p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md relative overflow-hidden ${
              filtroStatus === 'sem_dados'
                ? 'ring-2 ring-slate-500 border-slate-500 bg-slate-50 dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-400" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-slate-500" />
                Sem Dados Execução
              </span>
              <span className="text-2xl font-black text-slate-600 dark:text-slate-400">
                {loading ? '-' : semDados.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Sem âncora ou periodicidade. Fora do ranking de gravidade.
            </p>
            <div className="mt-3 text-[11px] text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
              Sinaliza sem acusar
            </div>
          </button>
        </div>
      </div>

      {/* Resumo Financeiro e Indicadores de Risco */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Volume Total da Carteira Monitorada
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-900 dark:text-blue-200">
              {formatarMoeda(valorTotalCarteira)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span>Liquidado: {formatarMoeda(valorTotalLiquidado)}</span>
                <span>{percLiquidacaoGlobal.toFixed(1)}%</span>
              </div>
              <Progress value={percLiquidacaoGlobal} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Checagens de Coerência (Sem IA)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {obrasComInconsistencias} Contratos com Apontamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Divergências de número/extenso, referências a cláusulas inexistentes e limites de
              aditivos incompatíveis.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Carência de Trâmite Fixa
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              15 Dias Padrão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Aplica-se unicamente ao silêncio financeiro de liquidação. Marcos contratuais não
              recebem carência.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Priorização Ranqueada por Gravidade */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lista Priorizada de Contratos
              </h3>
              <Badge variant="outline" className="font-mono text-xs">
                {obrasFiltradas.length} {obrasFiltradas.length === 1 ? 'contrato' : 'contratos'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordenação estrita pela fórmula de gravidade:{' '}
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-blue-700 dark:text-blue-300">
                G = A × log₁₀(V) × S
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/obras">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Abrir Grid Completo
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Carregando base de contratos do SIGO...
          </div>
        ) : rankingGravidade.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Nenhum contrato encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rankingGravidade.map((obra) => {
              const badgeInfo = getStatusBadgeInfo(obra.status_classificacao)
              const temMarco = obra.tem_marco_vencido
              const temInc = obra.tem_inconsistencias

              return (
                <div
                  key={obra.id}
                  className={`p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${badgeInfo.cardBorder}`}
                >
                  {/* Informações Principais do Contrato */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        Nº {obra.numero_contrato}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeInfo.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badgeInfo.dot}`} />
                        {badgeInfo.label}
                      </span>

                      {obra.tipo_obra && (
                        <Badge variant="secondary" className="text-[11px]">
                          {obra.tipo_obra}
                        </Badge>
                      )}

                      {temMarco && (
                        <Badge className="bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700">
                          Marco Vencido
                        </Badge>
                      )}

                      {temInc && (
                        <Badge
                          variant="outline"
                          className="text-[11px] border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
                        >
                          Inconsistência de Texto
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                      <Link
                        to={`/obras/${obra.id}`}
                        className="hover:text-blue-700 hover:underline"
                      >
                        {obra.titulo}
                      </Link>
                    </h4>

                    {/* Justificativa / Apontamento com Citação */}
                    <div className="p-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                          Apontamento:
                        </span>
                        <span>
                          {obra.resumo_motivo_status ||
                            'Em conformidade com as cláusulas contratuais.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Órgão:{' '}
                        <strong>
                          {obra.orgao} ({obra.municipio}/{obra.estado_uf})
                        </strong>
                      </span>
                      <span>
                        Contratada: <strong>{obra.contratada_nome}</strong>
                      </span>
                      <span>
                        Valor Atual:{' '}
                        <strong>
                          {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Painel Lateral com Gravidade e Indicadores */}
                  <div className="flex sm:items-center justify-between lg:flex-col lg:items-end gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    {/* Gravidade Score */}
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Índice Gravidade (G)
                      </div>
                      <div className="flex items-baseline gap-1 lg:justify-end">
                        <span
                          className={`text-2xl font-black ${
                            obra.gravidade_score > 10
                              ? 'text-red-600'
                              : obra.gravidade_score > 3
                                ? 'text-amber-600'
                                : obra.gravidade_score > 0
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                          }`}
                        >
                          {obra.gravidade_score > 0 ? obra.gravidade_score.toFixed(2) : '—'}
                        </span>
                        {obra.periodicidade_tipo === 'ausente' && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            (sem periodicidade)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {obra.dias_sem_liquidacao || 0} dias sem liq.
                      </div>
                    </div>

                    {/* Botão para ver Contrato / Apontamentos */}
                    <Link to={`/obras/${obra.id}`}>
                      <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        Fiscalizar Obra
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Seção dos 3 Contratos Reais da Validação do Hackathon */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-blue-700" />
          <h3 className="text-base font-bold text-blue-950 dark:text-blue-200">
            Contratos Analisados e Validados na Documentação Oficial
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 max-w-3xl">
          Evidência empírica documentada no PDF: Os 3 contratos reais apresentaram inconsistências e
          comportamentos distintos de réguas contratuais.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
            <span className="font-bold text-red-600 block mb-1">
              041/2026 · São Pedro do Turvo/SP
            </span>
            <span className="text-slate-600 dark:text-slate-400 block">
              R$ 2.734.800,00 · Obra Habitacional
            </span>
            <span className="text-slate-500 text-[11px] mt-1 block">
              Escada completa de penalidade, 47d atraso, marco vencido, aditivo incompatível de 50%.
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
            <span className="font-bold text-amber-600 block mb-1">133/2026 · Pontal/SP</span>
            <span className="text-slate-600 dark:text-slate-400 block">
              R$ 469.470,00 · Serviço Continuado
            </span>
            <span className="text-slate-500 text-[11px] mt-1 block">
              Periodicidade inferida (12x MÊS), S = 1.0 (remetido ao TR), divergência extenso 12
              (dez).
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
            <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
              2-DLE-086-2026 · Teixeira de Freitas/BA
            </span>
            <span className="text-slate-600 dark:text-slate-400 block">
              R$ 19.683,44 · Aquisição / Saneamento
            </span>
            <span className="text-slate-500 text-[11px] mt-1 block">
              Entrega única, periodicidade ausente, sinalizado sem imputação determinística no
              ranking.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
