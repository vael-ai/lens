# 🔍 lens Browser Extension - Privacy-First Data Collection

**lens** is a secure, privacy-first browser extension that collects browsing data locally and enables AI-powered insights when users choose to generate reports. Built with the Plasmo framework and modern web technologies.

**Made by [Vael](https://vael.ai)**

## 🔒 Privacy Design

- **🏠 Local Storage Only**: All data stored locally in your browser until you choose to generate reports
- **🛡️ Master Kill Switch**: Enable/disable all data collection with one click
- **🎯 Granular Controls**: Toggle individual data collection types independently
- **🚫 Domain Blacklisting**: Exclude specific websites from data collection entirely
- **💾 Data Ownership**: Export or delete all collected data at any time
- **🔓 Open Source**: Fully inspectable code for transparency and security auditing

## Data Collection Limits

To ensure optimal performance and prevent token limits:

- **Maximum Collection Size**: 500KB (512,000 bytes)
- **Minimum Report Size**: 20KB (20,480 bytes)
- **Maximum Domain Size**: 50KB (51,200 bytes)
- **Warning Threshold**: 400KB (409,600 bytes)

These limits ensure that:

- Data collection doesn't consume excessive storage
- AI processing stays within token limits
- Report generation is fast and reliable
- Full data transparency is maintained

## Privacy & Security

- **Strict Blacklist Enforcement**: Blacklisted domains are completely excluded from data collection
- **Sensitive Domain Protection**: Automatically blocks banking, government, and medical sites
- **Local Storage Only**: Data never leaves your device unless you generate a report
- **Transparent Citations**: Every insight in reports shows exactly what data was used

---

## 🛠️ Tech Stack

- **[Plasmo](https://plasmo.com/)** - Modern browser extension framework with hot reload
- **[React 18](https://react.dev/)** - Component-based UI with hooks and suspense
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development throughout
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling with custom design system
- **[Radix UI](https://www.radix-ui.com/)** - Accessible, unstyled component primitives
- **[Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)** - Secure local data management

---

## 📁 Project Structure

```
lens/
├── 📁 src/
│   ├── 📁 components/ui/         # Reusable UI components (Radix + Tailwind)
│   ├── 📁 config/               # Configuration (character limits, etc.)
│   ├── 📁 lib/                  # Utility libraries
│   ├── 📁 tabs/                 # Extension pages (onboarding, etc.)
│   ├── 📁 types/                # TypeScript definitions
│   ├── 📁 utils/                # Core utilities
│   │   ├── 📁 collectors/       # Data collection modules
│   │   ├── 📄 api.ts            # API communication
│   │   ├── 📄 dataCollection.ts # Core collection logic
│   │   ├── 📄 domainClassifier.ts # Website classification
│   │   └── 📄 userPreferences.ts # User settings management
│   ├── 📄 background.ts         # Service worker script
│   ├── 📄 content.tsx           # Content script (injected into pages)
│   ├── 📄 popup.tsx            # Extension popup interface
│   └── 📄 options.tsx          # Extension options page
├── 📁 assets/                   # Static assets
├── ⚙️ package.json             # Dependencies and scripts
└── 📄 README.md                 # This file
```

---

## 🚀 Getting Started

### **Prerequisites**

- **Node.js 18+**
- **PNPM package manager**
- **Chrome/Chromium browser** for testing

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd lens

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### **Environment Configuration**

Create a `.env.local` file in the project root:

```env
# API Configuration - Controls which server the extension connects to
# Use local development server (default: false for production)
PLASMO_PUBLIC_USE_LOCAL_API=true
```

The `PLASMO_PUBLIC_USE_LOCAL_API` environment variable controls API endpoints:

- **`"true"`**: Extension connects to local development server (`http://localhost:3000`)
- **`"false"` or unset**: Extension connects to production API (`https://lens.vael.ai`)

### **Loading the Extension**

1. Run `pnpm dev` to start development server
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked** and select the `build/chrome-mv3-dev` directory
5. The extension icon will appear in your browser toolbar

### **Development Commands**

```bash
# Development server with hot reload
pnpm dev

# Build for production
pnpm build

# Package for Chrome Web Store
pnpm package
```

---

## ⚙️ Configuration

### **Data Collection Settings**

- **Website Metadata**: Page titles, descriptions, structured data
- **User Interactions**: Clicks, scrolls, form inputs, navigation
- **Tab Activity**: Focus time, switches, multitasking patterns
- **Content Analysis**: Text content and semantic analysis
- **Device Information**: Browser and system info (optional)

### **Privacy Controls**

- **Sensitive Domain Detection**: Automatically excludes banking, medical sites
- **Manual Domain Exclusion**: Add custom domains to blacklist
- **Data Review**: Preview collected data before report generation
- **Complete Data Deletion**: Remove all stored data permanently

---

## 📊 Data Format

Collected data is organized in structured JSON format. For the complete data structure and schema definitions, see the [data types file](src/types/data.ts).

### **Website Data Example**

```json
{
  "domain": "example.com",
  "visits": 42,
  "totalTime": 1800000,
  "metadata": {
    "title": "Page Title",
    "description": "Page description",
    "category": "productivity"
  }
}
```

### **Interaction Data Example**

```json
{
  "type": "click",
  "timestamp": 1641024000000,
  "element": "button",
  "context": "navigation"
}
```

---

## 🔧 Building for Production

```bash
# Create optimized build
pnpm build

# Package for Chrome Web Store
pnpm package
```

The packaged extension will be available in the `build/` directory, ready for Chrome Web Store submission or manual distribution.

---

## 🤝 Contributing

1. **Fork the repository** and create a feature branch
2. **Follow TypeScript best practices** and maintain type safety
3. **Use Prettier formatting** and ESLint rules
4. **Test across different websites** and scenarios
5. **Update documentation** for new features

### **Code Standards**

- **TypeScript**: Strict mode enabled, full type coverage
- **React**: Functional components with hooks
- **Privacy**: Never collect sensitive data without explicit consent
- **Performance**: Minimal impact on browser performance

---

## 🔗 Related Projects

- **[lens View Platform](../lens-view/)** - Web platform for generating AI-powered insights
- **[Main Project](../)** - Complete platform overview

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).

---

**Built with ❤️ by [Vael AI](https://vael.ai)**
