/**
 * Types and utilities for messaging within the extension
 */

// Use the native Chrome types instead of the polyfill
type MessageSender = chrome.runtime.MessageSender

export type MessageNames =
  | "setIcon"
  | "updateConfig"
  | "refreshData"
  | "getTabId"
  | "getCollectionStatus"
  | "reportCompleted"

// Define payload types for different messages
export interface IconPayload {
  status: "disabled" | "idle" | "collecting"
}

export interface ConfigPayload {
  config: Record<string, any>
}

export interface DataPayload {
  refreshType: "full" | "partial"
}

export interface TabIdPayload {
  tabId?: number
}

export interface CollectionStatusPayload {
  activeTabs: Record<
    number,
    {
      id: number
      url: string
      domain: string
      isCollecting: boolean
      lastCollection: number
      isBlacklisted: boolean
    }
  >
  time: number
}

export interface ReportCompletedPayload {
  reportId: string
  email: string
}

// Union type for all possible payloads
export type MessagePayload =
  | IconPayload
  | ConfigPayload
  | DataPayload
  | TabIdPayload
  | CollectionStatusPayload
  | ReportCompletedPayload

/**
 * Creates a strongly typed message for extension messaging
 * @param name Name of the message
 * @param payload Data payload for the message
 * @returns Properly formatted message object
 */
export function createMessage<T extends MessagePayload>(
  name: MessageNames,
  payload: T
): { name: MessageNames; body: T } {
  return {
    name,
    body: payload
  }
}

/**
 * Type for message handler functions
 */
export type MessageHandler<T extends MessagePayload> = (
  payload: T,
  sender: MessageSender
) => void | Promise<void | any>

/**
 * Registers a handler for specific message types
 * @param messageName Name of the message to handle
 * @param handler Function to process the message
 */
export function registerMessageHandler<T extends MessagePayload>(
  messageName: MessageNames,
  handler: MessageHandler<T>
): () => void {
  const listener = (
    message: { name: string; body: any },
    sender: MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.name === messageName) {
      try {
        const result = handler(message.body as T, sender)

        // Handle promise return values
        if (result instanceof Promise) {
          // Use a timeout to prevent hanging message channels
          const timeoutId = setTimeout(() => {
            console.warn(
              `Message handler for ${messageName} timed out after 5s`
            )
            sendResponse({ error: "Handler timed out", success: false })
          }, 5000)

          // Process the promise
          result
            .then((response) => {
              clearTimeout(timeoutId)
              // Send response or a default success response
              sendResponse(
                response !== undefined ? response : { success: true }
              )
            })
            .catch((error) => {
              clearTimeout(timeoutId)
              console.error(
                `Error in message handler for ${messageName}:`,
                error
              )
              // Handle context invalidation specially
              if (
                error.message &&
                (error.message.includes("Extension context invalidated") ||
                  error.message.includes("Context invalidated"))
              ) {
                sendResponse({ error: "Context invalidated", success: false })
              } else {
                sendResponse({
                  error: error.message || "Unknown error",
                  success: false
                })
              }
            })

          return true // Indicate async response
        }

        // Handle synchronous returns
        if (result !== undefined) {
          sendResponse(result)
        }
      } catch (error) {
        console.error(`Error in message handler for ${messageName}:`, error)
        sendResponse({
          error: error.message || "Unknown error",
          success: false
        })
      }

      return true // Always return true for consistency
    }
  }

  chrome.runtime.onMessage.addListener(listener)

  // Return unsubscribe function
  return () => {
    chrome.runtime.onMessage.removeListener(listener)
  }
}

/**
 * Safely send a message to the background script with timeout and error handling
 * @param name Message name
 * @param payload Message payload
 * @param timeout Timeout in milliseconds
 * @returns Promise with the response
 */
export async function sendMessage<T extends MessagePayload, R = any>(
  name: MessageNames,
  payload: T,
  timeout = 5000
): Promise<R> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Message ${name} timed out after ${timeout}ms`))
    }, timeout)

    try {
      chrome.runtime.sendMessage({ name, body: payload }, (response) => {
        clearTimeout(timeoutId)

        // If no response, likely handled by another listener
        if (response === undefined) {
          console.info(
            `Message ${name} had no response, assuming it was handled`
          )
          resolve({ success: true } as R)
          return
        }

        // Check for error in response
        if (response && response.error) {
          console.warn(`Error in message ${name}:`, response.error)
          // For "Unknown message type" errors, this might be expected if handled by registerMessageHandler
          if (response.error === "Unknown message type") {
            console.info(
              `The "Unknown message type" error can be ignored for "${name}" if a message handler is registered`
            )
            resolve({ success: true, handled: "by_handler" } as R)
            return
          }
          reject(new Error(response.error))
          return
        }

        // Check for chrome runtime error
        if (chrome.runtime.lastError) {
          const error =
            chrome.runtime.lastError.message || "Unknown runtime error"
          console.warn(`Chrome runtime error for message ${name}:`, error)
          // If it's a context invalidation, return a fallback value instead of rejecting
          if (
            error.includes("Extension context invalidated") ||
            error.includes("Context invalidated")
          ) {
            console.warn("Context invalidated, returning fallback response")
            resolve({ error: "Context invalidated", success: false } as R)
          } else {
            reject(new Error(error))
          }
          return
        }

        resolve(response)
      })
    } catch (error) {
      clearTimeout(timeoutId)
      console.error(`Failed to send message ${name}:`, error)
      reject(error)
    }
  })
}
