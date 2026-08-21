import pb from '@/lib/pocketbase/client'
import {
  ObraRecord,
  ObrigacaoRecord,
  InconsistenciaRecord,
  AditivoRecord,
  LiquidacaoRecord,
} from '@/types/sigo'
import { calcularClassificacao } from '@/lib/sigoEngine'

export async function getObrasList(): Promise<ObraRecord[]> {
  try {
    const records = await pb.collection('obras').getFullList<ObraRecord>({
      sort: '-gravidade_score,-created',
    })
    return records
  } catch (error) {
    console.error('Erro ao buscar obras:', error)
    return []
  }
}

export async function getObraById(id: string): Promise<ObraRecord | null> {
  try {
    const record = await pb.collection('obras').getOne<ObraRecord>(id)
    return record
  } catch (error) {
    console.error('Erro ao buscar obra por id:', error)
    return null
  }
}

export async function getObrigacoesByObra(obraId: string): Promise<ObrigacaoRecord[]> {
  try {
    const records = await pb.collection('obrigacoes').getFullList<ObrigacaoRecord>({
      filter: `obra_id = "${obraId}"`,
      sort: 'status_cumprimento,-data_limite',
    })
    return records
  } catch (error) {
    console.error('Erro ao buscar obrigações:', error)
    return []
  }
}

export async function getInconsistenciasByObra(obraId: string): Promise<InconsistenciaRecord[]> {
  try {
    const records = await pb.collection('inconsistencias').getFullList<InconsistenciaRecord>({
      filter: `obra_id = "${obraId}"`,
      sort: 'created',
    })
    return records
  } catch (error) {
    console.error('Erro ao buscar inconsistências:', error)
    return []
  }
}

export async function getAditivosByObra(obraId: string): Promise<AditivoRecord[]> {
  try {
    const records = await pb.collection('aditivos').getFullList<AditivoRecord>({
      filter: `obra_id = "${obraId}"`,
      sort: 'data_assinatura',
    })
    return records
  } catch (error) {
    console.error('Erro ao buscar aditivos:', error)
    return []
  }
}

export async function getLiquidacoesByObra(obraId: string): Promise<LiquidacaoRecord[]> {
  try {
    const records = await pb.collection('liquidacoes').getFullList<LiquidacaoRecord>({
      filter: `obra_id = "${obraId}"`,
      sort: '-data_liquidacao',
    })
    return records
  } catch (error) {
    console.error('Erro ao buscar liquidações:', error)
    return []
  }
}

export async function saveObra(data: Partial<ObraRecord>): Promise<ObraRecord> {
  // Recalcula classificação determinística antes de salvar
  const params = {
    diasSemLiquidacao: data.dias_sem_liquidacao || 0,
    periodicidadeDias: data.periodicidade_dias || 30,
    carenciaDias: data.carencia_dias || 15,
    porcentagemPrazoDecorrido: data.porcentagem_prazo_decorrido || 0,
    porcentagemLiquidada: data.porcentagem_liquidada || 0,
    temMarcoVencido: !!data.tem_marco_vencido,
    periodicidadeTipo: data.periodicidade_tipo || 'explícita',
    valorGlobal: data.valor_global_atual || data.valor_global_original || 0,
    multaMaxPercentual: data.multa_max_percentual || 10,
    multaRemissaoExterna: !!data.multa_remissao_externa,
    temAncora: !!data.data_ordem_servico || !!data.data_assinatura,
  }

  const calc = calcularClassificacao(params)

  const payload = {
    ...data,
    status_classificacao: calc.status,
    gravidade_score: calc.gravidade,
    resumo_motivo_status: calc.motivo,
  }

  if (data.id) {
    return await pb.collection('obras').update<ObraRecord>(data.id, payload)
  } else {
    return await pb.collection('obras').create<ObraRecord>(payload)
  }
}

export async function deleteObra(id: string): Promise<boolean> {
  try {
    await pb.collection('obras').delete(id)
    return true
  } catch (error) {
    console.error('Erro ao deletar obra:', error)
    return false
  }
}

export async function updateInconsistencia(
  id: string,
  data: Partial<InconsistenciaRecord>,
): Promise<InconsistenciaRecord> {
  return await pb.collection('inconsistencias').update<InconsistenciaRecord>(id, data)
}

export async function createObrigacao(data: Partial<ObrigacaoRecord>): Promise<ObrigacaoRecord> {
  return await pb.collection('obrigacoes').create<ObrigacaoRecord>(data)
}

export async function createInconsistencia(
  data: Partial<InconsistenciaRecord>,
): Promise<InconsistenciaRecord> {
  return await pb.collection('inconsistencias').create<InconsistenciaRecord>(data)
}

export async function createAditivo(data: Partial<AditivoRecord>): Promise<AditivoRecord> {
  return await pb.collection('aditivos').create<AditivoRecord>(data)
}

export async function createLiquidacao(data: Partial<LiquidacaoRecord>): Promise<LiquidacaoRecord> {
  return await pb.collection('liquidacoes').create<LiquidacaoRecord>(data)
}
