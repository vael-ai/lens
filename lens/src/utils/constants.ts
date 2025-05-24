/**
 * Centralized constants for the Vael Lens extension.
 */

// Storage Keys
export const COLLECTED_DATA_KEY = "vael_collected_data"
export const USER_EMAIL_KEY = "vael_user_email"
export const ONBOARDING_COMPLETE_KEY = "vael_onboarding_complete"
export const CURRENT_DATA_SIZE_KEY = "vael_current_data_size_bytes"
export const ACTIVE_TABS_KEY = "vael_active_tabs" // From background.ts
export const COLLECTION_STATUS_KEY = "vael_collection_status" // From background.ts
export const USER_CONFIG_KEY = "vael_user_config" // Assuming this is used by getUserConfig/updateUserConfig

// API Endpoints & URLs (Placeholders - replace with actual URLs)
export const API_BASE_URL_DEVELOPMENT = "http://localhost:3000"
export const API_BASE_URL_PRODUCTION = "https://lens.vael.ai"
export const WEB_APP_URL_DEVELOPMENT = "http://localhost:3001" // Or your Next.js app's dev URL
export const WEB_APP_URL_PRODUCTION = "https://view.lens.vael.ai" // Or your production Next.js app URL

// Alarms
export const CHECK_DATA_SIZE_ALARM_NAME = "checkDataSizeAlarm"

// Other constants
export const DATA_SIZE_THRESHOLD_MB = 10
export const DATA_SIZE_THRESHOLD_BYTES = DATA_SIZE_THRESHOLD_MB * 1024 * 1024
export const MAX_DATA_COLLECTION_MB = 150
export const MAX_DATA_COLLECTION_BYTES = MAX_DATA_COLLECTION_MB * 1024 * 1024
