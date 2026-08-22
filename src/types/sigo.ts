export type StatusClassificacao = 'no_ritmo' | 'fora_do_ritmo' | 'prazo_vencido' | 'sem_dados'

export type PeriodicidadeTipo = 'explícita' | 'por etapa' | 'inferida' | 'ausente'
export type ConfiancaTipo = 'alta' | 'média' | 'baixa'
export type ResponsavelTipo = 'Contratada' | 'Administração' | 'Contratante'
export type StatusObrigacao = 'pendente' | 'no_prazo' | 'vencido' | 'cumprido' | 'sem_ancora'
export type TipoChecagemInconsistencia =
  | 'clausula_inexistente'
  | 'extenso_divergente'
  | 'divergencia_aritmetica'
  | 'identificador_conflitante'
  | 'prazo_incoerente'
  | 'valor_extenso_ausente'
  // Os dois tipos abaixo são produzidos pelo motor determinístico
  // (sigoEngine.executarChecagensCoerencia), mas NÃO existem como
  // valores válidos no select `tipo_checagem` da collection
  // `inconsistencias` do PocketBase. Eles são normalizados para um
  // dos 4 valores acima em `normalizarTipoChecagem` (ContratoUpload)
  // antes de persistir, preservando titulo/descricao para diferenciação.
  | 'prazo_incoerente'
  | 'valor_extenso_ausente'
export type TipoObra =
  | 'Edificação'
  | 'Saneamento'
  | 'Pavimentação/Vias'
  | 'Habitação'
  | 'Saúde/UBS'
  | 'Educação/Escolas'
  | 'Serviço Continuado'
  | 'Aquisição/Outro'
  | 'Infraestrutura Urbana e Mobilidade'
  | 'Saneamento Básico e Recursos Hídricos'
  | 'Edificações Públicas (Infraestrutura Social)'
  | 'Infraestrutura de Energia e Telecomunicações'

export interface ObraRecord {
  id: string
  numero_contrato: string
  ano_contrato?: string
  processo_adm?: string
  titulo: string
  objeto: string
  orgao: string
  municipio?: string
  estado_uf?: string
  tipo_obra?: TipoObra
  contratada_nome: string
  contratada_cnpj?: string
  valor_global_original: number
  valor_global_atual: number
  data_assinatura?: string
  data_ordem_servico?: string
  prazo_vigencia_meses?: number
  data_fim_vigencia?: string

  // Réguas
  periodicidade_tipo?: PeriodicidadeTipo
  periodicidade_dias?: number
  periodicidade_confianca?: ConfiancaTipo
  evento_ancora?: string
  multa_max_percentual?: number
  multa_remissao_externa?: boolean
  limite_aditivo_percentual?: number
  carencia_dias?: number

  // Execução
  data_ultima_liquidacao?: string | null
  valor_total_liquidado?: number
  porcentagem_liquidada?: number
  porcentagem_prazo_decorrido?: number
  dias_sem_liquidacao?: number

  // Classificação
  status_classificacao: StatusClassificacao
  gravidade_score: number
  resumo_motivo_status?: string
  tem_inconsistencias?: boolean
  tem_marco_vencido?: boolean

  qtd_aditivos?: number
  percentual_aditado_total?: number
  origem_extracao?: string
  /** Texto integral extraído do PDF. Base de conhecimento do chat de dúvidas. */
  texto_contrato?: string
  resumo?: string
  extracao_ia_raw?: {
    modelo?: string
    tempo_processamento?: string
    paginas_lidas?: number
    confianca_geral?: number
    texto_destaque?: string
    [key: string]: any
  }
  arquivo_pdf?: string
  created?: string
  updated?: string
}

export interface ObrigacaoRecord {
  id: string
  obra_id: string
  clausula: string
  descricao: string
  responsavel: ResponsavelTipo
  tipo_regua: 'marco_contratual' | 'liquidacao_medicao' | 'administrativo'
  prazo_texto?: string
  data_limite?: string
  penalidade_associada?: string
  penalidade_percentual?: number
  status_cumprimento: StatusObrigacao
  dias_atraso?: number
  trecho_original_pdf?: string
  confianca?: ConfiancaTipo
  remissao_externa?: boolean
  created?: string
  updated?: string
}

export interface InconsistenciaRecord {
  id: string
  obra_id: string
  tipo_checagem: TipoChecagemInconsistencia
  titulo: string
  descricao: string
  localizacao_clausula?: string
  trecho_original?: string
  valor_encontrado?: string
  valor_esperado?: string
  status_validacao: 'pendente_analise' | 'confirmado_fiscal' | 'desconsiderado'
  parecer_fiscal?: string
  /** 'deterministica' = motor do SIGO; 'ia' = sugestão do modelo, não verificada. */
  origem?: 'deterministica' | 'ia'
  created?: string
  updated?: string
}

export interface AditivoRecord {
  id: string
  obra_id: string
  numero_termo: string
  tipo_aditivo: string
  data_assinatura?: string
  justificativa?: string
  valor_aditado?: number
  percentual_aditado_individual?: number
  prazo_aditado_dias?: number
  limite_legal_percentual?: number
  alerta_limite_ultrapassado?: boolean
  created?: string
  updated?: string
}

export interface LiquidacaoRecord {
  id: string
  obra_id: string
  numero_medicao?: string
  numero_nota_empenho?: string
  data_liquidacao: string
  valor_liquidado: number
  percentual_medido?: number
  status_tramitacao?: string
  observacoes?: string
  created?: string
  updated?: string
}
