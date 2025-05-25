# 🔍 lens by Vael - Privacy-First Browsing Intelligence Platform

![lens Platform](https://i.ibb.co/s9LhqXRZ/image.png)

**[lens](https://lens.vael.ai)** is a privacy-first browsing intelligence platform that transforms your browsing behavior into meaningful insights. Consisting of a secure browser extension and web analytics platform, lens empowers users with deep understanding of their digital habits while maintaining complete data ownership.

**Made by [Vael](https://vael.ai)**

## 🔒 Privacy & Security First

**Your data, your control:**

-   **🏠 Local-First Storage**: Extension stores all data locally until you choose to generate reports
-   **🔐 End-to-End Encryption**: All data transmission is encrypted and secure
-   **💾 Complete Data Ownership**: Full control over your information - export or delete anytime
-   **🏠 Self-Hostable**: Deploy on your own infrastructure for maximum privacy
-   **⏰ Temporary Server Processing**: Reports processed and data immediately purged
-   **🎯 Minimal Data Collection**: Only collects what's necessary for insights generation
-   **🔓 Open Source**: Fully transparent codebase - audit all privacy measures yourself

---

## 🌟 Core Features

### 🧠 **AI-Powered Intelligence**

-   **Advanced Pattern Recognition**: Gemini AI analyzes browsing patterns with massive token scaling
-   **Smart Categorization**: Automatically categorizes websites and behaviors
-   **Persona Detection**: Identifies user types (power user, researcher, casual browser, etc.)
-   **Behavioral Insights**: Discovers productivity patterns and optimization opportunities

### 📊 **Multi-Report Analytics**

-   **Concurrent Processing**: Generate multiple reports simultaneously
-   **Historical Comparison**: Compare browsing patterns across different time periods
-   **Trend Analysis**: Track behavioral changes and improvements over time
-   **Export & Sharing**: Download detailed reports or share insights securely

### 🚀 **Enterprise-Grade Scalability**

-   **Infinite Horizontal Scaling**: Serverless architecture handles any load
-   **Token Optimization**: Advanced Gemini token management for cost-effective AI processing
-   **Background Processing**: Heavy computations run asynchronously
-   **Intelligent Caching**: Smart data caching reduces API calls and improves performance

---

## 🔄 How The Platform Works

### 1. **Data Collection** (Browser Extension)

```
👤 User Browses → 🔍 Extension Monitors → 💾 Local Storage
```

-   **Silent Monitoring**: Collects browsing data without affecting performance
-   **Smart Filtering**: Automatically excludes sensitive domains (banking, private sites)
-   **User Control**: Master toggle and granular controls for all data collection
-   **Local Storage**: All data stays on device until user initiates report generation

### 2. **Secure Data Transmission**

```
💾 Local Data → 🔐 Encryption → 🌐 Secure API → 🛡️ Validation
```

-   **End-to-End Encryption**: Data encrypted before leaving browser
-   **JWT Authentication**: Secure token-based authentication
-   **Rate Limiting**: Protection against abuse and spam
-   **Data Validation**: Comprehensive sanitization and validation

### 3. **AI Processing & Analysis**

```
📊 Raw Data → 🧠 Gemini AI → 🎯 Pattern Recognition → 📈 Insights Generation
```

-   **Massive Scale Processing**: Handles large datasets with optimized token usage
-   **Multi-Model Analysis**: Uses multiple AI models for different insights
-   **Real-time Progress**: Users see analysis progress in real-time
-   **Background Processing**: Heavy computations don't block user experience

### 4. **Insight Generation & Visualization**

```
📈 AI Insights → 📊 Interactive Charts → 📱 Responsive UI → 💾 Export Options
```

-   **Dynamic Visualizations**: Interactive charts built with Recharts
-   **Mobile-Optimized**: Perfect experience across all devices
-   **Export Capabilities**: Download reports in multiple formats
-   **Sharing Controls**: Privacy-conscious sharing options

---

## 🏗️ Architecture Overview

### **Monorepo Structure**

```
lens/
├── 📁 lens/                      # Browser Extension (Plasmo)
│   ├── 🔍 Data Collection        # Privacy-first browsing data collection
│   ├── ⚙️ User Controls          # Master toggles and privacy settings
│   ├── 🛡️ Local Storage          # Secure local data management
│   └── 🌐 API Communication      # Secure data transmission
│
├── 📁 lens-view/                 # Web Platform (Next.js)
│   ├── 🧠 AI Processing          # Gemini AI integration and analysis
│   ├── 📊 Data Visualization     # Interactive charts and dashboards
│   ├── 🗄️ Database Management    # MongoDB with optimized scaling
│   └── 🔐 Authentication         # JWT-based security system
```

### **Technology Stack**

**Browser Extension (Plasmo Framework)**

-   **React 18** + TypeScript for robust UI components
-   **Tailwind CSS** with custom design system
-   **Radix UI** for accessible, unstyled primitives
-   **Chrome Storage API** for secure local data management

**Web Platform (Next.js)**

-   **Next.js 15** with App Router for optimal performance
-   **React 19** with concurrent features and Suspense
-   **MongoDB** for flexible, scalable data storage
-   **Gemini AI** for advanced pattern recognition and insights

---

## 🚀 Quick Start

### **For Users**

1. **Install Extension**: Download from Chrome Web Store (coming soon)
2. **Set Preferences**: Configure privacy settings and data collection preferences
3. **Browse Normally**: Extension collects data silently in the background
4. **Generate Reports**: Visit **[lens.vael.ai](https://lens.vael.ai)** to create insights
5. **Explore Insights**: Discover patterns and optimize your browsing habits

### **For Developers**

```bash
# Clone the repository
git clone <repository-url>
cd lens

# Install dependencies for both projects
pnpm install

# Start development servers
pnpm dev:extension  # Browser extension (localhost:1947)
pnpm dev:web       # Web platform (localhost:3000)

# Build for production
pnpm build:all
```

### **Environment Setup**

```bash
# Extension Environment (.env.local in /lens)
PLASMO_PUBLIC_USE_LOCAL_API=true  # Use local development server

# Web Platform Environment (.env.local in /lens-view)
MONGODB_URI=mongodb://localhost:27017/lens
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
INTERNAL_JWT_SECRET=your_jwt_secret_min_32_chars
USE_LOCAL_API=true  # Connect to local development server
```

### **Data Structure**

For details on the complete data structure and schema used by the extension, see the [data types definition](lens/src/types/data.ts).

---

## 🛡️ Security & Compliance

### **Data Protection**

-   **GDPR Compliant**: Full data portability and right to deletion
-   **CCPA Compliant**: Transparent data practices and user rights
-   **SOC 2 Ready**: Security controls designed for enterprise compliance

### **Privacy by Design**

-   **Data Minimization**: Collect only what's necessary for functionality
-   **Purpose Limitation**: Data used only for stated purposes
-   **Storage Limitation**: Automatic data purging after configurable periods
-   **Transparency**: Open source code allows full privacy verification

---

## 🤝 Contributing

We welcome contributions! This is a monorepo with two main projects:

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `pnpm install` (from root)
3. **Choose your focus**: Extension development (`/lens`) or web platform (`/lens-view`)
4. **Follow coding standards**: TypeScript, Prettier, ESLint
5. **Submit pull requests** with clear descriptions

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🔗 Links

-   **🌐 Platform**: [lens.vael.ai](https://lens.vael.ai)
-   **🏢 Company**: [vael.ai](https://vael.ai)
-   **📧 Contact**: [hello@vael.ai](hello:team@vael.ai)

---

**Built with ❤️ by [Vael AI](https://vael.ai)**
