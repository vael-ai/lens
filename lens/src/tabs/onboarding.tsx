import React, { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import {
  API_BASE_URL_DEVELOPMENT,
  API_BASE_URL_PRODUCTION,
  ONBOARDING_COMPLETE_KEY,
  USER_EMAIL_KEY
} from "../utils/constants"

const storage = new Storage({ area: "local" })

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? API_BASE_URL_PRODUCTION
    : API_BASE_URL_DEVELOPMENT

const OnboardingPage = () => {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    // Check if already onboarded, maybe redirect or show different message
    const checkOnboardingStatus = async () => {
      const completed = await storage.get(ONBOARDING_COMPLETE_KEY)
      if (completed) {
        // Optionally, redirect to popup or close tab if already onboarded
        // For now, we'll allow re-submission but ideally, UI would change
        console.log("User already onboarded.")
      }
    }
    checkOnboardingStatus()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSuccess(false)

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/save-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      })

      // Explicitly check for 200 status code
      if (response.status !== 200) {
        const errorData = await response.json().catch(() => ({
          message: `Failed to save email. Server returned status ${response.status}. Please try again.`
        }))
        throw new Error(
          errorData.message ||
            `Failed to save email. Server returned status ${response.status}.`
        )
      }

      // Only set onboarding complete if we received a 200 status code
      await storage.set(USER_EMAIL_KEY, email)
      await storage.set(ONBOARDING_COMPLETE_KEY, true)

      setIsSuccess(true)
      setEmail("") // Clear email field on success
      // Optionally, close the tab or redirect
      // setTimeout(() => chrome.tabs.getCurrent(tab => tab && chrome.tabs.remove(tab.id)), 2000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unknown error occurred.")
      }
      console.error("Onboarding error:", err)

      // Ensure ONBOARDING_COMPLETE_KEY is not set to true in case of any error
      await storage.set(ONBOARDING_COMPLETE_KEY, false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to Vael Lens!</h1>
      <p style={styles.subtitle}>
        Please enter your email to get started and receive updates.
      </p>

      {isSuccess && (
        <p style={styles.successMessage}>
          Thank you! Your email has been saved. You can now close this page.
        </p>
      )}
      {error && <p style={styles.errorMessage}>{error}</p>}

      {!isSuccess && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={styles.input}
            disabled={isLoading}
          />
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Email"}
          </button>
        </form>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    backgroundColor: "#f4f7f6"
  },
  title: {
    color: "#333",
    marginBottom: "10px"
  },
  subtitle: {
    color: "#555",
    marginBottom: "30px",
    textAlign: "center"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "400px"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "16px"
  },
  button: {
    padding: "12px 25px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background-color 0.3s ease"
  },
  errorMessage: {
    color: "red",
    marginBottom: "15px"
  },
  successMessage: {
    color: "green",
    marginBottom: "15px"
  }
}

export default OnboardingPage
