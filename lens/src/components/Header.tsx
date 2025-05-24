import React from "react"

import packageInfo from "../../package.json"

/**
 * Header component for the popup.
 * Shows branded extension title, version number, and a GitHub link.
 */
const Header: React.FC = () => {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center">
        {/* Lens Logo - SVG representation */}
        <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
              fill="currentColor"
            />
            <path
              d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <h1 className="flex items-center text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Lens by{" "}
          <a
            href="https://lens.vael.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity ml-1">
            Vael AI
          </a>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Version Badge */}
        <div className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          v{packageInfo.version}
        </div>

        <a
          href="https://github.com/vael-ai/lens"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
          {/* GitHub Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-github">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35.03-3.5A5.403 5.403 0 0 0 16 2.5c-1.64.7-3.28 1.2-4.96 1.2A5.403 5.403 0 0 0 4.5 2.5c-.33 1.15-.33 2.35-.03 3.5A4.22 4.22 0 0 0 3.5 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default Header
