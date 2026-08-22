import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getObrasList } from '@/services/obrasService'
import { ObraRecord } from '@/types/sigo'
import { formatarMoeda, formatarData, getStatusBadgeInfo } from '@/lib/sigoEngine'
import { toast } from '@/hooks/use-toast'

export default function RelatoriosPage() {
  const [obras, setObras] = useState<ObraRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getObrasList()
    setObras(data)
    setLoading(false)
  }

  // Métricas
  const totalValor = obras.reduce(
    (acc, o) => acc + (o.valor_global_atual || o.valor_global_original || 0),
    0,
  )
  const totalLiquidado = obras.reduce((acc, o) => acc + (o.valor_total_liquidado || 0), 0)
  const totalSaldoRemanescente = Math.max(0, totalValor - totalLiquidado)

  // Status binário público
  const dentroPrazo = obras.filter(
    (o) => o.status_classificacao !== 'prazo_vencido' && o.status_classificacao !== 'fora_do_ritmo',
  )
  const foraRitmo = obras.filter(
    (o) => o.status_classificacao === 'prazo_vencido' || o.status_classificacao === 'fora_do_ritmo',
  )

  const obrasComInconsistencias = obras.filter((o) => o.tem_inconsistencias)

  const exportarCSV = () => {
    const headers = [
      'Numero Contrato',
      'Processo Adm',
      'Titulo',
      'Orgao',
      'Municipio',
      'Tipo Obra',
      'Contratada',
      'CNPJ',
      'Valor Global',
      'Valor Liquidado',
      'Status',
      'Dias Sem Liquidacao',
      'Problemas',
    ]

    const rows = obras.map((o) => {
      const isFora =
        o.status_classificacao === 'prazo_vencido' || o.status_classificacao === 'fora_do_ritmo'
      return [
        `"${o.numero_contrato}"`,
        `"${o.processo_adm || ''}"`,
        `"${o.titulo.replace(/"/g, '""')}"`,
        `"${o.orgao}"`,
        `"${o.municipio || ''}"`,
        `"${o.tipo_obra || ''}"`,
        `"${o.contratada_nome.replace(/"/g, '""')}"`,
        `"${o.contratada_cnpj || ''}"`,
        o.valor_global_atual || o.valor_global_original || 0,
        o.valor_total_liquidado || 0,
        `"${isFora ? 'Fora do ritmo' : 'Dentro do prazo'}"`,
        o.dias_sem_liquidacao || 0,
        o.tem_inconsistencias ? 'SIM' : 'NAO',
      ]
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `SIGO_Relatorio_Obras_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Relatório Exportado',
      description: 'Arquivo CSV gerado com sucesso para auditoria e controle.',
    })
  }

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-700" />
            Relatórios & auditoria
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resumos consolidados para órgãos de controle (TCM, TCE-SP, CGU e Controladoria
            Municipal).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs font-semibold"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Imprimir Relatório
          </Button>
          <Button
            size="sm"
            onClick={exportarCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV / Excel
          </Button>
        </div>
      </div>

      {/* Resumo Executivo em Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">
              Volume Total Carteira
            </CardDescription>
            <CardTitle className="text-xl font-black text-blue-900 dark:text-blue-300">
              {formatarMoeda(totalValor)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {obras.length} contratos monitorados
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">
              Total Liquidado
            </CardDescription>
            <CardTitle className="text-xl font-black text-emerald-700 dark:text-emerald-400">
              {formatarMoeda(totalLiquidado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {totalValor > 0 ? ((totalLiquidado / totalValor) * 100).toFixed(1) : 0}% de execução
            financeira
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">
              Saldo a Liquidar (Comprometido)
            </CardDescription>
            <CardTitle className="text-xl font-black text-amber-700 dark:text-amber-400">
              {formatarMoeda(totalSaldoRemanescente)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Compromisso orçamentário pendente
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">
              Contratos Fora do Ritmo
            </CardDescription>
            <CardTitle className="text-xl font-black text-amber-600">{foraRitmo.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {dentroPrazo.length} dentro do prazo
          </CardContent>
        </Card>
      </div>

      {/* Tabela Sintética Completa para Auditoria */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            Mapa da carteira de contratos de obras
          </CardTitle>
          <CardDescription className="text-xs">
            Visão consolidada com as regras do contrato, status (dentro do prazo / fora do ritmo) e
            situação física-financeira.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Contrato / Obra</th>
                  <th className="p-3">Órgão / Município</th>
                  <th className="p-3">Valor Atual</th>
                  <th className="p-3">Liquidado</th>
                  <th className="p-3">Periodicidade</th>
                  <th className="p-3">Dias s/ Liq</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Problemas</th>
                </tr>
              </thead>{' '}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {obras.map((obra) => {
                  const badge = getStatusBadgeInfo(obra.status_classificacao)

                  return (
                    <tr key={obra.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold font-mono text-blue-900 dark:text-blue-300">
                          {obra.numero_contrato}
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1 max-w-xs">
                          {obra.titulo}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        <div>{obra.orgao}</div>
                        <div className="text-[10px]">
                          {obra.municipio}/{obra.estado_uf}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {formatarMoeda(obra.valor_global_atual || obra.valor_global_original)}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        {formatarMoeda(obra.valor_total_liquidado)}
                        <span className="text-[10px] text-slate-400 block">
                          ({obra.porcentagem_liquidada || 0}%)
                        </span>
                      </td>
                      <td className="p-3 capitalize text-slate-600 dark:text-slate-400">
                        {obra.periodicidade_tipo || 'explícita'}
                        <span className="text-[10px] block text-slate-400">
                          {obra.periodicidade_dias ? `${obra.periodicidade_dias}d` : '—'}
                        </span>
                      </td>
                      <td className="p-3 font-bold font-mono">{obra.dias_sem_liquidacao || 0}d</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {obra.tem_inconsistencias ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-800 border-amber-300 bg-amber-50"
                          >
                            Com problemas
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sem problemas</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
