import { Switch } from "@/components/ui/switch"
import React from "react"

/**
 * Master toggle that (in the future) will enable / disable data collection.
 * Currently rendered disabled because global on/off is not implemented.
 */
type MasterToggleProps = {
  enabled: boolean
  onToggle: () => void
}

/**
 * A master toggle component for the Lens by Vael AI extension.
 * Controls the overall data collection functionality.
 * When disabled, it visually indicates that all settings are disabled.
 */
const MasterToggle: React.FC<MasterToggleProps> = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center justify-between p-3 mb-2 -mx-4 -mt-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-purple-900/20 rounded-t-lg border-b border-purple-100 dark:border-purple-900/30 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${enabled ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
        />
        <div>
          <label
            htmlFor="masterToggle"
            className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Master Data Collection
          </label>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {enabled
              ? "Collecting data according to settings"
              : "All data collection paused"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!enabled && (
          <span className="text-[10px] text-red-500 dark:text-red-400 font-medium animate-pulse">
            OFF
          </span>
        )}
        <Switch
          id="masterToggle"
          checked={enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-red-400 dark:data-[state=unchecked]:bg-red-500 transition-colors duration-200 shadow-md"
        />
      </div>
    </div>
  )
}

export default MasterToggle
