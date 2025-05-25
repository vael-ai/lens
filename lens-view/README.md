# 🔍 Lens View - Browsing Intelligence Analytics Platform

**Lens View** is the companion web application for the [Lens browser extension](../lens/), providing users with detailed, privacy-first analytics and insights about their browsing behavior. Built with modern web technologies and designed for scalability, Lens View transforms raw browsing data into meaningful, actionable insights.

## 🔒 Privacy & Security First

**Your data, your control.** Lens View is built with privacy as the foundation:

- **🛡️ Zero Third-Party Tracking**: No analytics, no cookies, no external data collection
- **🔐 End-to-End Encryption**: All data transmission is encrypted and secure
- **💾 You Own Your Data**: Complete control over your information - export or delete anytime
- **🏠 Self-Hostable**: Deploy on your own infrastructure for maximum privacy
- **⏰ Temporary Storage**: Reports are automatically purged after a configurable time period
- **🎯 Minimal Data Collection**: Only collects what's necessary for insights generation
- **🔓 Open Source**: Fully transparent codebase - audit the privacy measures yourself

---

## ✨ Key Features

### 🧠 AI-Powered Insights

- **Smart Categorization**: Automatically categorizes websites and browsing patterns
- **Behavior Analysis**: Identifies productivity patterns, browsing habits, and time usage
- **Persona Detection**: Intelligently infers user types (e.g., power user, casual browser, researcher)
- **Trend Analysis**: Tracks changes in browsing behavior over time

### 📊 Rich Visualizations

- **Interactive Charts**: Dynamic charts built with Recharts for exploring data
- **Real-time Processing**: Watch your report generate in real-time with progress indicators
- **Responsive Design**: Perfect experience across all devices and screen sizes
- **Export Capabilities**: Download reports and share insights securely

### 🚀 Performance & Scalability

- **Serverless Architecture**: Built for infinite scalability with Next.js
- **Intelligent Caching**: Optimized data fetching and caching strategies
- **Rate Limiting**: Built-in protection against abuse
- **Background Processing**: Heavy computations run asynchronously
- **MongoDB Optimization**: Efficient data storage and querying

---

## 🛠️ Tech Stack

### **Frontend**

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Modern, accessible component library
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible primitives

### **Data Visualization**

- **[Recharts](https://recharts.org/)** - Composable charting library
- **[Lucide React](https://lucide.dev/)** - Beautiful, consistent icons
- **[React Icons](https://react-icons.github.io/react-icons/)** - Popular icon packs

### **Backend & APIs**

- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Serverless API endpoints
- **[MongoDB](https://www.mongodb.com/)** - Document database for flexible data storage
- **[Zod](https://zod.dev/)** - Runtime type validation and schema parsing
- **[JSON Web Tokens](https://jwt.io/)** - Secure authentication and authorization

### **AI & Analytics**

- **[Google AI SDK](https://ai.google.dev/)** - Advanced AI capabilities for insights generation
- **[Vercel AI SDK](https://sdk.vercel.ai/)** - Streamlined AI integration
- **Custom Analytics Engine** - Proprietary algorithms for browsing pattern analysis

### **Developer Experience**

- **[Turbopack](https://turbo.build/pack)** - Ultra-fast bundler for development
- **[ESLint](https://eslint.org/)** - Code linting and quality
- **[Prettier](https://prettier.io/)** - Code formatting
- **[PNPM](https://pnpm.io/)** - Fast, disk space efficient package manager

---

## ❓ How It Works

### 1. **Data Collection** (Browser Extension)

The Lens browser extension collects anonymized browsing data including:

- Website visits and time spent
- Interaction patterns (clicks, scrolls, focus)
- Tab management behavior
- Navigation patterns

### 2. **Secure Transmission**

Data is encrypted and sent to Lens View via secure API endpoints with:

- JWT-based authentication
- Rate limiting protection
- Data validation and sanitization

### 3. **AI Processing**

Advanced AI algorithms analyze the data to:

- Categorize websites and activities
- Identify productivity patterns
- Generate behavioral insights
- Create personalized recommendations

### 4. **Visualization & Insights**

Results are presented through:

- Interactive, responsive charts
- Detailed analytics dashboards
- Exportable reports
- Shareable insights (with privacy controls)

---

## 📁 Project Structure

```
lens-view/
├── 📁 src/
│   ├── 📁 app/                    # Next.js App Router
│   │   ├── 📄 page.tsx           # Landing page
│   │   ├── 📄 layout.tsx         # Root layout with metadata
│   │   ├── 📄 sitemap.ts         # SEO sitemap generation
│   │   ├── 📄 robots.ts          # SEO robots.txt
│   │   ├── 📁 api/               # API Routes
│   │   │   ├── 📁 submit-data/   # Data submission endpoint
│   │   │   ├── 📁 reports/       # Report retrieval & status
│   │   │   ├── 📁 save-email/    # Email subscription
│   │   │   └── 📁 internal/      # Internal processing APIs
│   │   └── 📁 reports/           # Report viewing pages
│   │       └── 📁 [reportId]/    # Dynamic report pages
│   ├── 📁 components/            # React Components
│   │   ├── 📁 ui/               # shadcn/ui components
│   │   ├── 📁 providers/        # Context providers
│   │   ├── 📄 lens-logo.tsx     # Brand logo component
│   │   ├── 📄 report-charts.tsx # Data visualization
│   │   └── 📄 social-share.tsx  # Social sharing
│   ├── 📁 lib/                  # Utilities & Configuration
│   │   ├── 📁 mongo/            # MongoDB connection & config
│   │   ├── 📄 auth.ts           # Authentication logic
│   │   ├── 📄 internal-jwt.ts   # JWT utilities
│   │   └── 📄 utils.ts          # Helper functions
│   ├── 📁 styles/               # Global Styles
│   │   └── 📄 globals.css       # Tailwind + custom CSS
│   └── 📄 env.js                # Environment validation
├── 📁 public/                   # Static Assets
│   ├── 🖼️ vael-logo.png         # Company logo
│   ├── 🖼️ lens-logo.svg         # Product logo
│   └── 🎯 favicon.ico           # Site favicon
├── ⚙️ tailwind.config.js        # Tailwind configuration
├── ⚙️ next.config.js            # Next.js configuration
├── ⚙️ components.json           # shadcn/ui configuration
├── 📦 package.json              # Dependencies & scripts
└── 📖 README.md                 # This file
```

---

## 📈 Scalability & Performance

### **Database Design**

- **Document-based storage** for flexible schema evolution
- **Optimized indexing** for fast query performance
- **Horizontal scaling** support with MongoDB sharding
- **Automatic data lifecycle** management with TTL indexes

### **API Architecture**

- **Serverless functions** for infinite horizontal scaling
- **Background processing** for CPU-intensive AI analysis
- **Rate limiting** to prevent abuse and ensure fair usage
- **Caching strategies** for improved response times

### **Frontend Optimization**

- **Static generation** for marketing pages
- **Dynamic rendering** for personalized content
- **Code splitting** for optimal bundle sizes
- **Image optimization** with Next.js Image component

### **Monitoring & Reliability**

- **Error tracking** and performance monitoring
- **Graceful error handling** with user-friendly messages
- **Progressive enhancement** for accessibility
- **Mobile-first responsive design**

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **PNPM package manager**
- **MongoDB database** (local or cloud)
- **Google AI API key** (for insights generation)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd lens-view

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
pnpm dev
```

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lens

# AI Services
GOOGLE_AI_API_KEY=your_google_ai_key

# Security
JWT_SECRET=your_jwt_secret

```

---

## 🤝 Contributing

We welcome contributions to make Lens View better! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code style and standards
- Development workflow
- Testing requirements
- Security considerations

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

---

## 🔗 Related Projects

- **[Lens Browser Extension](../lens/)** - The companion browser extension for data collection
- **[Vael AI](https://vael.ai)** - The company behind Lens, focused on privacy-first AI tools

---

**Built with ❤️ by [Vael AI](https://vael.ai) - Empowering users with insights while respecting privacy.**
