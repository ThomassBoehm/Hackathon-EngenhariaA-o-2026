migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'gilberson_machado@hotmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('gilberson_machado@hotmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Fiscal de Obras - Gilberson Machado')
      app.save(record)
    }

    const obrasCol = app.findCollectionByNameOrId('obras')
    const obrigCol = app.findCollectionByNameOrId('obrigacoes')
    const inconsCol = app.findCollectionByNameOrId('inconsistencias')
    const aditCol = app.findCollectionByNameOrId('aditivos')
    const liqCol = app.findCollectionByNameOrId('liquidacoes')

    // CONTRATO 1: São Pedro do Turvo/SP - 041/2026 (Obra de 20 Habitações)
    // G = A * log10(V) * S
    // A = 47 dias / 30 = 1.5666; log10(2734800) = 6.4369; S = 20 / 10 = 2.0 -> G ~ 20.17
    // Estado: Prazo Vencido (47 dias sem liquidação > ciclo 30 + carência 15; e marco Cláusula 2.7.1 vencido)
    let obra1
    try {
      obra1 = app.findFirstRecordByData('obras', 'numero_contrato', '041/2026')
    } catch (_) {
      obra1 = new Record(obrasCol)
      obra1.set('numero_contrato', '041/2026')
      obra1.set('ano_contrato', '2026')
      obra1.set('processo_adm', 'PA-089/2025')
      obra1.set('titulo', 'Construção de 20 Unidades Habitacionais de Interesse Social')
      obra1.set(
        'objeto',
        'Contratação de empresa especializada em engenharia civil para execução de 20 unidades habitacionais térreas em alvenaria estrutural no Loteamento Nova Esperança, compreendendo fundações, superestrutura, instalações elétricas, hidrossanitárias e acabamentos.',
      )
      obra1.set('orgao', 'Secretaria Municipal de Obras e Habitação')
      obra1.set('municipio', 'São Pedro do Turvo')
      obra1.set('estado_uf', 'SP')
      obra1.set('tipo_obra', 'Habitação')
      obra1.set('contratada_nome', 'Construtora Vale do Paranapanema Ltda.')
      obra1.set('contratada_cnpj', '54.321.987/0001-12')
      obra1.set('valor_global_original', 2734800.0)
      obra1.set('valor_global_atual', 3281760.0) // 20% aditivado
      obra1.set('data_assinatura', '2025-10-15')
      obra1.set('data_ordem_servico', '2025-11-03')
      obra1.set('prazo_vigencia_meses', 12)
      obra1.set('data_fim_vigencia', '2026-11-03')

      obra1.set('periodicidade_tipo', 'por etapa')
      obra1.set('periodicidade_dias', 30)
      obra1.set('periodicidade_confianca', 'alta')
      obra1.set('evento_ancora', 'ordem de serviço')
      obra1.set('multa_max_percentual', 20.0)
      obra1.set('multa_remissao_externa', false)
      obra1.set('limite_aditivo_percentual', 50.0) // Nota: Incompatível com Lei 14.133 para nova obra (era pra ser 25%), apontamento gerado!
      obra1.set('carencia_dias', 15)

      obra1.set('data_ultima_liquidacao', '2026-03-01')
      obra1.set('valor_total_liquidado', 957180.0)
      obra1.set('porcentagem_liquidada', 29.17)
      obra1.set('porcentagem_prazo_decorrido', 58.33) // Descompasso 29.16 p.p.
      obra1.set('dias_sem_liquidacao', 47)

      obra1.set('status_classificacao', 'prazo_vencido')
      obra1.set('gravidade_score', 20.17)
      obra1.set(
        'resumo_motivo_status',
        '47 dias sem liquidação (ciclo 30d + carência 15d = 45d). Marco Cláusula 2.7.1 vencido há 34 dias com multa prevista de até 20%.',
      )
      obra1.set('tem_inconsistencias', true)
      obra1.set('tem_marco_vencido', true)
      obra1.set('qtd_aditivos', 1)
      obra1.set('percentual_aditado_total', 20.0)
      obra1.set('origem_extracao', 'upload_ia')
      obra1.set('extracao_ia_raw', {
        modelo: 'Skip AI Auditor 4.0',
        tempo_processamento: '1.4s',
        paginas_lidas: 142,
        confianca_geral: 0.94,
        texto_destaque:
          'Cláusula 9.1.1.d prevê multa de até 20% sobre o saldo remanescente em caso de mora superior a 30 dias.',
      })
      app.save(obra1)

      // Obrigações Contrato 1
      const ob1_1 = new Record(obrigCol)
      ob1_1.set('obra_id', obra1.id)
      ob1_1.set('clausula', 'Cláusula 2.7.1')
      ob1_1.set('descricao', 'Conclusão da Etapa 2: Alvenaria estrutural e laje das 20 unidades')
      ob1_1.set('responsavel', 'Contratada')
      ob1_1.set('tipo_regua', 'marco_contratual')
      ob1_1.set('prazo_texto', '120 dias a partir da Ordem de Serviço')
      ob1_1.set('data_limite', '2026-03-03')
      ob1_1.set(
        'penalidade_associada',
        'Multa moratória diária de 0,2% até o limite de 20% (Cláusula 9.1.1.d)',
      )
      ob1_1.set('penalidade_percentual', 20.0)
      ob1_1.set('status_cumprimento', 'vencido')
      ob1_1.set('dias_atraso', 34)
      ob1_1.set(
        'trecho_original_pdf',
        'Cláusula 2.7.1 - A CONTRATADA obriga-se a entregar a totalidade das alvenarias e lajes das 20 unidades habitacionais devidamente concluídas no prazo improrrogável de 120 (cento e vinte) dias da emissão da OS.',
      )
      ob1_1.set('confianca', 'alta')
      ob1_1.set('remissao_externa', false)
      app.save(ob1_1)

      const ob1_2 = new Record(obrigCol)
      ob1_2.set('obra_id', obra1.id)
      ob1_2.set('clausula', 'Cláusula 4.2')
      ob1_2.set('descricao', 'Apresentação e liquidação do boletim de medição mensal')
      ob1_2.set('responsavel', 'Administração')
      ob1_2.set('tipo_regua', 'liquidacao_medicao')
      ob1_2.set('prazo_texto', 'A cada 30 dias corridos')
      ob1_2.set('data_limite', '2026-03-31')
      ob1_2.set('penalidade_associada', 'Retenção cautelar de pagamento e notificação formal')
      ob1_2.set('penalidade_percentual', 0)
      ob1_2.set('status_cumprimento', 'vencido')
      ob1_2.set('dias_atraso', 47)
      ob1_2.set(
        'trecho_original_pdf',
        'Cláusula 4.2 - As medições serão realizadas a cada 30 (trinta) dias pela Fiscalização, expedindo-se a liquidação e empenho subsequente no prazo de até 15 dias de carência técnica.',
      )
      ob1_2.set('confianca', 'alta')
      ob1_2.set('remissao_externa', false)
      app.save(ob1_2)

      const ob1_3 = new Record(obrigCol)
      ob1_3.set('obra_id', obra1.id)
      ob1_3.set('clausula', 'Cláusula 7.1')
      ob1_3.set('descricao', 'Manutenção da Apólice de Seguro Garantia de Execução Contratual (5%)')
      ob1_3.set('responsavel', 'Contratada')
      ob1_3.set('tipo_regua', 'administrativo')
      ob1_3.set('prazo_texto', 'Vigente durante toda a execução da obra')
      ob1_3.set('data_limite', '2026-11-03')
      ob1_3.set('penalidade_associada', 'Rescisão unilateral e execução da apólice')
      ob1_3.set('penalidade_percentual', 5.0)
      ob1_3.set('status_cumprimento', 'no_prazo')
      ob1_3.set('dias_atraso', 0)
      ob1_3.set(
        'trecho_original_pdf',
        'Cláusula 7.1 - A CONTRATADA prestou garantia no valor equivalente a 5% (cinco por cento) do valor total, devendo mantê-la renovada até o recebimento definitivo.',
      )
      ob1_3.set('confianca', 'alta')
      ob1_3.set('remissao_externa', false)
      app.save(ob1_3)

      // Inconsistências Contrato 1
      const inc1_1 = new Record(inconsCol)
      inc1_1.set('obra_id', obra1.id)
      inc1_1.set('tipo_checagem', 'clausula_inexistente')
      inc1_1.set('titulo', 'Referência a Cláusula Inexistente no Instrumento')
      inc1_1.set(
        'descricao',
        'A Cláusula 11.4 remete às penalidades do "item 14.8", porém a seção 14 encerra-se na subdivisão 14.3.',
      )
      inc1_1.set('localizacao_clausula', 'Cláusula 11.4 (Página 18)')
      inc1_1.set(
        'trecho_original',
        '...conforme sanções expressamente capituladas no item 14.8 deste instrumento contratual.',
      )
      inc1_1.set('valor_encontrado', 'item 14.8')
      inc1_1.set('valor_esperado', 'Cláusula 9.1 (Sanções Administrativas)')
      inc1_1.set('status_validacao', 'pendente_analise')
      inc1_1.set('parecer_fiscal', '')
      app.save(inc1_1)

      const inc1_2 = new Record(inconsCol)
      inc1_2.set('obra_id', obra1.id)
      inc1_2.set('tipo_checagem', 'divergencia_aritmetica')
      inc1_2.set('titulo', 'Limite de Aditivo Incompatível com a Legislação (50%)')
      inc1_2.set(
        'descricao',
        'A Cláusula 6.3 fixa permissivo de aditamento de até 50% para obra nova sem demonstrar hipótese excepcional de reforma/restauro da Lei 14.133.',
      )
      inc1_2.set('localizacao_clausula', 'Cláusula 6.3')
      inc1_2.set(
        'trecho_original',
        'O presente contrato poderá ser aditado em até 50% (cinquenta por cento) do seu valor inicial atualizado.',
      )
      inc1_2.set('valor_encontrado', '50%')
      inc1_2.set('valor_esperado', '25% (Art. 125, Lei 14.133/21 para obras novas)')
      inc1_2.set('status_validacao', 'confirmado_fiscal')
      inc1_2.set(
        'parecer_fiscal',
        'Apontamento pertinente. Ajustar limite nos termos aditivos para 25% conforme parecer jurídico complementar.',
      )
      app.save(inc1_2)

      // Aditivo Contrato 1
      const ad1 = new Record(aditCol)
      ad1.set('obra_id', obra1.id)
      ad1.set('numero_termo', '1º Termo Aditivo de Valor')
      ad1.set('tipo_aditivo', 'Valor (Acréscimo)')
      ad1.set('data_assinatura', '2026-01-20')
      ad1.set(
        'justificativa',
        'Adequação de fundações e contenção em decorrência de solo inconforme detectado nas sondagens complementares.',
      )
      ad1.set('valor_aditado', 546960.0)
      ad1.set('percentual_aditado_individual', 20.0)
      ad1.set('prazo_aditado_dias', 0)
      ad1.set('limite_legal_percentual', 25.0)
      ad1.set('alerta_limite_ultrapassado', false)
      app.save(ad1)

      // Liquidações Contrato 1
      const l1_1 = new Record(liqCol)
      l1_1.set('obra_id', obra1.id)
      l1_1.set('numero_medicao', '1ª Medição')
      l1_1.set('numero_nota_empenho', 'NE-2025/0812')
      l1_1.set('data_liquidacao', '2025-12-18')
      l1_1.set('valor_liquidado', 410220.0)
      l1_1.set('percentual_medido', 15.0)
      l1_1.set('status_tramitacao', 'Liquidado e Pago')
      l1_1.set('observacoes', 'Serviços preliminares e terraplanagem concluídos.')
      app.save(l1_1)

      const l1_2 = new Record(liqCol)
      l1_2.set('obra_id', obra1.id)
      l1_2.set('numero_medicao', '2ª Medição')
      l1_2.set('numero_nota_empenho', 'NE-2026/0145')
      l1_2.set('data_liquidacao', '2026-03-01')
      l1_2.set('valor_liquidado', 546960.0)
      l1_2.set('percentual_medido', 14.17)
      l1_2.set('status_tramitacao', 'Liquidado e Pago')
      l1_2.set('observacoes', 'Fundações concluídas.')
      app.save(l1_2)
    }

    // CONTRATO 2: Pontal/SP - 133/2026 (Serviço Continuado de Manutenção e Conservação Viária)
    // G = A * log10(V) * S
    // A = 22 dias / 30 = 0.7333; log10(469470) = 5.6716; S = 1.0 (remissao externa ao TR) -> G ~ 4.16
    // Estado: Fora do Ritmo (passou o ciclo de 30 dias, mas está dentro dos 15 dias de carência -> 30 + 15 = 45 dias max, está em 37 dias)
    let obra2
    try {
      obra2 = app.findFirstRecordByData('obras', 'numero_contrato', '133/2026')
    } catch (_) {
      obra2 = new Record(obrasCol)
      obra2.set('numero_contrato', '133/2026')
      obra2.set('ano_contrato', '2026')
      obra2.set('processo_adm', 'PA-045/2026')
      obra2.set('titulo', 'Serviço Continuado de Manutenção, Conservação e Pavimentação Asfáltica')
      obra2.set(
        'objeto',
        'Prestação de serviços contínuos de conservação, recomposição de pavimento asfáltico em CBUQ, fresagem e tapa-buracos em vias públicas do município de Pontal.',
      )
      obra2.set('orgao', 'Secretaria Municipal de Serviços Urbanos')
      obra2.set('municipio', 'Pontal')
      obra2.set('estado_uf', 'SP')
      obra2.set('tipo_obra', 'Pavimentação/Vias')
      obra2.set('contratada_nome', 'Pavimentadora & Engenharia Paulista S/A')
      obra2.set('contratada_cnpj', '41.552.123/0001-88')
      obra2.set('valor_global_original', 469470.0)
      obra2.set('valor_global_atual', 469470.0)
      obra2.set('data_assinatura', '2026-01-10')
      obra2.set('data_ordem_servico', '2026-01-20')
      obra2.set('prazo_vigencia_meses', 12)
      obra2.set('data_fim_vigencia', '2027-01-20')

      obra2.set('periodicidade_tipo', 'inferida')
      obra2.set('periodicidade_dias', 30) // 12 x MÊS
      obra2.set('periodicidade_confianca', 'média')
      obra2.set('evento_ancora', 'ordem de serviço')
      obra2.set('multa_max_percentual', 10.0)
      obra2.set('multa_remissao_externa', true) // Remete ao TR -> S = 1.0 padrão
      obra2.set('limite_aditivo_percentual', 25.0)
      obra2.set('carencia_dias', 15)

      obra2.set('data_ultima_liquidacao', '2026-03-10')
      obra2.set('valor_total_liquidado', 78245.0)
      obra2.set('porcentagem_liquidada', 16.67)
      obra2.set('porcentagem_prazo_decorrido', 25.0)
      obra2.set('dias_sem_liquidacao', 37) // Passou 30 dias de ciclo, mas 37 < 45 (ciclo + carência)

      obra2.set('status_classificacao', 'fora_do_ritmo')
      obra2.set('gravidade_score', 4.16)
      obra2.set(
        'resumo_motivo_status',
        '37 dias sem liquidação. Ciclo pactuado de 30 dias ultrapassado, porém resguardado pela carência de trâmite de 15 dias (limiar 45 dias).',
      )
      obra2.set('tem_inconsistencias', true)
      obra2.set('tem_marco_vencido', false)
      obra2.set('qtd_aditivos', 0)
      obra2.set('percentual_aditado_total', 0)
      obra2.set('origem_extracao', 'upload_ia')
      obra2.set('extracao_ia_raw', {
        modelo: 'Skip AI Auditor 4.0',
        tempo_processamento: '0.9s',
        paginas_lidas: 68,
        confianca_geral: 0.88,
        texto_destaque:
          'Penalidades remetidas ao Anexo I - Termo de Referência. S atribuído como 1,0 determinístico.',
      })
      app.save(obra2)

      // Inconsistência Contrato 2
      const inc2_1 = new Record(inconsCol)
      inc2_1.set('obra_id', obra2.id)
      inc2_1.set('tipo_checagem', 'extenso_divergente')
      inc2_1.set('titulo', 'Divergência entre Número e Extenso de Prazos')
      inc2_1.set(
        'descricao',
        'No item 5.2 do contrato, consta "prazo de 12 (dez) meses de vigência", divergindo algarismo arábico 12 do numeral por extenso dez.',
      )
      inc2_1.set('localizacao_clausula', 'Item 5.2 (Vigência)')
      inc2_1.set(
        'trecho_original',
        'O prazo de vigência deste instrumento será de 12 (dez) meses, prorrogável nos termos da Lei 14.133/21.',
      )
      inc2_1.set('valor_encontrado', '12 (dez)')
      inc2_1.set('valor_esperado', '12 (doze) meses')
      inc2_1.set('status_validacao', 'pendente_analise')
      inc2_1.set('parecer_fiscal', '')
      app.save(inc2_1)

      const inc2_2 = new Record(inconsCol)
      inc2_2.set('obra_id', obra2.id)
      inc2_2.set('tipo_checagem', 'identificador_conflitante')
      inc2_2.set('titulo', 'Identificadores Conflitantes de Pregão no Cabeçalho')
      inc2_2.set(
        'descricao',
        'Na capa cita Pregão Eletrônico nº 012/2026 e na Cláusula 1ª cita Pregão Eletrônico nº 018/2026.',
      )
      inc2_2.set('localizacao_clausula', 'Preâmbulo vs. Cláusula Primeira')
      inc2_2.set(
        'trecho_original',
        '...decorrente do Pregão Eletrônico nº 018/2026 constante do processo administrativo...',
      )
      inc2_2.set('valor_encontrado', 'Pregão 012/2026 e Pregão 018/2026')
      inc2_2.set('valor_esperado', 'Pregão Eletrônico nº 012/2026')
      inc2_2.set('status_validacao', 'confirmado_fiscal')
      inc2_2.set(
        'parecer_fiscal',
        'Erro material de digitação na Cláusula Primeira confirmado via Processo Administrativo.',
      )
      app.save(inc2_2)

      // Obrigações Contrato 2
      const ob2_1 = new Record(obrigCol)
      ob2_1.set('obra_id', obra2.id)
      ob2_1.set('clausula', 'Cláusula 3.1')
      ob2_1.set('descricao', 'Envio de relatório mensal de produção de asfalto e equipes alocadas')
      ob2_1.set('responsavel', 'Contratada')
      ob2_1.set('tipo_regua', 'liquidacao_medicao')
      ob2_1.set('prazo_texto', 'Até o 5º dia útil de cada mês')
      ob2_1.set('data_limite', '2026-04-07')
      ob2_1.set('penalidade_associada', 'Remetida ao TR (Advertência / Multa)')
      ob2_1.set('penalidade_percentual', 10.0)
      ob2_1.set('status_cumprimento', 'no_prazo')
      ob2_1.set('dias_atraso', 0)
      ob2_1.set(
        'trecho_original_pdf',
        'Cláusula 3.1 - A empresa encaminhará mensalmente até o 5º dia útil o diário de obras consolidado.',
      )
      ob2_1.set('confianca', 'média')
      ob2_1.set('remissao_externa', true)
      app.save(ob2_1)

      // Liquidações Contrato 2
      const l2_1 = new Record(liqCol)
      l2_1.set('obra_id', obra2.id)
      l2_1.set('numero_medicao', '1ª Medição')
      l2_1.set('numero_nota_empenho', 'NE-2026/0091')
      l2_1.set('data_liquidacao', '2026-03-10')
      l2_1.set('valor_liquidado', 78245.0)
      l2_1.set('percentual_medido', 16.67)
      l2_1.set('status_tramitacao', 'Liquidado')
      l2_1.set('observacoes', 'Serviços de tapa-buracos em vias centrais.')
      app.save(l2_1)
    }

    // CONTRATO 3: Teixeira de Freitas/BA - 2-DLE-086-2026 (Aquisição de Materiais e Equipamentos)
    // Sem dados de execução (Sem periodicidade identificável -> não entra no ranking G, listado à parte)
    let obra3
    try {
      obra3 = app.findFirstRecordByData('obras', 'numero_contrato', '2-DLE-086-2026')
    } catch (_) {
      obra3 = new Record(obrasCol)
      obra3.set('numero_contrato', '2-DLE-086-2026')
      obra3.set('ano_contrato', '2026')
      obra3.set('processo_adm', 'DISP-086/2026')
      obra3.set(
        'titulo',
        'Fornecimento e Instalação de Equipamentos Hidráulicos para Estação Elevatória',
      )
      obra3.set(
        'objeto',
        'Aquisição de conjuntos motobomba e conexões em ferro fundido para reforço da estação elevatória de esgoto do bairro Bela Vista.',
      )
      obra3.set('orgao', 'Secretaria Municipal de Meio Ambiente e Saneamento')
      obra3.set('municipio', 'Teixeira de Freitas')
      obra3.set('estado_uf', 'BA')
      obra3.set('tipo_obra', 'Saneamento')
      obra3.set('contratada_nome', 'HidroSul Bombas & Motores Eireli')
      obra3.set('contratada_cnpj', '19.882.331/0001-09')
      obra3.set('valor_global_original', 19683.44)
      obra3.set('valor_global_atual', 19683.44)
      obra3.set('data_assinatura', '2026-02-15')
      obra3.set('data_ordem_servico', '2026-02-15')
      obra3.set('prazo_vigencia_meses', 3)
      obra3.set('data_fim_vigencia', '2026-05-15')

      obra3.set('periodicidade_tipo', 'ausente')
      obra3.set('periodicidade_dias', 0)
      obra3.set('periodicidade_confianca', 'baixa')
      obra3.set('evento_ancora', 'assinatura')
      obra3.set('multa_max_percentual', 10.0)
      obra3.set('multa_remissao_externa', false)
      obra3.set('limite_aditivo_percentual', 25.0)
      obra3.set('carencia_dias', 15)

      obra3.set('data_ultima_liquidacao', null)
      obra3.set('valor_total_liquidado', 0.0)
      obra3.set('porcentagem_liquidada', 0.0)
      obra3.set('porcentagem_prazo_decorrido', 60.0)
      obra3.set('dias_sem_liquidacao', 60)

      obra3.set('status_classificacao', 'sem_dados')
      obra3.set('gravidade_score', 0) // Sem divisor de periodicidade, vai para lista de sem dados
      obra3.set(
        'resumo_motivo_status',
        'Contrato sem periodicidade de medição identificável no instrumento. Sinalizado sem imputação determinística de mora.',
      )
      obra3.set('tem_inconsistencias', false)
      obra3.set('tem_marco_vencido', false)
      obra3.set('qtd_aditivos', 0)
      obra3.set('percentual_aditado_total', 0)
      obra3.set('origem_extracao', 'upload_ia')
      obra3.set('extracao_ia_raw', {
        modelo: 'Skip AI Auditor 4.0',
        tempo_processamento: '0.6s',
        paginas_lidas: 22,
        confianca_geral: 0.96,
        texto_destaque: 'Entrega única de bens. Sem medições intermediárias previstas.',
      })
      app.save(obra3)

      const ob3_1 = new Record(obrigCol)
      ob3_1.set('obra_id', obra3.id)
      ob3_1.set('clausula', 'Cláusula 4.1')
      ob3_1.set('descricao', 'Entrega integral dos equipamentos no almoxarifado central')
      ob3_1.set('responsavel', 'Contratada')
      ob3_1.set('tipo_regua', 'marco_contratual')
      ob3_1.set('prazo_texto', 'Até 45 dias da assinatura')
      ob3_1.set('data_limite', '2026-03-31')
      ob3_1.set('penalidade_associada', 'Multa moratória de 0,5% ao dia')
      ob3_1.set('penalidade_percentual', 10.0)
      ob3_1.set('status_cumprimento', 'cumprido')
      ob3_1.set('dias_atraso', 0)
      ob3_1.set(
        'trecho_original_pdf',
        'Cláusula 4.1 - Os bens deverão ser entregues em remessa única no prazo de 45 dias.',
      )
      ob3_1.set('confianca', 'alta')
      ob3_1.set('remissao_externa', false)
      app.save(ob3_1)
    }

    // CONTRATO 4: São Paulo/SP - 015/SME/2025 (Reforma e Ampliação de EMEF no Grajaú)
    // Estado: No ritmo previsto (Execução regular, liquidação recente há 12 dias)
    // G = A * log10(V) * S -> 12/30 * log10(8450000) * 1.5 = 0.40 * 6.9268 * 1.5 = 4.15
    let obra4
    try {
      obra4 = app.findFirstRecordByData('obras', 'numero_contrato', '015/SME/2025')
    } catch (_) {
      obra4 = new Record(obrasCol)
      obra4.set('numero_contrato', '015/SME/2025')
      obra4.set('ano_contrato', '2025')
      obra4.set('processo_adm', '6016.2025/0004128-1')
      obra4.set('titulo', 'Reforma Estrutural e Ampliação de 8 Salas de Aula da EMEF Grajaú')
      obra4.set(
        'objeto',
        'Execução de obras de reforma geral, reforço de fundação, ampliação de bloco pedagógico com 8 salas de aula, quadra poliesportiva coberta e adequação de acessibilidade universal na EMEF Grajaú.',
      )
      obra4.set('orgao', 'Secretaria Municipal de Educação - SME/SP')
      obra4.set('municipio', 'São Paulo')
      obra4.set('estado_uf', 'SP')
      obra4.set('tipo_obra', 'Educação/Escolas')
      obra4.set('contratada_nome', 'Consórcio Metrópole Engenharia & Infraestrutura')
      obra4.set('contratada_cnpj', '33.109.844/0001-44')
      obra4.set('valor_global_original', 8450000.0)
      obra4.set('valor_global_atual', 8450000.0)
      obra4.set('data_assinatura', '2025-08-10')
      obra4.set('data_ordem_servico', '2025-09-01')
      obra4.set('prazo_vigencia_meses', 18)
      obra4.set('data_fim_vigencia', '2027-03-01')

      obra4.set('periodicidade_tipo', 'explícita')
      obra4.set('periodicidade_dias', 30)
      obra4.set('periodicidade_confianca', 'alta')
      obra4.set('evento_ancora', 'ordem de serviço')
      obra4.set('multa_max_percentual', 15.0)
      obra4.set('multa_remissao_externa', false)
      obra4.set('limite_aditivo_percentual', 25.0)
      obra4.set('carencia_dias', 15)

      obra4.set('data_ultima_liquidacao', '2026-04-05')
      obra4.set('valor_total_liquidado', 3802500.0)
      obra4.set('porcentagem_liquidada', 45.0)
      obra4.set('porcentagem_prazo_decorrido', 44.44) // Curvas alinhadas perfeitamente
      obra4.set('dias_sem_liquidacao', 12)

      obra4.set('status_classificacao', 'no_ritmo')
      obra4.set('gravidade_score', 4.15)
      obra4.set(
        'resumo_motivo_status',
        'Execução dentro do ciclo de medição pactuado (12 dias desde última liquidação). Curva físico-financeira perfeitamente compatível com o cronograma.',
      )
      obra4.set('tem_inconsistencias', false)
      obra4.set('tem_marco_vencido', false)
      obra4.set('qtd_aditivos', 0)
      obra4.set('percentual_aditado_total', 0)
      obra4.set('origem_extracao', 'upload_ia')
      obra4.set('extracao_ia_raw', {
        modelo: 'Skip AI Auditor 4.0',
        tempo_processamento: '1.8s',
        paginas_lidas: 210,
        confianca_geral: 0.98,
        texto_destaque:
          'Contrato perfeitamente estruturado, sem inconsistências de texto detectadas.',
      })
      app.save(obra4)

      // Obrigações Contrato 4
      const ob4_1 = new Record(obrigCol)
      ob4_1.set('obra_id', obra4.id)
      ob4_1.set('clausula', 'Cláusula 5.3')
      ob4_1.set('descricao', 'Conclusão da cobertura metálica da quadra esportiva')
      ob4_1.set('responsavel', 'Contratada')
      ob4_1.set('tipo_regua', 'marco_contratual')
      ob4_1.set('prazo_texto', '240 dias da Ordem de Serviço')
      ob4_1.set('data_limite', '2026-05-01')
      ob4_1.set('penalidade_associada', 'Multa de 0,1% ao dia até 10%')
      ob4_1.set('penalidade_percentual', 10.0)
      ob4_1.set('status_cumprimento', 'no_prazo')
      ob4_1.set('dias_atraso', 0)
      ob4_1.set(
        'trecho_original_pdf',
        'Cláusula 5.3 - A conclusão da estrutura de cobertura da quadra deverá ocorrer no prazo de 240 dias.',
      )
      ob4_1.set('confianca', 'alta')
      ob4_1.set('remissao_externa', false)
      app.save(ob4_1)

      // Liquidações Contrato 4
      const l4_1 = new Record(liqCol)
      l4_1.set('obra_id', obra4.id)
      l4_1.set('numero_medicao', '7ª Medição')
      l4_1.set('numero_nota_empenho', 'NE-2026/004312')
      l4_1.set('data_liquidacao', '2026-04-05')
      l4_1.set('valor_liquidado', 620000.0)
      l4_1.set('percentual_medido', 7.34)
      l4_1.set('status_tramitacao', 'Liquidado e Pago')
      l4_1.set('observacoes', 'Instalações de alvenaria do 2º pavimento e cobertura do bloco C.')
      app.save(l4_1)
    }

    // CONTRATO 5: Santo André/SP - 088/SMS/2025 (Construção de Unidade Básica de Saúde - UBS Vila Luzita)
    // Fora do ritmo por descompasso de curva (prazo 70%, liquidado 35% -> diferença 35 p.p. >= 20 p.p.)
    let obra5
    try {
      obra5 = app.findFirstRecordByData('obras', 'numero_contrato', '088/SMS/2025')
    } catch (_) {
      obra5 = new Record(obrasCol)
      obra5.set('numero_contrato', '088/SMS/2025')
      obra5.set('ano_contrato', '2025')
      obra5.set('processo_adm', 'SMS-1094/2025')
      obra5.set('titulo', 'Construção da Nova Unidade Básica de Saúde Porte III - Vila Luzita')
      obra5.set(
        'objeto',
        'Construção de UBS Porte III com 12 consultórios médicos, consultório odontológico com 4 cadeiras, salas de vacina, curativos, farmácia e recepção integrada com climatização e sustentabilidade solar.',
      )
      obra5.set('orgao', 'Secretaria Municipal de Saúde')
      obra5.set('municipio', 'Santo André')
      obra5.set('estado_uf', 'SP')
      obra5.set('tipo_obra', 'Saúde/UBS')
      obra5.set('contratada_nome', 'Avanço Construções e Projetos Hospitalares Ltda.')
      obra5.set('contratada_cnpj', '21.094.773/0001-55')
      obra5.set('valor_global_original', 4120000.0)
      obra5.set('valor_global_atual', 4120000.0)
      obra5.set('data_assinatura', '2025-06-20')
      obra5.set('data_ordem_servico', '2025-07-01')
      obra5.set('prazo_vigencia_meses', 14)
      obra5.set('data_fim_vigencia', '2026-09-01')

      obra5.set('periodicidade_tipo', 'explícita')
      obra5.set('periodicidade_dias', 30)
      obra5.set('periodicidade_confianca', 'alta')
      obra5.set('evento_ancora', 'ordem de serviço')
      obra5.set('multa_max_percentual', 10.0)
      obra5.set('multa_remissao_externa', false)
      obra5.set('limite_aditivo_percentual', 25.0)
      obra5.set('carencia_dias', 15)

      obra5.set('data_ultima_liquidacao', '2026-03-25')
      obra5.set('valor_total_liquidado', 1442000.0)
      obra5.set('porcentagem_liquidada', 35.0)
      obra5.set('porcentagem_prazo_decorrido', 67.85) // Descompasso 32.85 p.p. (> 20 p.p.)
      obra5.set('dias_sem_liquidacao', 23)

      obra5.set('status_classificacao', 'fora_do_ritmo')
      obra5.set('gravidade_score', 5.07)
      obra5.set(
        'resumo_motivo_status',
        'Descompasso grave de 32,85 p.p. entre prazo decorrido (67,85%) e valor liquidado (35,00%), indicando lentidão crônica no avanço físico da obra.',
      )
      obra5.set('tem_inconsistencias', false)
      obra5.set('tem_marco_vencido', false)
      obra5.set('qtd_aditivos', 0)
      obra5.set('percentual_aditado_total', 0)
      obra5.set('origem_extracao', 'upload_ia')
      obra5.set('extracao_ia_raw', {
        modelo: 'Skip AI Auditor 4.0',
        tempo_processamento: '1.1s',
        paginas_lidas: 115,
        confianca_geral: 0.95,
        texto_destaque:
          'Cláusula 12.2 estabelece medições mensais vinculadas ao cronograma físico.',
      })
      app.save(obra5)

      // Obrigações Contrato 5
      const ob5_1 = new Record(obrigCol)
      ob5_1.set('obra_id', obra5.id)
      ob5_1.set('clausula', 'Cláusula 6.1')
      ob5_1.set('descricao', 'Conclusão das instalações hidrossanitárias e gases medicinais')
      ob5_1.set('responsavel', 'Contratada')
      ob5_1.set('tipo_regua', 'marco_contratual')
      ob5_1.set('prazo_texto', '300 dias da Ordem de Serviço')
      ob5_1.set('data_limite', '2026-04-27')
      ob5_1.set('penalidade_associada', 'Multa de 0,2% ao dia')
      ob5_1.set('penalidade_percentual', 10.0)
      ob5_1.set('status_cumprimento', 'pendente')
      ob5_1.set('dias_atraso', 0)
      ob5_1.set(
        'trecho_original_pdf',
        'Cláusula 6.1 - A contratada deverá entregar as instalações especiais e rede de gases medicinais testada em 300 dias.',
      )
      ob5_1.set('confianca', 'alta')
      ob5_1.set('remissao_externa', false)
      app.save(ob5_1)
    }
  },
  (app) => {
    // down migration
  },
)
