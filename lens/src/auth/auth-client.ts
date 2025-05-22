import { createAuthClient } from "better-auth/react"

// TODO: Use Plasmo ENV and make same as @package.json
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000" /* base url of your Better Auth backend. */,
  plugins: []
})
