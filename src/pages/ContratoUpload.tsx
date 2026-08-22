routerAdd('POST', '/backend/v1/extract-contract', (e) => {
  const body = e.requestInfo().body || {}
  const text = (body.text || '').trim()
  const fileName = (body.fileName || '').trim()

  if (!text) {
    return e.json(400, { error: 'Texto do contrato é obrigatório para extração.' })
  }

  // Prepara prompt estruturado para o Skip AI Gateway extrair todos os metadados do contrato
  const systemPrompt = `Você é um auditor especialista em direito administrativo e fiscalização de obras públicas brasileiras (Lei 14.133/2021 e Lei 8.666/1993) da plataforma SIGO.
Sua missão é analisar o texto do contrato e extrair dados estruturados em JSON estrito, sem markdown ao redor (sem \`\`\`json).

REGRAS ABSOLUTAS (violá-las invalida a resposta):
1. NUNCA invente, estime, deduza ou preencha por plausibilidade. Se o dado não estiver LITERALMENTE no texto, retorne null.
2. NUNCA use valores "típicos" de contratos públicos como preenchimento (ex.: 30 dias, 10%, 25%, 12 meses). Ausente = null.
3. Todo campo extraído deve ter um trecho literal correspondente no texto. Se não conseguir apontar o trecho, retorne null.
4. NÃO retorne dados de execução (liquidações, medições realizadas, valores pagos, percentual executado). Contrato é documento de previsão, assinado antes da execução: esses dados NÃO existem nele. Se o texto mencionar previsão de medição, isso é periodicidade, não liquidação realizada.
5. Em "inconsistencias", só aponte divergência que você consiga demonstrar citando os DOIS trechos conflitantes do texto. Na dúvida, não aponte. Falso positivo é pior que omissão.

Retorne exatamente um objeto JSON com esta estrutura:
{
  "numero_contrato": string (ex: "133/2026", "041/2026"),
  "ano_contrato": string (ex: "2026"),
  "processo_adm": string (ex: "PA-045/2026"),
  "titulo": string (título descritivo da obra/serviço),
  "objeto": string (objeto integral ou síntese clara),
  "orgao": string (órgão ou prefeitura contratante),
  "municipio": string,
  "estado_uf": string (2 letras, ex: "SP"),
  "tipo_obra": string (apenas um entre: "Edificação", "Saneamento", "Pavimentação/Vias", "Habitação", "Saúde/UBS", "Educação/Escolas", "Serviço Continuado", "Aquisição/Outro"),
  "contratada_nome": string,
  "contratada_cnpj": string,
  "valor_global_original": number,
  "valor_global_atual": number,
  "data_assinatura": string (formato YYYY-MM-DD),
  "data_ordem_servico": string (formato YYYY-MM-DD),
  "prazo_vigencia_meses": number,
  "data_fim_vigencia": string (formato YYYY-MM-DD),
  "periodicidade_tipo": string ("explícita", "por etapa", "inferida", "ausente"),
  "periodicidade_dias": number (ex: 30),
  "periodicidade_confianca": string ("alta", "média", "baixa"),
  "evento_ancora": string (ex: "ordem de serviço", "assinatura"),
  "multa_max_percentual": number (ex: 10, 20),
  "multa_remissao_externa": boolean (true se remeter ao Edital/Termo de Referência para multas),
  "limite_aditivo_percentual": number (25 ou 50),
  "qtd_aditivos": number,
  "percentual_aditado_total": number,
  "texto_destaque": string,
  "obrigacoes": [
    {
      "clausula": string (ex: "Cláusula 2.1 - Execução"),
      "descricao": string,
      "responsavel": string ("Contratada" ou "Administração"),
      "tipo_regua": string ("marco_contratual", "liquidacao_medicao" ou "administrativo"),
      "prazo_texto": string (ex: "A cada 30 dias", "120 dias da OS"),
      "data_limite": string (YYYY-MM-DD),
      "penalidade_associada": string,
      "penalidade_percentual": number,
      "status_cumprimento": string ("no_prazo", "vencido", "pendente", "cumprido"),
      "dias_atraso": number,
      "trecho_original_pdf": string,
      "confianca": string ("alta", "média", "baixa"),
      "remissao_externa": boolean
    }
  ],
  "inconsistencias": [
    {
      "tipo_checagem": string ("clausula_inexistente", "extenso_divergente", "divergencia_aritmetica", "identificador_conflitante"),
      "titulo": string,
      "descricao": string,
      "localizacao_clausula": string,
      "trecho_original": string,
      "valor_encontrado": string,
      "valor_esperado": string
    }
  ],
  "aditivos": [
    {
      "numero_termo": string (ex: "1º Termo Aditivo de Valor"),
      "tipo_aditivo": string ("Valor (Acréscimo)", "Valor (Supressão)", "Prazo (Prorrogação)", "Misto (Prazo e Valor)", "Qualitativo/Readequação"),
      "data_assinatura": string (YYYY-MM-DD),
      "justificativa": string,
      "valor_aditado": number,
      "percentual_aditado_individual": number,
      "prazo_aditado_dias": number,
      "limite_legal_percentual": number,
      "alerta_limite_ultrapassado": boolean
    }
  ]
}`

  let aiExtracao = null
  try {
    const aiRes = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Nome do arquivo: ${fileName || 'contrato.pdf'}\n\nTexto do Contrato para Extração Integral:\n${text.substring(0, 15000)}${text.length > 15000 ? '\n\n[AVISO: texto truncado em 15.000 caracteres. Não faça afirmações sobre o conteúdo omitido.]' : ''}`,
        },
      ],
    })

    const rawContent =
      aiRes.choices && aiRes.choices[0] && aiRes.choices[0].message
        ? aiRes.choices[0].message.content
        : ''
    if (rawContent) {
      const cleanJson = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      aiExtracao = JSON.parse(cleanJson)
    }
  } catch (err) {
    console.log('Erro ao processar contrato com $ai.chat:', err.message)
  }

  return e.json(200, {
    success: true,
    data: aiExtracao,
  })
})
