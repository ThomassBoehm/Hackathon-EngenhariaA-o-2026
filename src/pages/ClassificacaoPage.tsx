import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Clock, CheckCircle2, Calculator, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getObrasList } from '@/services/obrasService'
import { ObraRecord } from '@/types/sigo'
import { getStatusBadgeInfo, calcularClassificacao } from '@/lib/sigoEngine'

export default function ClassificacaoPage() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Simulador interativo do status (binário)
  const [simDias, setSimDias] = useState(47)
  const [simPeriodo, setSimPeriodo] = useState(30)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getObrasList()
    setObras(data)
    setLoading(false)
  }

  // Cálculo da simulação interativa (apenas para definir o status binário)
  const simResultado = calcularClassificacao({
    diasSemLiquidacao: simDias,
    periodicidadeDias: simPeriodo,
    carenciaDias: 15,
    valorGlobal: 2734800,
    multaMaxPercentual: 20,
    multaRemissaoExterna: false,
    temAncora: true,
  })

  const badgeSim = getStatusBadgeInfo(simResultado.status)

  // Status binário público
  const dentroPrazo = obras.filter(
    (o) => o.status_classificacao !== 'prazo_vencido' && o.status_classificacao !== 'fora_do_ritmo',
  )
  const foraRitmo = obras.filter(
    (o) => o.status_classificacao === 'prazo_vencido' || o.status_classificacao === 'fora_do_ritmo',
  )

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
          Status da obra
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Como o SIGO classifica o status da obra
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          O SIGO usa apenas dois status para cada obra:{' '}
          <strong className="text-emerald-700 dark:text-emerald-400">Dentro do prazo</strong>{' '}
          (verde) e <strong className="text-amber-700 dark:text-amber-400">Fora do ritmo</strong>{' '}
          (âmbar). O cálculo é individual por obra: cada contrato tem sua própria carência de
          trâmite, e "Fora do ritmo" significa que a obra ultrapassou essa carência.
        </p>
      </div>

      {/* Simulador Interativo do Status */}
      <Card className="bg-slate-900 text-white border-blue-900 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-950/80 border-b border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-blue-200 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                Simulador do status
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Altere os parâmetros e veja como o status muda em tempo real.
              </CardDescription>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeSim.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${badgeSim.dot}`} />
              {badgeSim.label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                Dias corridos desde a última medição
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
                Ciclo pactuado entre medições
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

      {/* Visão Comparada dos Status da Carteira */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Obras por status</h2>

        {/* 1. FORA DO RITMO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fora do ritmo ({foraRitmo.length} contratos)
            </h3>
            <span className="text-xs text-slate-500">
              A obra ultrapassou sua própria carência de trâmite
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

        {/* 2. DENTRO DO PRAZO */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Dentro do prazo ({dentroPrazo.length} contratos)
            </h3>
            <span className="text-xs text-slate-500">
              Dentro do ciclo pactuado e da carência de trâmite
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {dentroPrazo.map((obra) => (
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
      </div>
    </div>
  )
}
