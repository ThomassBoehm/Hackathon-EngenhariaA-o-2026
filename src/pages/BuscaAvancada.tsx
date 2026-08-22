import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Filter,
  Building2,
  DollarSign,
  Calendar,
  ShieldAlert,
  Sparkles,
  CheckSquare,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getObrasList } from '@/services/obrasService'
import { ObraRecord, StatusClassificacao, TipoObra } from '@/types/sigo'
import { formatarMoeda, formatarData, getStatusBadgeInfo } from '@/lib/sigoEngine'

export default function BuscaAvancada() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros Combinados
  const [termo, setTermo] = useState('')
  const [status, setStatus] = useState<string>('todos')
  const [tipoObra, setTipoObra] = useState<string>('todos')
  const [municipio, setMunicipio] = useState<string>('todos')
  const [faixaValor, setFaixaValor] = useState<string>('todos')
  const [temInconsistencia, setTemInconsistencia] = useState<string>('todos')
  const [temMarcoVencido, setTemMarcoVencido] = useState<string>('todos')
  const [temAditivos, setTemAditivos] = useState<string>('todos')
  const [diasAtrasoMin, setDiasAtrasoMin] = useState<number>(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getObrasList()
    setObras(data)
    setLoading(false)
  }

  // Lista de municípios
  const municipiosUnicos = Array.from(new Set(obras.map((o) => o.municipio).filter(Boolean)))

  const obrasFiltradas = obras.filter((obra) => {
    // Termo
    const matchTermo =
      !termo ||
      obra.titulo.toLowerCase().includes(termo.toLowerCase()) ||
      obra.numero_contrato.toLowerCase().includes(termo.toLowerCase()) ||
      (obra.processo_adm && obra.processo_adm.toLowerCase().includes(termo.toLowerCase())) ||
      obra.contratada_nome.toLowerCase().includes(termo.toLowerCase()) ||
      obra.objeto.toLowerCase().includes(termo.toLowerCase()) ||
      obra.orgao.toLowerCase().includes(termo.toLowerCase())

    // Status
    const matchStatus = status === 'todos' || obra.status_classificacao === status

    // Tipo Obra
    const matchTipo = tipoObra === 'todos' || obra.tipo_obra === tipoObra

    // Município
    const matchMuni = municipio === 'todos' || obra.municipio === municipio

    // Inconsistência
    const matchInc =
      temInconsistencia === 'todos' ||
      (temInconsistencia === 'sim' && obra.tem_inconsistencias) ||
      (temInconsistencia === 'nao' && !obra.tem_inconsistencias)

    // Marco Vencido
    const matchMarco =
      temMarcoVencido === 'todos' ||
      (temMarcoVencido === 'sim' && obra.tem_marco_vencido) ||
      (temMarcoVencido === 'nao' && !obra.tem_marco_vencido)

    // Aditivos
    const matchAdit =
      temAditivos === 'todos' ||
      (temAditivos === 'sim' && (obra.qtd_aditivos || 0) > 0) ||
      (temAditivos === 'nao' && (!obra.qtd_aditivos || obra.qtd_aditivos === 0))

    // Dias sem liquidação
    const matchDias = (obra.dias_sem_liquidacao || 0) >= diasAtrasoMin

    // Faixa Valor
    const valor = obra.valor_global_atual || obra.valor_global_original || 0
    let matchValor = true
    if (faixaValor === 'ate_500k') matchValor = valor <= 500000
    else if (faixaValor === '500k_2m') matchValor = valor > 500000 && valor <= 2000000
    else if (faixaValor === '2m_5m') matchValor = valor > 2000000 && valor <= 5000000
    else if (faixaValor === 'acima_5m') matchValor = valor > 5000000

    return (
      matchTermo &&
      matchStatus &&
      matchTipo &&
      matchMuni &&
      matchInc &&
      matchMarco &&
      matchAdit &&
      matchDias &&
      matchValor
    )
  })

  const limparFiltros = () => {
    setTermo('')
    setStatus('todos')
    setTipoObra('todos')
    setMunicipio('todos')
    setFaixaValor('todos')
    setTemInconsistencia('todos')
    setTemMarcoVencido('todos')
    setTemAditivos('todos')
    setDiasAtrasoMin(0)
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-700" />
          Busca Avançada & Filtros Combinados de Auditoria
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cruze múltiplos parâmetros contratuais, faixas orçamentárias, ocorrência de mudanças e
          problemas no texto.
        </p>
      </div>

      {/* Painel de Filtros */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-5 space-y-4">
          {/* Linha 1: Busca Texto Global */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por termos, palavras-chave do objeto, número de processo, contratada..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className="pl-10 text-sm h-10 font-medium"
            />
          </div>

          {/* Grid de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Estado do Contrato
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Estados</SelectItem>
                  <SelectItem value="prazo_vencido">Prazo Vencido</SelectItem>
                  <SelectItem value="fora_do_ritmo">Fora do Ritmo</SelectItem>
                  <SelectItem value="no_ritmo">No Ritmo</SelectItem>
                  <SelectItem value="sem_dados">Sem Dados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Tipo de Obra
              </label>
              <Select value={tipoObra} onValueChange={setTipoObra}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
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

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Município
              </label>
              <Select value={municipio} onValueChange={setMunicipio}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Municípios</SelectItem>
                  {municipiosUnicos.map((m) => (
                    <SelectItem key={m} value={m as string}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Faixa de Valor Global
              </label>
              <Select value={faixaValor} onValueChange={setFaixaValor}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer Valor</SelectItem>
                  <SelectItem value="ate_500k">Até R$ 500 mil</SelectItem>
                  <SelectItem value="500k_2m">R$ 500 mil a R$ 2 mi</SelectItem>
                  <SelectItem value="2m_5m">R$ 2 mi a R$ 5 mi</SelectItem>
                  <SelectItem value="acima_5m">Acima de R$ 5 mi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Problemas no texto
              </label>
              <Select value={temInconsistencia} onValueChange={setTemInconsistencia}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="sim">Com problemas</SelectItem>
                  <SelectItem value="nao">Sem problemas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Marco Contratual Vencido
              </label>
              <Select value={temMarcoVencido} onValueChange={setTemMarcoVencido}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim (Marco Datado Vencido)</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Mudanças no contrato
              </label>
              <Select value={temAditivos} onValueChange={setTemAditivos}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Com mudanças</SelectItem>
                  <SelectItem value="nao">Sem mudanças</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Mínimo Dias sem Liquidação
              </label>
              <Input
                type="number"
                value={diasAtrasoMin}
                onChange={(e) => setDiasAtrasoMin(parseInt(e.target.value, 10) || 0)}
                className="h-8 text-xs font-mono"
                placeholder="0 dias"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Encontrados <strong>{obrasFiltradas.length}</strong> contratos correspondentes
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              className="text-xs text-blue-700 hover:text-blue-900"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Buscando na base de contratos...
          </div>
        ) : obrasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Nenhum contrato corresponde aos critérios combinados de busca.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {obrasFiltradas.map((obra) => {
              const badgeInfo = getStatusBadgeInfo(obra.status_classificacao)

              return (
                <div
                  key={obra.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                        Nº {obra.numero_contrato}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeInfo.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot}`} />
                        {badgeInfo.label}
                      </span>
                      {obra.tipo_obra && (
                        <Badge variant="secondary" className="text-[10px]">
                          {obra.tipo_obra}
                        </Badge>
                      )}
                      {obra.tem_inconsistencias && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-800 border-amber-300 bg-amber-50"
                        >
                          Problemas no texto
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      <Link to={`/obras/${obra.id}`} className="hover:text-blue-700">
                        {obra.titulo}
                      </Link>
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {obra.objeto}
                    </p>

                    <div className="flex flex-wrap gap-x-4 text-[11px] text-slate-500">
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
                      <span>
                        Dias s/ Liq: <strong>{obra.dias_sem_liquidacao || 0}d</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Nível de atenção
                      </span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                        {obra.gravidade_score > 0 ? obra.gravidade_score.toFixed(2) : '—'}
                      </span>
                    </div>
                    <Link to={`/obras/${obra.id}`}>
                      <Button
                        size="sm"
                        className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                      >
                        Ver detalhes
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
