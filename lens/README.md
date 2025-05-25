# Lens by Vael - Browser Extension

A secure browser extension that collects and organizes browsing data to provide context for AI agents. Built with modern web technologies and privacy-first principles.

## 🔒 Privacy & Security

- **Local Storage Only**: All data is stored locally in the browser - nothing leaves your device without your explicit consent
- **Complete User Control**: Users have full control over what data is collected with granular toggles
- **Master Kill Switch**: Enable/disable all data collection with one click
- **Domain Blacklisting**: Exclude specific websites from data collection entirely
- **Data Ownership**: Export or delete all collected data at any time
- **No Third-Party Tracking**: The extension doesn't use analytics or tracking services
- **Open Source**: Fully inspectable code for transparency and security auditing

## 🚀 Tech Stack

- **Framework**: [Plasmo](https://plasmo.com/) - Modern browser extension framework
- **Frontend**: React 18 + TypeScript
- **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives with custom styling (used shadcn/ui)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with animations
- **Icons**: [Lucide React](https://lucide.dev/)
- **Storage**: Plasmo Storage API (Chrome extension storage)
- **Package Manager**: pnpm
- **Code Quality**: Prettier, TypeScript strict mode

## 📋 Features

### Core Data Collection

- **Browsing History**: Tracks website visits, time spent, and navigation patterns
- **Page Metadata**: Collects page titles, descriptions, and structured data
- **User Interactions**: Monitors clicks, scrolls, form inputs, and other user actions
- **Tab Activity**: Records focus time, tab switches, and multitasking behavior
- **Content Analysis**: Extracts and analyzes page content for context
- **Device Information**: Collects basic device and browser information
- **Domain Classification**: Automatically categorizes websites (shopping, productivity, news, etc.)

### Privacy & Control

- **Master Toggle**: Enable/disable all data collection with one click
- **Domain Blacklist**: Exclude specific websites from data collection
- **Granular Controls**: Toggle individual data collection types
- **Local Storage**: All data stored locally in browser storage
- **Data Export**: Export collected data in JSON format
- **Data Clearing**: Clear all collected data when needed

### User Interface

- **Popup Interface**: Quick access to settings and current site status
- **Options Page**: Comprehensive settings and data management
- **Onboarding Flow**: Guided setup for new users
- **Real-time Status**: Visual indicators for collection status
- **Data Visualization**: View collected data in organized format

### Analytics & Reporting

- **Usage Analytics**: Track extension usage patterns
- **Data Reports**: Generate comprehensive browsing reports
- **Email Integration**: Save user email for report delivery
- **Report Status**: Track report generation progress

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- Chrome/Chromium browser for testing

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd lens

# Install dependencies
pnpm install
```

### Development Commands

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Package extension for distribution
pnpm package
```

### Environment Variables

Create a `.env.local` file in the root directory to configure the extension:

```bash
# Local API Configuration
PLASMO_PUBLIC_USE_LOCAL_API=true
```

**Environment Variables:**

- `PLASMO_PUBLIC_USE_LOCAL_API`: Controls API endpoint selection
  - `"true"`: Uses local API server at `http://localhost:3000`
  - `"false"` or unset: Uses production API at `https://lens.vael.ai`

### Loading the Extension

1. Copy `.env.example` to `.env.local` and configure as needed
2. Run `pnpm dev` to start development server
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `build/chrome-mv3-dev` directory
6. The extension will appear in your browser toolbar

## 📁 Project Structure

```
lens/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components (Radix + Tailwind)
│   │   ├── Header.tsx      # Extension header component
│   │   ├── MasterToggle.tsx # Main collection toggle
│   │   └── ErrorBoundary.tsx # Error handling component
│   ├── config/             # Configuration files
│   │   └── limits.ts       # Character limits for data fields
│   ├── lib/                # Utility libraries
│   │   └── utils.ts        # Tailwind utility functions
│   ├── tabs/               # Extension tab pages
│   │   └── onboarding.tsx  # User onboarding flow
│   ├── types/              # TypeScript type definitions
│   │   ├── data.ts         # Data collection types
│   │   └── json.d.ts       # JSON module declarations
│   ├── utils/              # Utility functions
│   │   ├── collectors/     # Data collection modules
│   │   ├── api.ts          # API communication
│   │   ├── constants.ts    # App constants
│   │   ├── dataCollection.ts # Core data collection logic
│   │   ├── domainClassifier.ts # Website classification
│   │   ├── domUtils.ts     # DOM manipulation utilities
│   │   ├── helpers.ts      # General helper functions
│   │   ├── labels.ts       # UI labels and text
│   │   ├── messaging.ts    # Extension messaging
│   │   └── userPreferences.ts # User settings management
│   ├── background.ts       # Service worker script
│   ├── content.tsx         # Content script (injected into pages)
│   ├── popup.tsx          # Extension popup interface
│   ├── options.tsx        # Extension options page
│   └── main.css           # Global styles
├── assets/                # Static assets
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🔧 Configuration

The extension uses Chrome's storage API for configuration. Key settings include:

- **Master Collection Toggle**: Enable/disable all data collection
- **Individual Collectors**: Toggle specific data collection types
- **Blacklisted Domains**: List of domains to exclude from collection
- **User Email**: For report delivery (optional)
- **Analytics Preferences**: Control usage analytics

## 🚀 Building for Production

```bash
# Build optimized version
pnpm build

# Package for Chrome Web Store
pnpm package
```

The packaged extension will be available in the `build/` directory.

## 📊 Data Format

Collected data is structured in JSON format with the following main categories:

- **Website Data**: Visit counts, time spent, metadata
- **Interactions**: User actions and engagement patterns
- **Tab Activity**: Focus time and multitasking behavior
- **Domain Classification**: Automated website categorization
- **Device Info**: Browser and system information (if enabled)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## 📄 License

[License information to be added]

## 🆘 Support

For issues, questions, or feature requests, please [create an issue](https://github.com/vael-ai/lens/issues) in the repository.
