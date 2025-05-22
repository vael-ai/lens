// This file allows TypeScript to import JSON files
declare module "*.json" {
  const value: {
    name: string
    version: string
    description: string
    author: string
    [key: string]: any
  }
  export default value
}

declare module "../package.json" {
  const value: {
    name: string
    version: string
    // other specific package.json fields
  }
  export default value
}
