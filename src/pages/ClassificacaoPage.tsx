import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  Calculator,
  ArrowUpDown,
  Eye,
  SlidersHorizontal,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getObrasList } from '@/services/obrasService'
import { ObraRecord, StatusClassificacao } from '@/types/sigo'
import {
  formatarMoeda,
  formatarData,
  getStatusBadgeInfo,
  calcularClassificacao,
} from '@/lib/sigoEngine'

export default function ClassificacaoPage() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoAtivo, setEstadoAtivo] = useState<StatusClassificacao | 'todos'>('todos')

  // Simulador interativo de Gravidade (G)
  const [simDias, setSimDias] = useState(47)
  const [simPeriodo, setSimPeriodo] = useState(30)
  const [simValor, setSimValor] = useState(2734800)
  const [simMulta, setSimMulta] = useState(20)
  const [simRemissao, setSimRemissao] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getObrasList()
    setObras(data)
    setLoading(false)
  }

  // Cálculo da simulação interativa
  const simResultado = calcularClassificacao({
    diasSemLiquidacao: simDias,
    periodicidadeDias: simPeriodo,
    carenciaDias: 15,
    valorGlobal: simValor,
    multaMaxPercentual: simMulta,
    multaRemissaoExterna: simRemissao,
    temAncora: true,
  })

  const badgeSim = getStatusBadgeInfo(simResultado.status)

  // Lista dividida por estados
  const prazoVencido = obras.filter((o) => o.status_classificacao === 'prazo_vencido')
  const foraRitmo = obras.filter((o) => o.status_classificacao === 'fora_do_ritmo')
  const noRitmo = obras.filter((o) => o.status_classificacao === 'no_ritmo')
  const semDados = obras.filter((o) => o.status_classificacao === 'sem_dados')

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
          Classificação da obra & nível de atenção
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Como calculamos o alerta
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          O estado define a cor. O nível de atenção ordena a lista dentro de cada estado:{' '}
          <code className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
            G = A × log₁₀(V) × S
          </code>
          . Não priorizamos quem atrasou mais dias — priorizamos onde o atraso custa mais ao erário
          público.
        </p>
      </div>

      {/* Simulador Interativo da Fórmula SIGO */}
      <Card className="bg-slate-900 text-white border-blue-900 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-950/80 border-b border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-blue-200 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                Simulador do nível de atenção
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Altere os parâmetros e veja como o alerta muda em tempo real.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeSim.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${badgeSim.dot}`} />
                {badgeSim.label}
              </span>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Nível de atenção
                </span>
                <span className="text-2xl font-black text-blue-400">{simResultado.gravidade}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Dias sem Liquidação (Atraso)
              </label>
              <Input
                type="number"
                value={simDias}
                onChange={(e) => setSimDias(parseInt(e.target.value, 10) || 0)}
                className="bg-slate-950 text-white border-slate-700 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Dias corridos desde última medição
              </span>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Periodicidade do Contrato (Dias)
              </label>
              <Input
                type="number"
                value={simPeriodo}
                onChange={(e) => setSimPeriodo(parseInt(e.target.value, 10) || 1)}
                className="bg-slate-950 text-white border-slate-700 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Fator A = {((simDias || 0) / (simPeriodo || 30)).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Valor Global (V em R$)</label>
              <Input
                type="number"
                value={simValor}
                onChange={(e) => setSimValor(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 text-white border-slate-700 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                escala do valor = {Math.log10(simValor > 0 ? simValor : 1).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Maior Multa Prevista (%)
              </label>
              <Input
                type="number"
                value={simMulta}
                onChange={(e) => setSimMulta(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 text-white border-slate-700 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Fator S = {(simMulta / 10).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Resultado da análise:</strong> {simResultado.motivo}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Visão Comparada dos Estados da Carteira */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Obras ordenadas por nível de atenção
        </h2>

        {/* 1. PRAZO VENCIDO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              1. Prazo Vencido ({prazoVencido.length} contratos)
            </h3>
            <span className="text-xs text-slate-500">
              Passou ciclo + carência (15d) ou marco obrigatório vencido
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {prazoVencido.map((obra) => (
              <div
                key={obra.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-red-50/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-red-900 dark:text-red-300 bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded">
                      Nº {obra.numero_contrato}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {obra.titulo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {obra.resumo_motivo_status}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Nível de atenção
                    </span>
                    <span className="text-xl font-black text-red-600">
                      {obra.gravidade_score.toFixed(2)}
                    </span>
                  </div>
                  <Link to={`/obras/${obra.id}`}>
                    <Button size="sm" variant="outline" className="text-xs font-semibold">
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. FORA DO RITMO */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" />
              2. Fora do Ritmo ({foraRitmo.length} contratos)
            </h3>
            <span className="text-xs text-slate-500">
              Passou ciclo (dentro da carência de 15d) ou descompasso de curva ≥ 20 p.p.
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {foraRitmo.map((obra) => (
              <div
                key={obra.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                      Nº {obra.numero_contrato}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {obra.titulo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {obra.resumo_motivo_status}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Nível de atenção
                    </span>
                    <span className="text-xl font-black text-amber-600">
                      {obra.gravidade_score.toFixed(2)}
                    </span>
                  </div>
                  <Link to={`/obras/${obra.id}`}>
                    <Button size="sm" variant="outline" className="text-xs font-semibold">
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. NO RITMO PREVISTO */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              3. No Ritmo Previsto ({noRitmo.length} contratos)
            </h3>
            <span className="text-xs text-slate-500">
              Dentro do ciclo pactuado e medições regulares
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {noRitmo.map((obra) => (
              <div
                key={obra.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      Nº {obra.numero_contrato}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {obra.titulo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {obra.resumo_motivo_status}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Nível de atenção
                    </span>
                    <span className="text-xl font-black text-emerald-600">
                      {obra.gravidade_score.toFixed(2)}
                    </span>
                  </div>
                  <Link to={`/obras/${obra.id}`}>
                    <Button size="sm" variant="outline" className="text-xs font-semibold">
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. SEM DADOS DE EXECUÇÃO */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              4. Sem Dados de Execução ({semDados.length} contratos)
            </h3>
            <span className="text-xs text-slate-500">
              Sem periodicidade identificável ou sem âncora (Listado por valor global)
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {semDados.map((obra) => (
              <div
                key={obra.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                      Nº {obra.numero_contrato}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {obra.titulo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {obra.resumo_motivo_status}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Valor Global
                    </span>
                    <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                      {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                    </span>
                  </div>
                  <Link to={`/obras/${obra.id}`}>
                    <Button size="sm" variant="outline" className="text-xs font-semibold">
                      Fiscalizar
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
