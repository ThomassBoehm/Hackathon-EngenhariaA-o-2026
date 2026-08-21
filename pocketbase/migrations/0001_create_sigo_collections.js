migrate(
  (app) => {
    // 1. Coleção Obras (centraliza dados da obra e do contrato público vinculado)
    const obras = new Collection({
      name: 'obras',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'numero_contrato', type: 'text', required: true },
        { name: 'ano_contrato', type: 'text' },
        { name: 'processo_adm', type: 'text' },
        { name: 'titulo', type: 'text', required: true },
        { name: 'objeto', type: 'text', required: true },
        { name: 'orgao', type: 'text', required: true },
        { name: 'municipio', type: 'text' },
        { name: 'estado_uf', type: 'text' },
        {
          name: 'tipo_obra',
          type: 'select',
          values: [
            'Edificação',
            'Saneamento',
            'Pavimentação/Vias',
            'Habitação',
            'Saúde/UBS',
            'Educação/Escolas',
            'Serviço Continuado',
            'Aquisição/Outro',
          ],
          maxSelect: 1,
        },
        { name: 'contratada_nome', type: 'text', required: true },
        { name: 'contratada_cnpj', type: 'text' },
        { name: 'valor_global_original', type: 'number', required: true },
        { name: 'valor_global_atual', type: 'number', required: true },
        { name: 'data_assinatura', type: 'date' },
        { name: 'data_ordem_servico', type: 'date' },
        { name: 'prazo_vigencia_meses', type: 'number' },
        { name: 'data_fim_vigencia', type: 'date' },

        // Réguas do SIGO (extraídas do contrato)
        {
          name: 'periodicidade_tipo',
          type: 'select',
          values: ['explícita', 'por etapa', 'inferida', 'ausente'],
          maxSelect: 1,
        },
        { name: 'periodicidade_dias', type: 'number' }, // ex: 30 dias para mensal
        {
          name: 'periodicidade_confianca',
          type: 'select',
          values: ['alta', 'média', 'baixa'],
          maxSelect: 1,
        },
        { name: 'evento_ancora', type: 'text' }, // "ordem de serviço", "assinatura", etc.
        { name: 'multa_max_percentual', type: 'number' }, // percentual max previsto de multa (ex: 10%, 20%)
        { name: 'multa_remissao_externa', type: 'bool' }, // se remete ao TR/Edital (S = 1.0)
        { name: 'limite_aditivo_percentual', type: 'number' }, // ex: 25% ou 50%
        { name: 'carencia_dias', type: 'number' }, // padrao 15 dias

        // Execução Orçamentária / Âncoras Externas
        { name: 'data_ultima_liquidacao', type: 'date' },
        { name: 'valor_total_liquidado', type: 'number' },
        { name: 'porcentagem_liquidada', type: 'number' },
        { name: 'porcentagem_prazo_decorrido', type: 'number' },
        { name: 'dias_sem_liquidacao', type: 'number' },

        // Classificação e Gravidade calculadas determinísticas do SIGO
        {
          name: 'status_classificacao',
          type: 'select',
          values: ['no_ritmo', 'fora_do_ritmo', 'prazo_vencido', 'sem_dados'],
          maxSelect: 1,
        },
        { name: 'gravidade_score', type: 'number' }, // G = A * log10(V) * S
        { name: 'resumo_motivo_status', type: 'text' },
        { name: 'tem_inconsistencias', type: 'bool' },
        { name: 'tem_marco_vencido', type: 'bool' },

        // Análise de Aditivos
        { name: 'qtd_aditivos', type: 'number' },
        { name: 'percentual_aditado_total', type: 'number' },

        // Arquivo do Contrato e Metadados
        { name: 'arquivo_pdf', type: 'file', maxSelect: 1, maxSize: 52428800 },
        { name: 'extracao_ia_raw', type: 'json' },
        { name: 'origem_extracao', type: 'text' }, // "upload_ia", "pre_cadastrado", "manual"

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obras_status ON obras (status_classificacao)',
        'CREATE INDEX idx_obras_gravidade ON obras (gravidade_score)',
        'CREATE INDEX idx_obras_contrato ON obras (numero_contrato)',
      ],
    })
    app.save(obras)

    // 2. Coleção Obrigações e Marcos Contratuais
    const obrigacoes = new Collection({
      name: 'obrigacoes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'obra_id',
          type: 'relation',
          required: true,
          collectionId: obras.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'clausula', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'responsavel',
          type: 'select',
          values: ['Contratada', 'Administração'],
          maxSelect: 1,
        },
        {
          name: 'tipo_regua',
          type: 'select',
          values: ['marco_contratual', 'liquidacao_medicao', 'administrativo'],
          maxSelect: 1,
        },
        { name: 'prazo_texto', type: 'text' },
        { name: 'data_limite', type: 'date' },
        { name: 'penalidade_associada', type: 'text' },
        { name: 'penalidade_percentual', type: 'number' },
        {
          name: 'status_cumprimento',
          type: 'select',
          values: ['pendente', 'no_prazo', 'vencido', 'cumprido', 'sem_ancora'],
          maxSelect: 1,
        },
        { name: 'dias_atraso', type: 'number' },
        { name: 'trecho_original_pdf', type: 'text' },
        { name: 'confianca', type: 'select', values: ['alta', 'média', 'baixa'], maxSelect: 1 },
        { name: 'remissao_externa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obrig_obra ON obrigacoes (obra_id)',
        'CREATE INDEX idx_obrig_status ON obrigacoes (status_cumprimento)',
      ],
    })
    app.save(obrigacoes)

    // 3. Coleção Inconsistências de Coerência (as 4 checagens determinísticas sem IA)
    const inconsistencias = new Collection({
      name: 'inconsistencias',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'obra_id',
          type: 'relation',
          required: true,
          collectionId: obras.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_checagem',
          type: 'select',
          values: [
            'clausula_inexistente',
            'extenso_divergente',
            'divergencia_aritmetica',
            'identificador_conflitante',
          ],
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'localizacao_clausula', type: 'text' },
        { name: 'trecho_original', type: 'text' },
        { name: 'valor_encontrado', type: 'text' },
        { name: 'valor_esperado', type: 'text' },
        {
          name: 'status_validacao',
          type: 'select',
          values: ['pendente_analise', 'confirmado_fiscal', 'desconsiderado'],
          maxSelect: 1,
        },
        { name: 'parecer_fiscal', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_incons_obra ON inconsistencias (obra_id)'],
    })
    app.save(inconsistencias)

    // 4. Coleção Aditivos Contratuais (Comparação de aditivos vs contrato original)
    const aditivos = new Collection({
      name: 'aditivos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'obra_id',
          type: 'relation',
          required: true,
          collectionId: obras.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'numero_termo', type: 'text', required: true },
        {
          name: 'tipo_aditivo',
          type: 'select',
          values: [
            'Valor (Acréscimo)',
            'Valor (Supressão)',
            'Prazo (Prorrogação)',
            'Misto (Prazo e Valor)',
            'Qualitativo/Readequação',
          ],
          maxSelect: 1,
        },
        { name: 'data_assinatura', type: 'date' },
        { name: 'justificativa', type: 'text' },
        { name: 'valor_aditado', type: 'number' },
        { name: 'percentual_aditado_individual', type: 'number' },
        { name: 'prazo_aditado_dias', type: 'number' },
        { name: 'limite_legal_percentual', type: 'number' }, // 25% ou 50%
        { name: 'alerta_limite_ultrapassado', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_adit_obra ON aditivos (obra_id)'],
    })
    app.save(aditivos)

    // 5. Coleção Histórico de Medições e Liquidações
    const liquidacoes = new Collection({
      name: 'liquidacoes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'obra_id',
          type: 'relation',
          required: true,
          collectionId: obras.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'numero_medicao', type: 'text' },
        { name: 'numero_nota_empenho', type: 'text' },
        { name: 'data_liquidacao', type: 'date', required: true },
        { name: 'valor_liquidado', type: 'number', required: true },
        { name: 'percentual_medido', type: 'number' },
        { name: 'status_tramitacao', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_liq_obra ON liquidacoes (obra_id)',
        'CREATE INDEX idx_liq_data ON liquidacoes (data_liquidacao DESC)',
      ],
    })
    app.save(liquidacoes)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('liquidacoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('aditivos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('inconsistencias'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obrigacoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obras'))
    } catch (_) {}
  },
)
