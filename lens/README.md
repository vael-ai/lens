# 🔍 lens Browser Extension

Privacy-first browser extension that collects browsing behavior data locally for analysis on the lens platform.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build for production
pnpm build

# Package for Chrome Web Store
pnpm package
```

## 🛠️ Tech Stack

- **Framework**: [Plasmo](https://docs.plasmo.com/) - Modern browser extension framework
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Radix UI components
- **Storage**: Chrome Storage API
- **Build**: Parcel (via Plasmo)

## 📁 Project Structure

```
src/
├── components/          # React components
│   └── ui/             # Reusable UI components
├── tabs/               # Extension popup and pages
├── config/             # Configuration files
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
    └── collectors/     # Data collection utilities
```

## 🔧 Development

### Environment Setup

Create `.env.local`:

```bash
# API Configuration
PLASMO_PUBLIC_USE_LOCAL_API=true # true for local API URL, false for production API URL (lens.vael.ai)
```

### Available Scripts

```bash
pnpm dev          # Start development mode with hot reload
pnpm build        # Build production version
pnpm package      # Create distributable package
```

### Extension Architecture

- **Background Script**: Handles cross-tab data aggregation
- **Content Scripts**: Collect interaction data from web pages
- **Popup**: User interface for settings and status
- **Options Page**: Detailed configuration interface

## 🔒 Privacy Features

- **Local Storage**: All data stored locally until user initiates report
- **Smart Filtering**: Excludes sensitive domains (banking, etc.)
- **User Control**: Master toggle and granular privacy controls
- **No Tracking**: Zero external analytics or tracking

## 📊 Data Collection

The extension collects:

- **Website Metadata**: Domain, page titles, categories
- **Interaction Patterns**: Clicks, scrolls, navigation
- **Session Data**: Time spent, tab management
- **Engagement Metrics**: Focus time, scroll depth

All data collection respects user privacy settings and browser permissions.

## 🔗 API Integration

Communicates with lens-view platform:

- **Report Generation**: Send data for AI analysis
- **Authentication**: Secure user identification
- **Progress Updates**: Real-time processing status

## 🧩 Key Components

- **DataCollector**: Core data aggregation logic
- **PrivacyManager**: User consent and filtering
- **StorageManager**: Chrome storage abstraction
- **APIClient**: Platform communication layer

## 🛡️ Permissions

Required Chrome permissions:

- `storage` - Local data persistence
- `activeTab` - Current tab access for data collection
- `tabs` - Tab management tracking
- `host_permissions` - Website interaction monitoring

## 🚀 Deployment

### Development Build

```bash
pnpm build
# Load unpacked extension from build/ directory
```

### Production Release

```bash
pnpm package
# Upload .zip file to Chrome Web Store
```

## 🤝 Contributing

1. Follow React/TypeScript best practices
2. Use Tailwind for styling
3. Maintain privacy-first principles
4. Test across multiple browsers
5. Update type definitions as needed

## 📚 Resources

- [Plasmo Documentation](https://docs.plasmo.com/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Part of the [lens platform](../README.md) - Built by [Vael AI](https://vael.ai)**
