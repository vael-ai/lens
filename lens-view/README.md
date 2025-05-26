# 🔍 lens View - Browsing Intelligence Analytics Platform

**lens View** is the web application companion for the [lens browser extension](../lens/), providing AI-powered analytics and insights about browsing behavior. Built with Next.js 15 and designed for scalability.

**Made by [Vael](https://vael.ai)**

## 🔒 Privacy Architecture

- **🛡️ Temporary Processing**: Data processed and immediately purged after report generation
- **🔐 End-to-End Encryption**: All data transmission is encrypted and secure
- **💾 No Permanent Storage**: Reports are automatically deleted after configurable time periods
- **🏠 Self-Hostable**: Deploy on your own infrastructure for maximum privacy
- **🔓 Open Source**: Fully transparent codebase for privacy verification

---

## 🛠️ Tech Stack

### **Core Framework**

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling

### **UI Components**

- **[shadcn/ui](https://ui.shadcn.com/)** - Modern, accessible component library
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible primitives
- **[Recharts](https://recharts.org/)** - Composable charting library
- **[Lucide React](https://lucide.dev/)** - Beautiful, consistent icons

### **Backend & Data**

- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Serverless API endpoints
- **[MongoDB](https://www.mongodb.com/)** - Document database for flexible data storage
- **[Zod](https://zod.dev/)** - Runtime type validation and schema parsing
- **[Google AI SDK](https://ai.google.dev/)** - Advanced AI capabilities for insights generation

### **Development Tools**

- **[PNPM](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[Turbopack](https://turbo.build/pack)** - Next.js bundler for faster builds and development
- **[ESLint](https://eslint.org/)** - Code linting and quality
- **[Prettier](https://prettier.io/)** - Code formatting

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
│   └── 📄 env.js                # Environment validation (T3 Stack)
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

Create a `.env.local` file with the following variables:

```env
# Specify your server-side environment variables schema here. This way you can ensure the app
# isn't built with invalid env vars.
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lens
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
INTERNAL_JWT_SECRET=your_jwt_secret

# Controls API endpoint connection for browser extension
# Set to "true" for local development, "false" or omit for production
USE_LOCAL_API=false

# Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
# useful for Docker builds.
# SKIP_ENV_VALIDATION=true
```

### API Configuration

The `USE_LOCAL_API` environment variable controls which API endpoint the browser extension connects to:

- **`"true"`**: Extension connects to local development server (`http://localhost:3000`)
- **`"false"` or unset**: Extension connects to production API (`https://lens.vael.ai`)

This enables seamless development workflow where the browser extension can work with your local lens-view development server.

### Development Commands

```bash
# Start development server with Turbopack
pnpm dev

# Build for production with Turbopack
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint
```

---

## 🏗️ Architecture

### **API Routes**

- **`/api/submit-data`**: Receives browsing data from extension for processing
- **`/api/reports/[reportId]`**: Retrieves generated reports
- **`/api/reports/[reportId]/status`**: Checks report generation status
- **`/api/save-email`**: Handles email subscription for reports
- **`/api/internal/process-report`**: Internal endpoint for AI processing

### **Database Design**

- **Document-based storage** for flexible schema evolution
- **Optimized indexing** for fast query performance
- **TTL indexes** for automatic data lifecycle management
- **Horizontal scaling** support with MongoDB sharding

### **AI Processing Pipeline**

- **Background processing** for CPU-intensive AI analysis
- **Rate limiting** to prevent abuse and ensure fair usage
- **Intelligent caching** for improved response times
- **Real-time progress tracking** for user experience

---

## 🔧 Configuration

### **MongoDB Setup**

```bash
# Local MongoDB
mongod --dbpath /path/to/data/directory

# Or use MongoDB Atlas for cloud deployment
# Update MONGODB_URI in .env.local accordingly
```

### **Google AI API**

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to your `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY`

### **Security Configuration**

- **JWT Secret**: Must be at least 32 characters for security
- **Rate Limiting**: Configured per endpoint to prevent abuse
- **CORS**: Properly configured for browser extension communication

---

## 🚀 Deployment

### **Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Set environment variables in Vercel dashboard
```

### **Docker**

```bash
# Build Docker image
docker build -t lens-view .

# Run container
docker run -p 3000:3000 lens-view
```

### **Self-Hosted**

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 🤝 Contributing

1. **Fork the repository** and create a feature branch
2. **Follow TypeScript best practices** and maintain type safety
3. **Use Prettier/ESLint** for consistent code formatting
4. **Test API endpoints** thoroughly
5. **Update documentation** for new features

### **Code Standards**

- **TypeScript**: Strict mode enabled, full type coverage
- **Next.js**: App Router with server components where possible
- **API Design**: RESTful endpoints with proper error handling
- **Security**: Follow OWASP guidelines for web applications

---

## 🔗 Related Projects

- **[lens Browser Extension](../lens/)** - The companion browser extension for data collection
- **[Main Project](../)** - Complete platform overview

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).

---

**Built with ❤️ by [Vael AI](https://vael.ai)**

## Features

- **AI-Powered Analysis**: Uses Google Gemini 2.5 Flash for intelligent data processing
- **Real-time Processing**: Live progress tracking for report generation
- **Data Transparency**: Complete citations showing exactly what data supports each insight
- **Interactive Visualizations**: Rich charts and graphs for browsing patterns
- **Comparison Analysis**: Track behavioral changes over time
- **Rate Limiting**: Intelligent throttling to prevent abuse

## Data Processing Limits

Optimized for reliable AI processing and fast report generation:

- **Maximum Data Size**: 500KB (512,000 bytes)
- **Minimum Data Size**: 20KB (20,480 bytes)
- **Maximum Website Data**: 50KB (51,200 bytes)
- **Warning Threshold**: 400KB (409,600 bytes)

## Rate Limits

- **Per Email**: 3 reports/day, 10 reports/week
- **Per IP**: 5 reports/hour, 15 reports/day
- **Global**: 10 reports/minute, 100 reports/hour

## AI Configuration

- **Model**: Google Gemini 2.5 Flash Preview
- **Max Input Tokens**: 800,000 (~500KB JSON data)
- **Max Output Tokens**: 32,000
- **Temperature**: 0.2 (deterministic outputs)
- **Full Transparency Mode**: Enabled

## API Endpoints

- `POST /api/submit-data` - Submit browsing data for analysis
- `GET /api/reports/[reportId]` - Retrieve generated reports
- `GET /api/reports/[reportId]/status` - Check processing status
- `POST /api/save-email` - Save user email for reports

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

```env
MONGODB_URI=your_mongodb_connection_string
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
INTERNAL_JWT_SECRET=your_jwt_secret
USE_LOCAL_API=false
```

## Configuration

The application uses centralized configuration in `src/config/data-limits.ts` for:

- Data size validation
- Rate limiting rules
- AI processing parameters
- Error messages

## Deployment

Optimized for Vercel deployment with:

- Edge runtime support
- MongoDB Atlas integration
- Environment-based configuration
- Automatic scaling

## License

MIT License - see LICENSE file for details.
