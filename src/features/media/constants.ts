import {
  Check,
  Clock,
  Eye,
  Film,
  Pause,
  PieChart as PieIcon,
  Star,
  Tag,
  Tv,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SheetSelectOption } from '@/components/ui/SheetSelect'
import type { MediaItem } from '@/data/types'
import type { MediaChartTab, MediaStatusFilter, MediaTab, SortBy } from './types'

export const MEDIA_PAGE = 16

export const MEDIA_TYPE_TABS: Array<{ value: MediaTab; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'series', label: 'Series' },
  { value: 'movie', label: 'Películas' },
]

export const MEDIA_STATUS_OPTIONS: SheetSelectOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'quiero_ver', label: 'Quiero ver' },
  { value: 'viendo', label: 'Viendo' },
  { value: 'terminado', label: 'Terminado' },
  { value: 'pausado', label: 'Pausado' },
]

export const MEDIA_FORM_STATUS_OPTIONS: SheetSelectOption[] = MEDIA_STATUS_OPTIONS.filter(
  option => option.value !== 'all',
)

export const MEDIA_SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'recent', label: 'Reciente' },
  { value: 'title', label: 'A-Z' },
  { value: 'rating', label: 'Rating' },
]

export const MEDIA_QUICK_STATUS: MediaItem['status'][] = [
  'quiero_ver',
  'viendo',
  'terminado',
  'pausado',
]

export const MEDIA_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1c1c26',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  },
}

interface MediaStatusConfig {
  label: string
  className: string
  icon: LucideIcon
}

export const MEDIA_STATUS_MAP: Record<MediaItem['status'], MediaStatusConfig> = {
  quiero_ver: { label: 'Quiero ver', className: 'bg-sky-500/15 text-sky-400', icon: Eye },
  viendo: { label: 'Viendo', className: 'bg-emerald-500/15 text-emerald-400', icon: Clock },
  terminado: { label: 'Terminado', className: 'bg-accent/15 text-accent', icon: Check },
  pausado: { label: 'Pausado', className: 'bg-surface-300 text-white/30', icon: Pause },
}

export const MEDIA_CHART_TABS: Array<{
  id: MediaChartTab
  label: string
  icon: LucideIcon
}> = [
  { id: 'status', label: 'Estado', icon: PieIcon },
  { id: 'type', label: 'Tipo', icon: Film },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'ratings', label: 'Valoraciones', icon: Star },
]

export const MEDIA_TYPE_ICONS: Record<MediaItem['type'], LucideIcon> = {
  movie: Film,
  series: Tv,
}

export function isMediaStatusFilter(value: string): value is MediaStatusFilter {
  return value === 'all' || value in MEDIA_STATUS_MAP
}
