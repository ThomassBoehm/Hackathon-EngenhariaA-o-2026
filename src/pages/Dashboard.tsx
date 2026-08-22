import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  UploadCloud,
  Search,
  ArrowUpDown,
  Layers,
  Sparkles,
  Eye,
  Trash2,
  Edit,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getObrasList, deleteObra } from '@/services/obrasService'
import { ObraRecord, StatusClassificacao } from '@/types/sigo'
import { formatarMoeda, getStatusBadgeInfo } from '@/lib/sigoEngine'
import { toast } from '@/hooks/use-toast'

export default function Dashboard() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros avançados integrados
  const [buscaTexto, setBuscaTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroOrgao, setFiltroOrgao] = useState<string>('todos')
  const [filtroInconsistencia, setFiltroInconsistencia] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<
    'gravidade' | 'valor_desc' | 'valor_asc' | 'recente' | 'dias_liq'
  >('gravidade')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getObrasList()
    setObras(data)
    setLoading(false)
  }

  async function handleDelete(id: string, titulo: string) {
    if (window.confirm(`Confirma a exclusão do contrato da obra "${titulo}"?`)) {
      const ok = await deleteObra(id)
      if (ok) {
        toast({
          title: 'Contrato removido',
          description: 'O registro foi excluído da base do SIGO.',
        })
        loadData()
      }
    }
  }

  // Métricas de Resumo
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

  // Lista de órgãos únicos para o dropdown
  const orgaosDisponiveis = Array.from(new Set(obras.map((o) => o.orgao).filter(Boolean)))

  // Filtragem
  const obrasFiltradas = obras.filter((obra) => {
    // Busca texto
    const matchBusca =
      !buscaTexto ||
      obra.titulo.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      obra.numero_contrato.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      (obra.processo_adm && obra.processo_adm.toLowerCase().includes(buscaTexto.toLowerCase())) ||
      obra.contratada_nome.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      (obra.municipio && obra.municipio.toLowerCase().includes(buscaTexto.toLowerCase())) ||
      obra.objeto.toLowerCase().includes(buscaTexto.toLowerCase())

    // Status
    const matchStatus = filtroStatus === 'todos' || obra.status_classificacao === filtroStatus

    // Tipo
    const matchTipo = filtroTipo === 'todos' || obra.tipo_obra === filtroTipo

    // Órgão
    const matchOrgao = filtroOrgao === 'todos' || obra.orgao === filtroOrgao

    // Inconsistência
    const matchInc =
      filtroInconsistencia === 'todos' ||
      (filtroInconsistencia === 'com_inconsistencia' && obra.tem_inconsistencias) ||
      (filtroInconsistencia === 'sem_inconsistencia' && !obra.tem_inconsistencias)

    return matchBusca && matchStatus && matchTipo && matchOrgao && matchInc
  })

  // Ordenação
  const obrasOrdenadas = [...obrasFiltradas].sort((a, b) => {
    if (ordenacao === 'gravidade') {
      return (b.gravidade_score || 0) - (a.gravidade_score || 0)
    }
    if (ordenacao === 'valor_desc') {
      return (
        (b.valor_global_atual || b.valor_global_original || 0) -
        (a.valor_global_atual || a.valor_global_original || 0)
      )
    }
    if (ordenacao === 'valor_asc') {
      return (
        (a.valor_global_atual || a.valor_global_original || 0) -
        (b.valor_global_atual || b.valor_global_original || 0)
      )
    }
    if (ordenacao === 'dias_liq') {
      return (b.dias_sem_liquidacao || 0) - (a.dias_sem_liquidacao || 0)
    }
    if (ordenacao === 'recente') {
      return new Date(b.created || '').getTime() - new Date(a.created || '').getTime()
    }
    return 0
  })

  const limparFiltros = () => {
    setBuscaTexto('')
    setFiltroStatus('todos')
    setFiltroTipo('todos')
    setFiltroOrgao('todos')
    setFiltroInconsistencia('todos')
    setOrdenacao('gravidade')
  }

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

      {/* Seção Principal: Barra de Filtros Avançados + Grid de Cards de Obras & Contratos */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-700" />
              Carteira de Obras e Contratos Públicos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtros avançados e ordenação por índice de gravidade{' '}
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-blue-700 dark:text-blue-300">
                G = A × log₁₀(V) × S
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
              {obrasOrdenadas.length} de {obras.length} {obras.length === 1 ? 'obra' : 'obras'}
            </Badge>
          </div>
        </div>

        {/* Barra de Filtros Avançados */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Busca Textual & Ordenação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número do contrato, título, contratada, processo administrativo, município..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={ordenacao} onValueChange={(val: any) => setOrdenacao(val)}>
                  <SelectTrigger className="w-[200px] text-xs font-medium">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gravidade">Maior Gravidade (G)</SelectItem>
                    <SelectItem value="dias_liq">Mais Dias sem Liquidação</SelectItem>
                    <SelectItem value="valor_desc">Maior Valor Global</SelectItem>
                    <SelectItem value="valor_asc">Menor Valor Global</SelectItem>
                    <SelectItem value="recente">Mais Recente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros em Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Status */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Estado Contratual
                </label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Estados</SelectItem>
                    <SelectItem value="prazo_vencido">Prazo Vencido</SelectItem>
                    <SelectItem value="fora_do_ritmo">Fora do Ritmo</SelectItem>
                    <SelectItem value="no_ritmo">No Ritmo Previsto</SelectItem>
                    <SelectItem value="sem_dados">Sem Dados de Execução</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Obra */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Tipo de Obra
                </label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="Edificação">Edificação</SelectItem>
                    <SelectItem value="Saneamento">Saneamento</SelectItem>
                    <SelectItem value="Pavimentação/Vias">Pavimentação/Vias</SelectItem>
                    <SelectItem value="Habitação">Habitação</SelectItem>
                    <SelectItem value="Saúde/UBS">Saúde/UBS</SelectItem>
                    <SelectItem value="Educação/Escolas">Educação/Escolas</SelectItem>
                    <SelectItem value="Serviço Continuado">Serviço Continuado</SelectItem>
                    <SelectItem value="Aquisição/Outro">Aquisição/Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Órgão */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Órgão / Secretaria
                </label>
                <Select value={filtroOrgao} onValueChange={setFiltroOrgao}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Órgão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Órgãos</SelectItem>
                    {orgaosDisponiveis.map((org) => (
                      <SelectItem key={org} value={org}>
                        {org}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inconsistências de Texto */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Inconsistências (4 Checagens)
                </label>
                <Select value={filtroInconsistencia} onValueChange={setFiltroInconsistencia}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Inconsistências" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="com_inconsistencia">Com Inconsistência Detectada</SelectItem>
                    <SelectItem value="sem_inconsistencia">Sem Inconsistências</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(buscaTexto ||
              filtroStatus !== 'todos' ||
              filtroTipo !== 'todos' ||
              filtroOrgao !== 'todos' ||
              filtroInconsistencia !== 'todos') && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <span>
                  Exibindo <strong>{obrasOrdenadas.length}</strong> de {obras.length} contratos
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="h-7 text-xs text-blue-700"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grid de Cards de Obras (3 Colunas) */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            Carregando dados das obras do SIGO...
          </div>
        ) : obrasOrdenadas.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              Nenhum contrato encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tente modificar os termos de busca ou filtros aplicados acima.
            </p>
            <Button variant="outline" size="sm" onClick={limparFiltros} className="mt-4 text-xs">
              Restaurar Filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {obrasOrdenadas.map((obra) => {
              const badgeInfo = getStatusBadgeInfo(obra.status_classificacao)
              const percLiq = obra.porcentagem_liquidada || 0
              const percPrazo = obra.porcentagem_prazo_decorrido || 0

              return (
                <Card
                  key={obra.id}
                  className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all overflow-hidden relative ${badgeInfo.cardBorder}`}
                >
                  {/* Header do Card */}
                  <CardHeader className="p-5 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        Nº {obra.numero_contrato}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeInfo.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot}`} />
                        {badgeInfo.label}
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-blue-700">
                      <Link to={`/obras/${obra.id}`}>{obra.titulo}</Link>
                    </CardTitle>

                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {obra.objeto}
                    </CardDescription>
                  </CardHeader>

                  {/* Conteúdo Central */}
                  <CardContent className="p-5 pt-0 space-y-3.5 text-xs">
                    {/* Badges de Destaque */}
                    <div className="flex flex-wrap gap-1.5">
                      {obra.tipo_obra && (
                        <Badge variant="secondary" className="text-[10px]">
                          {obra.tipo_obra}
                        </Badge>
                      )}
                      {obra.tem_marco_vencido && (
                        <Badge className="bg-red-600 text-white text-[10px]">Marco Vencido</Badge>
                      )}
                      {obra.tem_inconsistencias && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
                        >
                          Inconsistência Texto
                        </Badge>
                      )}
                      {obra.qtd_aditivos && obra.qtd_aditivos > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300"
                        >
                          {obra.qtd_aditivos} Aditivo(s) (+{obra.percentual_aditado_total}%)
                        </Badge>
                      ) : null}
                    </div>

                    {/* Detalhes Financeiros e Gravidade */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-2 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Valor Atual:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Dias s/ Liquidação:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {obra.dias_sem_liquidacao !== undefined
                            ? `${obra.dias_sem_liquidacao} dias`
                            : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                          Gravidade (G):
                        </span>
                        <span
                          className={`font-mono font-black text-sm ${
                            obra.gravidade_score > 10
                              ? 'text-red-600'
                              : obra.gravidade_score > 3
                                ? 'text-amber-600'
                                : obra.gravidade_score > 0
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                          }`}
                        >
                          {obra.gravidade_score > 0 ? obra.gravidade_score.toFixed(2) : '0,00'}
                        </span>
                      </div>
                    </div>

                    {/* Execução Comparada (Prazo x Liquidado) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                          Prazo Decorrido: <strong>{percPrazo.toFixed(0)}%</strong>
                        </span>
                        <span>
                          Liquidado: <strong>{percLiq.toFixed(0)}%</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-slate-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, percPrazo)}%` }}
                          />
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, percLiq)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                      <div>
                        Contratada:{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {obra.contratada_nome}
                        </strong>
                      </div>
                      <div>
                        Órgão:{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {obra.orgao} ({obra.municipio}/{obra.estado_uf})
                        </strong>
                      </div>
                    </div>
                  </CardContent>

                  {/* Footer de Ações */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Link to={`/obras/${obra.id}`}>
                      <Button
                        size="sm"
                        className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold h-8"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Ver Apontamentos
                      </Button>
                    </Link>

                    <div className="flex items-center gap-1">
                      <Link to={`/obras/${obra.id}/editar`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-700"
                          title="Editar Contrato"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => handleDelete(obra.id, obra.titulo)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
