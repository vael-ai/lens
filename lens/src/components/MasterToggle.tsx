import { Switch } from "@/components/ui/switch"
import React from "react"

/**
 * Master toggle that (in the future) will enable / disable data collection.
 * Currently rendered disabled because global on/off is not implemented.
 */
interface MasterToggleProps {
  enabled: boolean
  // We can later pass an onChange callback when the feature is ready.
}

const MasterToggle: React.FC<MasterToggleProps> = ({ enabled }) => {
  return (
    <div className="flex items-center justify-between p-3 mb-2 -mx-4 -mt-2 bg-slate-50 dark:bg-slate-800 rounded-t-lg border-b dark:border-slate-700">
      <label
        htmlFor="masterToggle"
        className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Master Data Collection
      </label>
      <Switch
        id="masterToggle"
        checked={enabled}
        className={
          "data-[state=checked]:bg-[#938EEA] data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-600"
        }
        style={{ backgroundColor: "#938EEA" }}
        disabled
      />
    </div>
  )
}

export default MasterToggle
