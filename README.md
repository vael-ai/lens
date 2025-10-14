# 🔍 lens - Privacy-First Browsing Intelligence


Officially Recognized by Martin (YC '23) and incorporated as interns. 

**[lens](https://lens.vael.ai)** is a privacy-first browsing intelligence platform that transforms your browsing behavior into meaningful insights. Built with a secure browser extension and web analytics platform, lens empowers users with deep understanding of their digital habits while maintaining complete data ownership.

**Made by [Vael AI](https://vael.ai)**

## 🌟 Key Features

-   **🔒 Privacy-First**: Local storage, end-to-end encryption, complete data ownership
-   **🧠 AI-Powered Insights**: Advanced pattern recognition using Gemini AI
-   **📊 Smart Analytics**: Automatic categorization, persona detection, behavioral insights
-   **🔐 Open Source**: Fully transparent codebase for privacy verification
-   **🏠 Self-Hostable**: Deploy on your own infrastructure

## 🏗️ Architecture

**Monorepo Structure:**

```
lens/
├── 📁 lens/           # Browser Extension (Plasmo + React)
│   └── Privacy-first data collection & local storage
│
├── 📁 lens-view/      # Web Platform (Next.js + MongoDB)
│   └── AI processing, visualization & reports
```

**Tech Stack:**

-   **Extension**: Plasmo, React 18, TypeScript, Tailwind CSS
-   **Platform**: Next.js 15, React 19, MongoDB, Gemini AI
-   **UI**: Radix UI, Recharts, responsive design

**Data Schema**: Complete data structure defined in [`lens/src/types/data.ts`](./lens/src/types/data.ts)

## 🚀 Quick Start

### Development Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd lens
pnpm install

# Start extension development (in one terminal)
cd lens
pnpm dev

# Start web platform development (in another terminal)
cd lens-view
pnpm dev

# Build both projects for production
cd lens && pnpm build
cd lens-view && pnpm build
```

### Environment Setup

**Extension** (`.env.local` in `/lens`):

```bash
# API Configuration
PLASMO_PUBLIC_USE_LOCAL_API=true # true for local API URL, false for production API URL (lens.vael.ai)
```

**Web Platform** (`.env.local` in `/lens-view`):

```bash
# MongoDB Connection String
# Get this from your MongoDB dashboard
MONGODB_URI=your_mongodb_atlas_key_here

# Google Gemini API Key
# Get this from Google AI Studio: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# JWT Secret for internal authentication
INTERNAL_JWT_SECRET="your_very_secure_jwt_secret_key_here_at_least_32_chars" # at least 32 characters

# Development Configuration
USE_LOCAL_API=true # When this is set, the API will always generate new reports regardless of data similarity or size differences (tells app you are running locally)
```

## 🔒 Privacy & Security

-   **Local-First**: Extension stores data locally until you generate reports
-   **End-to-End Encryption**: All data transmission is encrypted
-   **Data Ownership**: Full control - export or delete anytime
-   **Minimal Collection**: Only collects what's necessary
-   **Transparent**: Open source for complete auditability

## 🛡️ How It Works

1. **Collection**: Browser extension monitors browsing (locally stored)
2. **Processing**: Secure transmission to AI for analysis
3. **Insights**: Generate behavioral patterns and recommendations
4. **Visualization**: Interactive charts and personalized insights

## 🤝 Contributing

We welcome contributions! Each project has its own setup:

-   **Extension Development**: See [`/lens/README.md`](./lens/README.md)
-   **Platform Development**: See [`/lens-view/README.md`](./lens-view/README.md)

1. Fork the repository
2. Choose your focus area (extension or platform)
3. Follow the project-specific setup guides
4. Submit PRs with clear descriptions

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🔗 Links

-   **🌐 Platform**: [lens.vael.ai](https://lens.vael.ai)
-   **🏢 Company**: [vael.ai](https://vael.ai)
-   **📧 Contact**: [hello@vael.ai](mailto:hello@vael.ai)

---

**Built with ❤️ by [Vael AI](https://vael.ai)**



