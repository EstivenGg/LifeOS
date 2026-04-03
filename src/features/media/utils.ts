import type { MediaItem } from '@/data/types'
import type {
  MediaFilterState,
  MediaPieDatum,
  MediaRatingDatum,
  MediaStatsSummary,
  MediaTagDatum,
} from './types'

export function createMediaForm(type: MediaItem['type'] = 'movie'): Partial<MediaItem> {
  return {
    type,
    title: '',
    status: 'quiero_ver',
    rating: 0,
    tags: '',
    notes: '',
    description: '',
    coverDataUrl: undefined,
    releaseYear: undefined,
  }
}

export function getMediaTypeLabel(type: MediaItem['type']) {
  return type === 'series' ? 'Serie' : 'Película'
}

export function splitMediaTags(tags?: string) {
  return tags?.split(',').map(tag => tag.trim()).filter(Boolean) ?? []
}

export function collectMediaTags(items: MediaItem[]) {
  const tags = new Set<string>()

  items.forEach(item => {
    splitMediaTags(item.tags).forEach(tag => tags.add(tag))
  })

  return Array.from(tags).sort()
}

export function filterMediaItems(items: MediaItem[], filters: MediaFilterState) {
  const searchTerm = filters.search.toLowerCase().trim()

  const result = items
    .filter(item => filters.tab === 'all' || item.type === filters.tab)
    .filter(item => filters.filter === 'all' || item.status === filters.filter)
    .filter(item => !searchTerm || item.title.toLowerCase().includes(searchTerm))
    .filter(item => {
      if (!filters.filterTag) {
        return true
      }

      const tags = splitMediaTags(item.tags).map(tag => tag.toLowerCase())
      return tags.includes(filters.filterTag.toLowerCase())
    })

  result.sort((left, right) => {
    switch (filters.sortBy) {
      case 'title':
        return left.title.localeCompare(right.title)
      case 'rating':
        return (right.rating ?? 0) - (left.rating ?? 0)
      default:
        return right.createdAt.localeCompare(left.createdAt)
    }
  })

  return result
}

export function buildMediaStats(items: MediaItem[]): MediaStatsSummary {
  const finished = items.filter(item => item.status === 'terminado').length
  const watching = items.filter(item => item.status === 'viendo').length
  const wantToWatch = items.filter(item => item.status === 'quiero_ver').length
  const ratedItems = items.filter(item => item.rating)

  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratedItems.length).toFixed(1)
    : '—'

  return {
    finished,
    watching,
    wantToWatch,
    avgRating,
    total: items.length,
  }
}

export function buildStatusChartData(items: MediaItem[], accentHex: string): MediaPieDatum[] {
  return [
    { name: 'Quiero ver', value: items.filter(item => item.status === 'quiero_ver').length, color: '#38bdf8' },
    { name: 'Viendo', value: items.filter(item => item.status === 'viendo').length, color: '#22c55e' },
    { name: 'Terminado', value: items.filter(item => item.status === 'terminado').length, color: accentHex },
    { name: 'Pausado', value: items.filter(item => item.status === 'pausado').length, color: 'rgba(255,255,255,0.18)' },
  ].filter(item => item.value > 0)
}

export function buildTypeChartData(items: MediaItem[], accentHex: string): MediaPieDatum[] {
  return [
    { name: 'Películas', value: items.filter(item => item.type === 'movie').length, color: accentHex },
    { name: 'Series', value: items.filter(item => item.type === 'series').length, color: '#8b5cf6' },
  ].filter(item => item.value > 0)
}

export function buildTagChartData(items: MediaItem[]): MediaTagDatum[] {
  const counts: Record<string, number> = {}

  items.forEach(item => {
    splitMediaTags(item.tags).forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1
    })
  })

  return Object.entries(counts)
    .map(([name, count]) => ({
      name: name.length > 20 ? `${name.substring(0, 20)}…` : name,
      count,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10)
}

export function buildRatingChartData(items: MediaItem[]): MediaRatingDatum[] {
  return [1, 2, 3, 4, 5].map(rating => ({
    label: '★'.repeat(rating),
    count: items.filter(item => item.rating === rating).length,
  }))
}
