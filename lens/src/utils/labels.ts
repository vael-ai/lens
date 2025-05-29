/**
 * Converts a camel-cased UserConfig key into a human-readable label.
 * Example: `collectTabActivity` → `Tab Activity`.
 */
export const getSettingLabel = (key: string): string => {
  const words = key.replace(/([A-Z])/g, " $1").split(" ")
  // Special handling for DeviceInfo
  if (key === "collectDeviceInfo") return "Device Information"

  return words
    .filter((word) => word.toLowerCase() !== "collect")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
