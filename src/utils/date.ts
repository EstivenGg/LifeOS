export function today(): string { return formatDate(new Date()) }
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}
export function parseDate(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export function addDays(date: string, n: number): string { const d = parseDate(date); d.setDate(d.getDate() + n); return formatDate(d) }
export function daysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return formatDate(d) }
export function daysBefore(date: string, n: number): string { return addDays(date, -n) }
export function daysBetween(start: string, end: string): string[] {
  const dates: string[] = []; let c = start; while (c <= end) { dates.push(c); c = addDays(c, 1) }; return dates
}
export function displayDate(s: string): string {
  return parseDate(s).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}
export function shortDate(s: string): string {
  return parseDate(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
export function fmtMin(m: number): string { return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m` }

export function formatPace(distanceKm?: number, durationMin?: number): string {
  if (!distanceKm || !durationMin || distanceKm <= 0 || durationMin <= 0) return '--:--'
  const totalSecs = Math.round((durationMin * 60) / distanceKm)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function formatSpeed(distanceKm?: number, durationMin?: number): string {
  if (!distanceKm || !durationMin || durationMin <= 0) return '--'
  const kmh = distanceKm / (durationMin / 60)
  return `${kmh.toFixed(1)} km/h`
}
