/// <reference path="../pb_data/types.d.ts" />
// Adiciona o valor `Contratante` ao campo select `responsavel` da colecao
// `obrigacoes`. Antes desta migration o campo aceitava apenas `Contratada` e
// `Administracao`, o que rejeitava registros de obrigacoes cujo responsavel
// fosse o Contratante (erro `{"responsavel":"Invalid value Contratante"}`).
//
// Em PocketBase os valores aceitos por um campo `select` sao guardados como
// metadados do campo (JSON na tabela interna de colecoes), e NAO como uma
// restricao de coluna no SQLite. Portanto um `ALTER TABLE ... ALTER COLUMN`
// em SQL cru NAO atualizaria os valores permitidos e faria o campo sumir da
// API REST. A forma correta e carregar o campo via `fields.getByName()` e
// redefinir sua lista de `values`, persistindo a colecao com `app.save()`.
migrate(
  (app) => {
    const obrigacoes = app.findCollectionByNameOrId('obrigacoes')

    const responsavel = obrigacoes.fields.getByName('responsavel')
    if (!responsavel) {
      throw new Error('Campo "responsavel" nao encontrado na colecao "obrigacoes"')
    }

    // Define a lista completa (valores anteriores + novo ao final),
    // preservando a ordem existente para nao invalidar registros/consultas.
    responsavel.values = ['Contratada', 'Administração', 'Contratante']
    // maxSelect continua 1 (valor unico) — inalterado.

    app.save(obrigacoes)
  },
  (app) => {
    const obrigacoes = app.findCollectionByNameOrId('obrigacoes')

    const responsavel = obrigacoes.fields.getByName('responsavel')
    if (responsavel) {
      responsavel.values = ['Contratada', 'Administração']
    }

    app.save(obrigacoes)
  },
)
