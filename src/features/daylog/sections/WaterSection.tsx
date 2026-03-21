import { Card } from '@/components/ui/Card'
import { WaterTracker } from '@/features/water/WaterTracker'
import type * as T from '@/data/types'

interface Props {
  entry: T.DailyEntry
  isHorizontal: boolean
  onUpdate: (patch: Partial<T.DailyEntry>) => void
}

export function WaterSection({ entry, isHorizontal, onUpdate }: Props) {
  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <WaterTracker waterMl={entry.waterMl ?? 0} onChange={ml => onUpdate({ waterMl: ml })} isHorizontal={isHorizontal} />
    </Card>
  )
}
