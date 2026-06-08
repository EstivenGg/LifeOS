import { describe, expect, it } from 'vitest'
import type { MediaItem } from '@/data/types'
import type { MediaFilterState } from './types'
import {
  buildMediaStats,
  buildRatingChartData,
  buildStatusChartData,
  buildTagChartData,
  buildTypeChartData,
  collectMediaTags,
  createMediaForm,
  filterMediaItems,
  getMediaTypeLabel,
  splitMediaTags,
} from './utils'

const items: MediaItem[] = [
  {
    id: 1,
    type: 'movie',
    title: 'Interestelar',
    status: 'terminado',
    rating: 5,
    tags: 'Ciencia ficcion, Drama',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    type: 'series',
    title: 'The Bear',
    status: 'viendo',
    rating: 4,
    tags: 'Drama, Comedia',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 3,
    type: 'movie',
    title: 'Dune',
    status: 'quiero_ver',
    tags: 'Ciencia ficcion',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 4,
    type: 'series',
    title: 'Serie pausada',
    status: 'pausado',
    rating: 0,
    tags: 'Etiqueta extremadamente larga para grafico',
    createdAt: '2025-12-01T00:00:00.000Z',
  },
]

const filters: MediaFilterState = {
  tab: 'all',
  filter: 'all',
  search: '',
  filterTag: '',
  sortBy: 'recent',
}

describe('utilidades de peliculas y series', () => {
  it('crea formularios y etiquetas de tipo', () => {
    expect(createMediaForm()).toMatchObject({ type: 'movie', title: '', status: 'quiero_ver' })
    expect(createMediaForm('series').type).toBe('series')
    expect(getMediaTypeLabel('movie')).toContain('Pel')
    expect(getMediaTypeLabel('series')).toBe('Serie')
  })

  it('separa y recopila etiquetas sin duplicados', () => {
    expect(splitMediaTags('Drama, Comedia,')).toEqual(['Drama', 'Comedia'])
    expect(splitMediaTags()).toEqual([])
    expect(collectMediaTags(items)).toEqual([
      'Ciencia ficcion',
      'Comedia',
      'Drama',
      'Etiqueta extremadamente larga para grafico',
    ])
  })

  it('filtra por tipo, estado, texto y etiqueta', () => {
    expect(filterMediaItems(items, { ...filters, tab: 'movie' })).toHaveLength(2)
    expect(filterMediaItems(items, { ...filters, filter: 'viendo' }).map(item => item.id)).toEqual([2])
    expect(filterMediaItems(items, { ...filters, search: 'dUnE' }).map(item => item.id)).toEqual([3])
    expect(filterMediaItems(items, { ...filters, filterTag: 'drama' })).toHaveLength(2)
  })

  it('ordena por fecha, titulo y valoracion', () => {
    expect(filterMediaItems(items, filters).map(item => item.id)).toEqual([2, 3, 1, 4])
    expect(filterMediaItems(items, { ...filters, sortBy: 'title' }).map(item => item.id)).toEqual([3, 1, 4, 2])
    expect(filterMediaItems(items, { ...filters, sortBy: 'rating' }).map(item => item.id)).toEqual([1, 2, 3, 4])
  })

  it('calcula estadisticas y datos para graficos', () => {
    expect(buildMediaStats(items)).toEqual({
      finished: 1,
      watching: 1,
      wantToWatch: 1,
      avgRating: '4.5',
      total: 4,
    })
    expect(buildMediaStats([]).avgRating).not.toBe('0')

    expect(buildStatusChartData(items, '#abcdef')).toEqual([
      { name: 'Quiero ver', value: 1, color: '#38bdf8' },
      { name: 'Viendo', value: 1, color: '#22c55e' },
      { name: 'Terminado', value: 1, color: '#abcdef' },
      { name: 'Pausado', value: 1, color: 'rgba(255,255,255,0.18)' },
    ])
    expect(buildStatusChartData([], '#abcdef')).toEqual([])
    expect(buildTypeChartData(items, '#abcdef').map(item => item.value)).toEqual([2, 2])
    expect(buildTypeChartData([], '#abcdef')).toEqual([])
    const tagData = buildTagChartData(items)
    expect(tagData).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Drama', count: 2 }),
      expect.objectContaining({ name: 'Ciencia ficcion', count: 2 }),
    ]))
    expect(tagData.every(item => item.name.length <= 21)).toBe(true)
    expect(buildRatingChartData(items).map(item => item.count)).toEqual([0, 0, 0, 1, 1])
  })
})
