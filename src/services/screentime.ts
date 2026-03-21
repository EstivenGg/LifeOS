import { Capacitor, registerPlugin } from '@capacitor/core'

export interface UsageEntry {
  packageName: string
  totalMinutes: number
  totalMs: number       // raw milliseconds — used for accurate grand-total accumulation
  dateKey: string       // "YYYY-MM-DD" already in device local timezone
}

interface ScreenTimeNativePlugin {
  checkUsageAccess(): Promise<{ granted: boolean }>
  openUsageAccessSettings(): Promise<void>
  getUsageByApps(options: { from: number; to: number }): Promise<{ apps: UsageEntry[] }>
  getInstalledApps(): Promise<{ apps: { packageName: string; label: string }[] }>
}

const ScreenTimeNative = registerPlugin<ScreenTimeNativePlugin>('ScreenTime', {
  web: {
    async checkUsageAccess() { return { granted: false } },
    async openUsageAccessSettings() {},
    async getUsageByApps() { return { apps: [] } },
    async getInstalledApps() { return { apps: [] } },
  },
})

export const isAndroid = Capacitor.getPlatform() === 'android'

export async function checkUsageAccess(): Promise<boolean> {
  const { granted } = await ScreenTimeNative.checkUsageAccess()
  return granted
}

export async function openUsageAccessSettings(): Promise<void> {
  await ScreenTimeNative.openUsageAccessSettings()
}

export async function getUsageByApps(from: Date, to: Date): Promise<UsageEntry[]> {
  const { apps } = await ScreenTimeNative.getUsageByApps({ from: from.getTime(), to: to.getTime() })
  return apps
}

export async function getInstalledApps(): Promise<{ packageName: string; label: string }[]> {
  const { apps } = await ScreenTimeNative.getInstalledApps()
  return apps
}
