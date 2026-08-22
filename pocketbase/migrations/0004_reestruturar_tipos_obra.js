/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const obras = app.findCollectionByNameOrId('obras')
    obras.fields.add(
      new JSONField({
        name: 'campos_nao_identificados',
        type: 'json',
        required: false,
      }),
    )
    app.save(obras)
  },
  (app) => {
    const obras = app.findCollectionByNameOrId('obras')
    const f = obras.fields.getByName('campos_nao_identificados')
    if (f) obras.fields.removeById(f.id)
    app.save(obras)
  },
)
