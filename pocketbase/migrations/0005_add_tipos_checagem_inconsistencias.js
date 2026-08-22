/// <reference path="../pb_data/types.d.ts" />
// Adiciona os valores `prazo_incoerente` e `valor_sem_extenso` ao campo
// select `tipo_checagem` da coleção `inconsistencias`.
//
// Em PocketBase os valores aceitos por um campo `select` são guardados como
// metadados do campo (JSON na tabela interna de coleções), e NÃO como uma
// restrição de coluna no SQLite. Portanto um `ALTER TABLE ... ALTER COLUMN`
// em SQL cru NÃO atualizaria os valores permitidos e faria o campo sumir da
// API REST. A forma correta é carregar o campo via `fields.getByName()` e
// redefinir sua lista de `values`, persistindo a coleção com `app.save()`.
migrate(
  (app) => {
    const inconsistencias = app.findCollectionByNameOrId('inconsistencias')

    const tipoChecagem = inconsistencias.fields.getByName('tipo_checagem')
    if (!tipoChecagem) {
      throw new Error('Campo "tipo_checagem" nao encontrado na colecao "inconsistencias"')
    }

    // Define a lista completa (valores anteriores + novos ao final),
    // preservando a ordem existente para nao invalidar registros/consultas.
    tipoChecagem.values = [
      'clausula_inexistente',
      'extenso_divergente',
      'divergencia_aritmetica',
      'identificador_conflitante',
      'prazo_incoerente',
      'valor_sem_extenso',
    ]
    // maxSelect continua 1 (valor unico) — inalterado.

    app.save(inconsistencias)
  },
  (app) => {
    const inconsistencias = app.findCollectionByNameOrId('inconsistencias')

    const tipoChecagem = inconsistencias.fields.getByName('tipo_checagem')
    if (tipoChecagem) {
      tipoChecagem.values = [
        'clausula_inexistente',
        'extenso_divergente',
        'divergencia_aritmetica',
        'identificador_conflitante',
      ]
    }

    app.save(inconsistencias)
  },
)
