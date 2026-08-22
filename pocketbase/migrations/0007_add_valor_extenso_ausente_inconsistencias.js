/// <reference path="../pb_data/types.d.ts" />
// Adiciona o valor `valor_extenso_ausente` ao campo select `tipo_checagem`
// da colecao `inconsistencias`.
//
// O motor deterministico em `src/lib/sigoEngine.ts` (e o tipo em
// `src/types/sigo.ts`) produz o tipo `valor_extenso_ausente`, mas o campo
// select so aceitava `valor_sem_extenso` (nome divergente adicionado pela
// migration 0005). O PocketBase rejeitava a gravacao com
// `{"tipo_checagem":"Invalid value valor_extenso_ausente"}`.
//
// Em PocketBase os valores aceitos por um campo `select` sao guardados como
// metadados do campo (JSON na tabela interna de colecoes), e NAO como uma
// restricao de coluna no SQLite. Portanto um `ALTER TABLE ... ALTER COLUMN`
// em SQL cru NAO atualizaria os valores permitidos e faria o campo sumir da
// API REST. A forma correta e carregar o campo via `fields.getByName()` e
// redefinir sua lista de `values`, persistindo a colecao com `app.save()`.
migrate(
  (app) => {
    const inconsistencias = app.findCollectionByNameOrId('inconsistencias')

    const tipoChecagem = inconsistencias.fields.getByName('tipo_checagem')
    if (!tipoChecagem) {
      throw new Error('Campo "tipo_checagem" nao encontrado na colecao "inconsistencias"')
    }

    // Define a lista completa (os 6 valores anteriores + o novo ao final),
    // preservando a ordem existente para nao invalidar registros/consultas.
    tipoChecagem.values = [
      'clausula_inexistente',
      'extenso_divergente',
      'divergencia_aritmetica',
      'identificador_conflitante',
      'prazo_incoerente',
      'valor_sem_extenso',
      'valor_extenso_ausente',
    ]
    // maxSelect continua 1 (valor unico) — inalterado.

    app.save(inconsistencias)
  },
  (app) => {
    const inconsistencias = app.findCollectionByNameOrId('inconsistencias')

    const tipoChecagem = inconsistencias.fields.getByName('tipo_checagem')
    if (tipoChecagem) {
      // Remove apenas `valor_extenso_ausente`, preservando os 6 valores
      // anteriores definidos pela migration 0005.
      tipoChecagem.values = [
        'clausula_inexistente',
        'extenso_divergente',
        'divergencia_aritmetica',
        'identificador_conflitante',
        'prazo_incoerente',
        'valor_sem_extenso',
      ]
    }

    app.save(inconsistencias)
  },
)
