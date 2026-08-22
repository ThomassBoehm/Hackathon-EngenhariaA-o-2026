migrate(
  (app) => {
    // Adiciona o campo `resumo` (texto, linguagem cidadã) à coleção `obras`.
    // Guarda o resumo automático do contrato gerado a partir dos dados extraídos.
    const col = app.findCollectionByNameOrId('obras')
    if (!col.fields.getByName('resumo')) {
      col.fields.add(new TextField({ name: 'resumo' }))
    }
    app.save(col)
  },
  (app) => {
    // Reverte: remove o campo `resumo` da coleção `obras`.
    const col = app.findCollectionByNameOrId('obras')
    const field = col.fields.getByName('resumo')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
