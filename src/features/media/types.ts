import type { MediaItem } from '@/data/types'

export type MediaView = 'list' | 'stats'
export type SortBy = 'recent' | 'title' | 'rating'
export type MediaChartTab = 'status' | 'type' | 'tags' | 'ratings'
export type MediaTab = 'all' | MediaItem['type']
export type MediaStatusFilter = 'all' | MediaItem['status']

export interface MediaFilterState {
  tab: MediaTab
  filter: MediaStatusFilter
  search: string
  filterTag: string
  sortBy: SortBy
}

export interface MediaStatsSummary {
  finished: number
  watching: number
  wantToWatch: number
  avgRating: string
  total: number
}

export interface MediaPieDatum {
  name: string
  value: number
  color: string
}

export interface MediaTagDatum {
  name: string
  count: number
}

export interface MediaRatingDatum {
  label: string
  count: number
}
