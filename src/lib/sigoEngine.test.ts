import { describe, it, expect } from 'vitest'
import { executarChecagensCoerencia } from './sigoEngine'

/**
 * Testes básicos do motor determinístico de coerência contratual.
 *
 * Foco nos dois novos tipos de checagem adicionados a
 * `executarChecagensCoerencia`:
 *   - `prazo_incoerente`
 *   - `valor_extenso_ausente`
 */
describe('executarChecagensCoerencia', () => {
  it('retorna uma lista vazia para texto vazio ou apenas espaços', () => {
    expect(executarChecagensCoerencia('')).toEqual([])
    expect(executarChecagensCoerencia('   ')).toEqual([])
  })

  it('detecta prazo incoerente entre o prazo declarado e as datas do contrato', () => {
    const texto = [
      'O início da execução ocorre em 01/02/2026 e o término em 01/05/2026.',
      'Prazo de execução de 24 meses contados da Ordem de Serviço.',
    ].join(' ')

    const resultado = executarChecagensCoerencia(texto)
    const prazo = resultado.find((i) => i.tipo === 'prazo_incoerente')

    expect(prazo).toBeDefined()
    expect(prazo?.titulo).toMatch(/prazo/i)
  })

  it('não aponta prazo incoerente quando o prazo declarado bate com as datas', () => {
    const texto = [
      'O início ocorre em 01/02/2026 e o término em 01/05/2026.',
      'Prazo de execução de 3 meses.',
    ].join(' ')

    const resultado = executarChecagensCoerencia(texto)

    expect(resultado.some((i) => i.tipo === 'prazo_incoerente')).toBe(false)
  })

  it('detecta valor monetário sem o extenso entre parênteses', () => {
    const texto = 'O valor global contratado é de R$ 2.734.800,00.'

    const resultado = executarChecagensCoerencia(texto)
    const valor = resultado.find((i) => i.tipo === 'valor_extenso_ausente')

    expect(valor).toBeDefined()
    expect(valor?.titulo).toMatch(/extenso/i)
  })

  it('não aponta valor sem extenso quando o extenso correto está presente', () => {
    const texto = 'O valor global é de R$ 1.000.000,00 (um milhão de reais).'

    const resultado = executarChecagensCoerencia(texto)

    expect(resultado.some((i) => i.tipo === 'valor_extenso_ausente')).toBe(false)
  })
})
