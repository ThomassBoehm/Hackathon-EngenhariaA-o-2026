import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Building2,
  Save,
  ArrowLeft,
  Sparkles,
  Calculator,
  FileText,
  Calendar,
  DollarSign,
  Percent,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getObraById, saveObra } from '@/services/obrasService'
import { ObraRecord, TipoObra, PeriodicidadeTipo, ConfiancaTipo } from '@/types/sigo'
import { calcularClassificacao, formatarMoeda, getStatusBadgeInfo } from '@/lib/sigoEngine'
import { toast } from '@/hooks/use-toast'

export default function ObraForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<ObraRecord>>({
    numero_contrato: '',
    ano_contrato: new Date().getFullYear().toString(),
    processo_adm: '',
    titulo: '',
    objeto: '',
    orgao: 'Secretaria Municipal de Obras e Habitação',
    municipio: 'São Paulo',
    estado_uf: 'SP',
    tipo_obra: 'Edificação',
    contratada_nome: '',
    contratada_cnpj: '',
    valor_global_original: 1000000,
    valor_global_atual: 1000000,
    data_assinatura: new Date().toISOString().split('T')[0],
    data_ordem_servico: new Date().toISOString().split('T')[0],
    prazo_vigencia_meses: 12,
    data_fim_vigencia: '',

    // Réguas
    periodicidade_tipo: 'explícita',
    periodicidade_dias: 30,
    periodicidade_confianca: 'alta',
    evento_ancora: 'ordem de serviço',
    multa_max_percentual: 10,
    multa_remissao_externa: false,
    limite_aditivo_percentual: 25,
    carencia_dias: 15,

    // Execução
    data_ultima_liquidacao: '',
    valor_total_liquidado: 0,
    porcentagem_liquidada: 0,
    porcentagem_prazo_decorrido: 0,
    dias_sem_liquidacao: 0,

    tem_marco_vencido: false,
    tem_inconsistencias: false,
    qtd_aditivos: 0,
    percentual_aditado_total: 0,
    origem_extracao: 'manual',
  })

  useEffect(() => {
    if (isEditing && id) {
      loadData(id)
    }
  }, [id, isEditing])

  async function loadData(obraId: string) {
    setLoading(true)
    const data = await getObraById(obraId)
    if (data) {
      setFormData(data)
    } else {
      toast({
        title: 'Erro ao carregar',
        description: 'Contrato não encontrado no banco de dados.',
        variant: 'destructive',
      })
      navigate('/')
    }
    setLoading(false)
  }

  const updateField = (field: keyof ObraRecord, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Cálculo Dinâmico em tempo real da régua SIGO
  const calculoPreview = calcularClassificacao({
    diasSemLiquidacao: Number(formData.dias_sem_liquidacao) || 0,
    periodicidadeDias: Number(formData.periodicidade_dias) || 30,
    carenciaDias: Number(formData.carencia_dias) || 15,
    porcentagemPrazoDecorrido: Number(formData.porcentagem_prazo_decorrido) || 0,
    porcentagemLiquidada: Number(formData.porcentagem_liquidada) || 0,
    temMarcoVencido: !!formData.tem_marco_vencido,
    periodicidadeTipo: formData.periodicidade_tipo,
    valorGlobal: Number(formData.valor_global_atual || formData.valor_global_original) || 0,
    multaMaxPercentual: Number(formData.multa_max_percentual) || 10,
    multaRemissaoExterna: !!formData.multa_remissao_externa,
    temAncora: !!formData.data_ordem_servico || !!formData.data_assinatura,
  })

  const badgePreview = getStatusBadgeInfo(calculoPreview.status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (
      !formData.numero_contrato ||
      !formData.titulo ||
      !formData.objeto ||
      !formData.contratada_nome
    ) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha número do contrato, título, objeto e nome da empresa contratada.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const saved = await saveObra(formData)
      toast({
        title: isEditing ? 'Contrato atualizado!' : 'Contrato cadastrado com sucesso!',
        description: `Classificado determinísticamente como: ${calculoPreview.status} (G = ${calculoPreview.gravidade})`,
      })
      navigate(`/obras/${saved.id}`)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Verifique os campos informados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {isEditing
                ? `Editar Contrato Nº ${formData.numero_contrato}`
                : 'Novo Cadastro de Contrato de Obra'}
            </h1>
            <p className="text-xs text-slate-500">
              Preencha os campos estruturados conforme extração do instrumento contratual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/')} className="text-xs">
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Obra no SIGO'}
          </Button>
        </div>
      </div>

      {/* Box de Preview da Classificação SIGO (Determinística em tempo real) */}
      <Card className="bg-slate-900 text-white border-blue-900 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base text-blue-100">
                Motor Determinístico SIGO (Cálculo em Tempo Real)
              </CardTitle>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgePreview.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${badgePreview.dot}`} />
              {badgePreview.label}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-300">
            A cada alteração nos campos abaixo, o SIGO recalcula instantaneamente o estado e o
            índice de gravidade (G).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-xs">
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">
                Diagnóstico:
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">{calculoPreview.motivo}</p>
            </div>
            <div className="text-right shrink-0 bg-slate-900 px-3 py-2 rounded border border-slate-800">
              <span className="text-slate-400 font-bold text-[10px] uppercase block">
                Gravidade (G)
              </span>
              <span className="text-xl font-black text-blue-400">{calculoPreview.gravidade}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Identificação Geral */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            1. Identificação do Instrumento Contratual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold">Número do Contrato *</Label>
              <Input
                placeholder="Ex: 041/2026"
                value={formData.numero_contrato || ''}
                onChange={(e) => updateField('numero_contrato', e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Ano</Label>
              <Input
                placeholder="2026"
                value={formData.ano_contrato || ''}
                onChange={(e) => updateField('ano_contrato', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Processo Administrativo</Label>
              <Input
                placeholder="Ex: PA-089/2025"
                value={formData.processo_adm || ''}
                onChange={(e) => updateField('processo_adm', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold">Título Resumido da Obra *</Label>
            <Input
              placeholder="Ex: Construção de 20 Unidades Habitacionais de Interesse Social"
              value={formData.titulo || ''}
              onChange={(e) => updateField('titulo', e.target.value)}
              required
              className="mt-1 font-semibold"
            />
          </div>

          <div>
            <Label className="text-xs font-bold">Objeto Completo do Contrato *</Label>
            <Textarea
              placeholder="Descrição integral do objeto contratado conforme cláusula primeira..."
              value={formData.objeto || ''}
              onChange={(e) => updateField('objeto', e.target.value)}
              rows={3}
              required
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-bold">Tipo de Obra</Label>
              <Select
                value={formData.tipo_obra || 'Edificação'}
                onValueChange={(v: any) => updateField('tipo_obra', v)}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label className="text-xs font-bold">Órgão Contratante</Label>
              <Input
                placeholder="Ex: Secretaria Municipal de Habitação"
                value={formData.orgao || ''}
                onChange={(e) => updateField('orgao', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Município</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={formData.municipio || ''}
                onChange={(e) => updateField('municipio', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">UF</Label>
              <Input
                placeholder="SP"
                maxLength={2}
                value={formData.estado_uf || ''}
                onChange={(e) => updateField('estado_uf', e.target.value.toUpperCase())}
                className="mt-1 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold">Razão Social da Contratada *</Label>
              <Input
                placeholder="Ex: Construtora Vale do Paranapanema Ltda."
                value={formData.contratada_nome || ''}
                onChange={(e) => updateField('contratada_nome', e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">CNPJ da Contratada</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={formData.contratada_cnpj || ''}
                onChange={(e) => updateField('contratada_cnpj', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Valores e Prazos */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            2. Valores, Prazos e Vigência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-bold">Valor Global Original (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_global_original || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  updateField('valor_global_original', val)
                  if (
                    !formData.valor_global_atual ||
                    formData.valor_global_atual === formData.valor_global_original
                  ) {
                    updateField('valor_global_atual', val)
                  }
                }}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Valor Atual c/ Aditivos (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_global_atual || 0}
                onChange={(e) => updateField('valor_global_atual', parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono font-bold text-blue-700 dark:text-blue-300"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Data de Assinatura</Label>
              <Input
                type="date"
                value={formData.data_assinatura ? formData.data_assinatura.split('T')[0] : ''}
                onChange={(e) => updateField('data_assinatura', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Data da Ordem de Serviço (OS)</Label>
              <Input
                type="date"
                value={formData.data_ordem_servico ? formData.data_ordem_servico.split('T')[0] : ''}
                onChange={(e) => updateField('data_ordem_servico', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold">Prazo de Vigência (Meses)</Label>
              <Input
                type="number"
                value={formData.prazo_vigencia_meses || 12}
                onChange={(e) =>
                  updateField('prazo_vigencia_meses', parseInt(e.target.value, 10) || 12)
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Data de Fim de Vigência</Label>
              <Input
                type="date"
                value={formData.data_fim_vigencia ? formData.data_fim_vigencia.split('T')[0] : ''}
                onChange={(e) => updateField('data_fim_vigencia', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Evento Âncora Principal</Label>
              <Input
                placeholder="Ex: ordem de serviço, assinatura"
                value={formData.evento_ancora || 'ordem de serviço'}
                onChange={(e) => updateField('evento_ancora', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Réguas Contratuais (Parâmetros SIGO) */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            3. Réguas Extraídas do Contrato (Parâmetros de Auditoria)
          </CardTitle>
          <CardDescription className="text-xs">
            Conforme Seção 6 do PDF: A régua vem do contrato. Quando não define periodicidade, o
            SIGO sinaliza mas não acusa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold">Tipo de Periodicidade de Medição</Label>
              <Select
                value={formData.periodicidade_tipo || 'explícita'}
                onValueChange={(v: any) => updateField('periodicidade_tipo', v)}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explícita">Explícita (30 dias / Mensal)</SelectItem>
                  <SelectItem value="por etapa">Por Etapa Físico-Financeira</SelectItem>
                  <SelectItem value="inferida">Inferida (ex: 12x MÊS)</SelectItem>
                  <SelectItem value="ausente">Ausente (Sem dados para ranking)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Ciclo de Periodicidade (Dias)</Label>
              <Input
                type="number"
                value={formData.periodicidade_dias || 30}
                onChange={(e) =>
                  updateField('periodicidade_dias', parseInt(e.target.value, 10) || 0)
                }
                className="mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400">Padrão: 30 dias</span>
            </div>

            <div>
              <Label className="text-xs font-bold">Confiança da Extração</Label>
              <Select
                value={formData.periodicidade_confianca || 'alta'}
                onValueChange={(v: any) => updateField('periodicidade_confianca', v)}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta (Texto literal explícito)</SelectItem>
                  <SelectItem value="média">Média (Inferida por contexto)</SelectItem>
                  <SelectItem value="baixa">Baixa (Ausente/Dúvida)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold">Maior Penalidade/Multa Prevista (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.multa_max_percentual || 10}
                onChange={(e) =>
                  updateField('multa_max_percentual', parseFloat(e.target.value) || 0)
                }
                className="mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400">Fator S = Multa % ÷ 10</span>
            </div>

            <div>
              <Label className="text-xs font-bold">Carência Administrativa de Trâmite (Dias)</Label>
              <Input
                type="number"
                value={formData.carencia_dias || 15}
                onChange={(e) => updateField('carencia_dias', parseInt(e.target.value, 10) || 15)}
                className="mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400">Padrão SIGO: 15 dias fixos</span>
            </div>

            <div>
              <Label className="text-xs font-bold">Limite de Aditivo Legal (%)</Label>
              <Input
                type="number"
                value={formData.limite_aditivo_percentual || 25}
                onChange={(e) =>
                  updateField('limite_aditivo_percentual', parseInt(e.target.value, 10) || 25)
                }
                className="mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400">25% (obras novas) / 50% (reformas)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="remissao_externa"
              checked={!!formData.multa_remissao_externa}
              onCheckedChange={(checked) => updateField('multa_remissao_externa', checked)}
            />
            <Label htmlFor="remissao_externa" className="text-xs font-medium cursor-pointer">
              Penalidades remetidas a documento externo (TR/Edital) —{' '}
              <em>Fixa S = 1,0 determinístico</em>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* 4. Execução Orçamentária e Sinais de Alerta */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            4. Execução Orçamentária & Sinais de Alerta Atuais
          </CardTitle>
          <CardDescription className="text-xs">
            Dados de liquidação importados dos sistemas contábeis públicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-bold">Dias sem Liquidação</Label>
              <Input
                type="number"
                value={formData.dias_sem_liquidacao || 0}
                onChange={(e) =>
                  updateField('dias_sem_liquidacao', parseInt(e.target.value, 10) || 0)
                }
                className="mt-1 font-mono font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Data da Última Liquidação</Label>
              <Input
                type="date"
                value={
                  formData.data_ultima_liquidacao
                    ? formData.data_ultima_liquidacao.split('T')[0]
                    : ''
                }
                onChange={(e) => updateField('data_ultima_liquidacao', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Valor Total Liquidado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_total_liquidado || 0}
                onChange={(e) =>
                  updateField('valor_total_liquidado', parseFloat(e.target.value) || 0)
                }
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">% Liquidado vs % Prazo</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="% Liq"
                  step="0.1"
                  value={formData.porcentagem_liquidada || 0}
                  onChange={(e) =>
                    updateField('porcentagem_liquidada', parseFloat(e.target.value) || 0)
                  }
                  className="font-mono text-xs"
                />
                <Input
                  type="number"
                  placeholder="% Prazo"
                  step="0.1"
                  value={formData.porcentagem_prazo_decorrido || 0}
                  onChange={(e) =>
                    updateField('porcentagem_prazo_decorrido', parseFloat(e.target.value) || 0)
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Switch
                id="marco_vencido"
                checked={!!formData.tem_marco_vencido}
                onCheckedChange={(checked) => updateField('tem_marco_vencido', checked)}
              />
              <Label
                htmlFor="marco_vencido"
                className="text-xs font-medium cursor-pointer text-red-700 dark:text-red-400"
              >
                Existe Marco Contratual Obrigatório Vencido (descumprimento datado pela Contratada)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="inconsistencias_switch"
                checked={!!formData.tem_inconsistencias}
                onCheckedChange={(checked) => updateField('tem_inconsistencias', checked)}
              />
              <Label
                htmlFor="inconsistencias_switch"
                className="text-xs font-medium cursor-pointer text-amber-800 dark:text-amber-400"
              >
                Existem inconsistências de coerência de texto no contrato
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Submissão */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => navigate('/')}>
          Voltar para o Dashboard
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 shadow-md"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : isEditing ? 'Atualizar Obra' : 'Concluir Cadastro'}
        </Button>
      </div>
    </form>
  )
}
