import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  UploadCloud,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Eye,
  Trash2,
  Edit,
  ArrowUpDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getObrasList, deleteObra } from '@/services/obrasService'
import { ObraRecord, StatusClassificacao, TipoObra } from '@/types/sigo'
import { formatarMoeda, formatarData, getStatusBadgeInfo } from '@/lib/sigoEngine'
import { toast } from '@/hooks/use-toast'

export default function ObrasList() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()

  const [buscaTexto, setBuscaTexto] = useState(searchParams.get('q') || '')
  const [filtroStatus, setFiltroStatus] = useState<string>(searchParams.get('status') || 'todos')
  const [filtroTipo, setFiltroTipo] = useState<string>(searchParams.get('tipo') || 'todos')
  const [filtroOrgao, setFiltroOrgao] = useState<string>(searchParams.get('orgao') || 'todos')
  const [filtroInconsistencia, setFiltroInconsistencia] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<
    'status' | 'valor_desc' | 'valor_asc' | 'recente' | 'dias_liq'
  >('status')

  useEffect(() => {
    loadObras()
  }, [])

  async function loadObras() {
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
        loadObras()
      }
    }
  }

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

    // Status binário público
    const isFora =
      obra.status_classificacao === 'prazo_vencido' || obra.status_classificacao === 'fora_do_ritmo'
    const matchStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'fora_do_ritmo' && isFora) ||
      (filtroStatus === 'dentro_do_prazo' && !isFora)

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
    if (ordenacao === 'status') {
      // Fora do ritmo primeiro
      const aFora =
        a.status_classificacao === 'prazo_vencido' || a.status_classificacao === 'fora_do_ritmo'
      const bFora =
        b.status_classificacao === 'prazo_vencido' || b.status_classificacao === 'fora_do_ritmo'
      return Number(bFora) - Number(aFora)
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
    setOrdenacao('status')
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-700" />
            Carteira de Obras e Contratos Públicos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão completa, status de execução (dentro do prazo / fora do ritmo) e monitoramento
            das regras do contrato.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/upload">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              Upload de Contrato (IA)
            </Button>
          </Link>
          <Link to="/obras/nova">
            <Button
              variant="outline"
              className="font-semibold flex items-center gap-2 border-slate-300"
            >
              <PlusCircle className="h-4 w-4 text-blue-600" />
              Nova Obra Manual
            </Button>
          </Link>
        </div>
      </div>

      {/* Barra de Filtros Avançados */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-4 space-y-4">
          {/* Busca Textual */}
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
                  <SelectItem value="status">Fora do ritmo primeiro</SelectItem>
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
                Status
              </label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="dentro_do_prazo">Dentro do prazo</SelectItem>
                  <SelectItem value="fora_do_ritmo">Fora do ritmo</SelectItem>
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

            {/* Problemas no texto */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Problemas no texto
              </label>
              <Select value={filtroInconsistencia} onValueChange={setFiltroInconsistencia}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Problemas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="com_inconsistencia">Com problemas</SelectItem>
                  <SelectItem value="sem_inconsistencia">Sem problemas</SelectItem>
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

      {/* Grid de Cards de Obras */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-sm">Carregando dados das obras...</div>
      ) : obrasOrdenadas.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Nenhum contrato encontrado
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Tente modificar os termos de busca ou filtros aplicados.
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
                        className="text-[10px] border-amber-400 text-amber-800 bg-amber-50"
                      >
                        Problemas no texto
                      </Badge>
                    )}
                    {obra.qtd_aditivos && obra.qtd_aditivos > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-blue-300 text-blue-700 bg-blue-50"
                      >
                        {obra.qtd_aditivos} Mudança(s) (+{obra.percentual_aditado_total}%)
                      </Badge>
                    ) : null}
                  </div>

                  {/* Detalhes Financeiros */}
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
                        Carência de trâmite:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {obra.carencia_dias || 15} dias
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
                      <strong>
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
                      Ver detalhes
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
  )
}
