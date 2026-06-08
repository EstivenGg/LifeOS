import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  daysAgo,
  daysBefore,
  daysBetween,
  displayDate,
  fmtMin,
  formatDate,
  formatPace,
  formatSpeed,
  isDateString,
  parseDate,
  shortDate,
  today,
} from './date'

describe('utilidades de fecha', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formatea, valida y convierte fechas', () => {
    const date = new Date(2026, 0, 5)

    expect(formatDate(date)).toBe('2026-01-05')
    expect(isDateString('2026-01-05')).toBe(true)
    expect(isDateString('05/01/2026')).toBe(false)
    expect(isDateString(20260105)).toBe(false)
    expect(parseDate('2026-01-05')).toEqual(date)
  })

  it('calcula fechas relativas y rangos inclusivos', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01')
    expect(daysBefore('2026-06-07', 7)).toBe('2026-05-31')
    expect(daysBetween('2026-06-05', '2026-06-07')).toEqual([
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ])
    expect(daysBetween('2026-06-08', '2026-06-07')).toEqual([])
  })

  it('usa la fecha actual de forma controlada', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 7, 9, 30))

    expect(today()).toBe('2026-06-07')
    expect(daysAgo(2)).toBe('2026-06-05')
  })

  it('presenta fechas y duraciones para el usuario', () => {
    expect(displayDate('2026-06-07')).toContain('7')
    expect(shortDate('2026-06-07')).toContain('7')
    expect(fmtMin(45)).toBe('45m')
    expect(fmtMin(135)).toBe('2h 15m')
  })

  it('calcula ritmo y velocidad', () => {
    expect(formatPace(5, 25)).toBe('5:00')
    expect(formatPace(3, 16)).toBe('5:20')
    expect(formatPace(0, 20)).toBe('--:--')
    expect(formatPace(5, -1)).toBe('--:--')

    expect(formatSpeed(10, 30)).toBe('20.0 km/h')
    expect(formatSpeed(undefined, 30)).toBe('--')
    expect(formatSpeed(10, 0)).toBe('--')
  })
})
