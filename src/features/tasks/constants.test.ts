import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseQuickCapture } from './constants'

describe('captura rapida de tareas', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('extrae etiquetas y limpia espacios', () => {
    expect(parseQuickCapture('  Preparar   entrega #universidad #qa  ')).toEqual({
      title: 'Preparar entrega',
      dueDate: undefined,
      tags: JSON.stringify(['universidad', 'qa']),
    })
  })

  it('reconoce hoy y mañana', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'))

    expect(parseQuickCapture('Presentar informe hoy')).toMatchObject({
      title: 'Presentar informe',
      dueDate: '2026-06-07',
    })
    expect(parseQuickCapture('Enviar anexos manana')).toMatchObject({
      title: 'Enviar anexos',
      dueDate: '2026-06-08',
    })
    expect(parseQuickCapture('Call tomorrow')).toMatchObject({
      title: 'Call',
      dueDate: '2026-06-08',
    })
  })

  it('conserva una tarea normal sin metadatos', () => {
    expect(parseQuickCapture('Revisar conclusiones')).toEqual({
      title: 'Revisar conclusiones',
      dueDate: undefined,
      tags: undefined,
    })
  })
})
