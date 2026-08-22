/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const TIPOS_ANTIGOS_PARA_NOVOS = {
      Edificação: 'Edificações Públicas (Infraestrutura Social)',
      Saneamento: 'Saneamento Básico e Recursos Hídricos',
      'Pavimentação/Vias': 'Infraestrutura Urbana e Mobilidade',
      Habitação: 'Edificações Públicas (Infraestrutura Social)',
      'Saúde/UBS': 'Edificações Públicas (Infraestrutura Social)',
      'Educação/Escolas': 'Edificações Públicas (Infraestrutura Social)',
      'Serviço Continuado': 'Infraestrutura Urbana e Mobilidade',
      'Aquisição/Outro': 'Edificações Públicas (Infraestrutura Social)',
    }

    let colecao
    try {
      colecao = app.db().findCollectionByNameOrId('obras')
    } catch (err) {
      console.log('[0004] Coleção "obras" não encontrada — pulando migração:', err)
      return
    }
    if (!colecao) {
      console.log('[0004] Coleção "obras" não encontrada — pulando migração')
      return
    }

    // 1) Atualizar os selectValues do campo tipo_obra para as 4 novas categorias.
    const NOVOS_TIPOS = [
      'Infraestrutura Urbana e Mobilidade',
      'Saneamento Básico e Recursos Hídricos',
      'Edificações Públicas (Infraestrutura Social)',
      'Infraestrutura de Energia e Telecomunicações',
    ]

    const campo = colecao.fields.find((f) => f.name === 'tipo_obra')
    if (campo) {
      campo.setSet(NOVOS_TIPOS)
    } else {
      console.log('[0004] Campo "tipo_obra" não encontrado na coleção obras')
    }

    app.db().save(colecao)

    // 2) Migrar os valores existentes nas linhas de obras.
    let obras
    try {
      obras = app.db().newQuery('SELECT id, tipo_obra FROM obras WHERE tipo_obra IS NOT NULL').all()
    } catch (err) {
      console.log('[0004] Erro ao consultar obras existentes:', err)
      obras = []
    }

    let atualizadas = 0
    for (const row of obras || []) {
      const novoTipo = TIPOS_ANTIGOS_PARA_NOVOS[row.tipo_obra]
      if (!novoTipo || novoTipo === row.tipo_obra) continue

      try {
        app
          .db()
          .newQuery('UPDATE obras SET tipo_obra = :novo WHERE id = :id')
          .bind({ novo: novoTipo, id: row.id })
          .execute()
        atualizadas++
      } catch (err) {
        console.log('[0004] Falha ao atualizar obra', row.id, '->', err)
      }
    }

    console.log('[0004] Migração concluída. Obras atualizadas:', atualizadas)
  },
  (app) => {
    // Rollback: restaura os 8 tipos antigos. Os valores individuais das linhas
    // não são reversíveis de forma confiável (várias categorias antigas
    // colapsam em uma só nova), então apenas restauramos a lista de opções.
    let colecao
    try {
      colecao = app.db().findCollectionByNameOrId('obras')
    } catch (err) {
      console.log('[0004][rollback] Coleção "obras" não encontrada:', err)
      return
    }
    if (!colecao) return

    const TIPOS_ANTIGOS = [
      'Edificação',
      'Saneamento',
      'Pavimentação/Vias',
      'Habitação',
      'Saúde/UBS',
      'Educação/Escolas',
      'Serviço Continuado',
      'Aquisição/Outro',
    ]

    const campo = colecao.fields.find((f) => f.name === 'tipo_obra')
    if (campo) {
      campo.setSet(TIPOS_ANTIGOS)
    }
    app.db().save(colecao)
    console.log('[0004][rollback] selectValues de tipo_obra restaurados')
  },
)
