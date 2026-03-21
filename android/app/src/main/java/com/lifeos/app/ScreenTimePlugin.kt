package com.lifeos.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Calendar

@CapacitorPlugin(name = "ScreenTime")
class ScreenTimePlugin : Plugin() {

    @PluginMethod
    fun checkUsageAccess(call: PluginCall) {
        val result = JSObject()
        result.put("granted", hasUsageAccess())
        call.resolve(result)
    }

    @PluginMethod
    fun openUsageAccessSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val act = activity
        if (act != null) act.startActivity(intent) else context.startActivity(intent)
        call.resolve()
    }

    /**
     * Uses queryEvents() for accurate foreground time.
     * Same methodology as Digital Wellbeing / StayFree:
     *   - Only counts apps visible in the launcher (queryIntentActivities + CATEGORY_LAUNCHER)
     *   - Excludes the default launcher itself (home screen generates foreground events)
     *   - Excludes our own app
     * Returns: { apps: [{ packageName, totalMinutes, totalMs, dateKey: "YYYY-MM-DD" }] }
     */
    @PluginMethod
    fun getUsageByApps(call: PluginCall) {
        if (!hasUsageAccess()) {
            call.reject("Usage access not granted")
            return
        }
        val fromMs = call.getLong("from") ?: run { call.reject("Missing 'from'"); return }
        val toMs = call.getLong("to") ?: run { call.reject("Missing 'to'"); return }

        // Build set of launcher-visible packages (same filter as Digital Wellbeing)
        val pm = context.packageManager
        val launcherIntent = Intent(Intent.ACTION_MAIN).also { it.addCategory(Intent.CATEGORY_LAUNCHER) }
        @Suppress("DEPRECATION")
        val launcherPkgs = (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(launcherIntent, PackageManager.ResolveInfoFlags.of(0))
        } else {
            pm.queryIntentActivities(launcherIntent, 0)
        }).map { it.activityInfo.packageName }.toMutableSet()

        // Exclude the default launcher (home screen) — it generates foreground events on every home press
        val defaultLauncher = Intent(Intent.ACTION_MAIN).also { it.addCategory(Intent.CATEGORY_HOME) }
        pm.resolveActivity(defaultLauncher, 0)?.activityInfo?.packageName?.let { launcherPkgs.remove(it) }
        // LifeOS is kept — we want to track our own usage like Digital Wellbeing does

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(fromMs, toMs)

        // pkg -> (sessionStartTs, dateKey)
        val foregroundStart = mutableMapOf<String, Pair<Long, String>>()
        // (pkg, dateKey) -> accumulated ms
        val totalTimeMs = mutableMapOf<Pair<String, String>, Long>()

        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (!launcherPkgs.contains(event.packageName)) continue
            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                    foregroundStart[event.packageName] = Pair(event.timeStamp, msToDateKey(event.timeStamp))
                }
                UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                    val startInfo = foregroundStart.remove(event.packageName)
                    if (startInfo != null) {
                        val (start, dateKey) = startInfo
                        val k = Pair(event.packageName, dateKey)
                        totalTimeMs[k] = (totalTimeMs[k] ?: 0L) + (event.timeStamp - start)
                    }
                }
            }
        }

        // Apps still in foreground at query end — count up to toMs
        foregroundStart.forEach { (pkg, startInfo) ->
            val (start, dateKey) = startInfo
            val k = Pair(pkg, dateKey)
            totalTimeMs[k] = (totalTimeMs[k] ?: 0L) + (toMs - start)
        }

        val result = JSArray()
        totalTimeMs.forEach { (key, totalMs) ->
            // No minimum threshold — every millisecond of foreground time is reported.
            // TypeScript uses totalMs for the accurate grand total and totalMinutes for display.
            val (packageName, dateKey) = key
            val obj = JSObject()
            obj.put("packageName", packageName)
            obj.put("totalMinutes", (totalMs / 60_000).toInt())
            obj.put("totalMs", totalMs)
            obj.put("dateKey", dateKey)   // "YYYY-MM-DD" in device local timezone
            result.put(obj)
        }

        val ret = JSObject()
        ret.put("apps", result)
        call.resolve(ret)
    }

    /**
     * Returns user-facing apps with correct display labels.
     * Uses queryIntentActivities(CATEGORY_LAUNCHER) which requires the <queries> manifest entry.
     * Falls back to getInstalledApplications with FLAG_SYSTEM filter if needed.
     */
    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val pm = context.packageManager
        val launcherIntent = Intent(Intent.ACTION_MAIN).also { it.addCategory(Intent.CATEGORY_LAUNCHER) }

        @Suppress("DEPRECATION")
        val resolveInfoList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(launcherIntent, PackageManager.ResolveInfoFlags.of(0))
        } else {
            pm.queryIntentActivities(launcherIntent, 0)
        }

        val result = JSArray()

        if (resolveInfoList.isNotEmpty()) {
            // Use launcher labels (most accurate display names)
            resolveInfoList.forEach { ri ->
                val obj = JSObject()
                obj.put("packageName", ri.activityInfo.packageName)
                obj.put("label", ri.loadLabel(pm).toString())
                result.put(obj)
            }
        } else {
            // Fallback: FLAG_SYSTEM filter with getApplicationLabel
            pm.getInstalledApplications(PackageManager.GET_META_DATA)
                .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
                .forEach { app ->
                    val obj = JSObject()
                    obj.put("packageName", app.packageName)
                    obj.put("label", pm.getApplicationLabel(app).toString())
                    result.put(obj)
                }
        }

        val ret = JSObject()
        ret.put("apps", result)
        call.resolve(ret)
    }

    /** Converts epoch ms → "YYYY-MM-DD" using the device's local timezone. */
    private fun msToDateKey(ms: Long): String {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        return String.format(
            "%04d-%02d-%02d",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH)
        )
    }

    private fun hasUsageAccess(): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            false
        }
    }
}
