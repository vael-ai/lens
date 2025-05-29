# 🌐 lens Web Platform

AI-powered web platform for processing browsing data and generating behavioral insights. Built with Next.js 15 and Gemini AI.

## 🚀 Quick Start

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

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19 with concurrent features
- **Database**: MongoDB with connection pooling
- **AI**: Google Gemini 2.5 Flash Preview
- **Styling**: Tailwind CSS + Radix UI
- **Charts**: Recharts for data visualization
- **Auth**: JWT-based internal authentication

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── submit-data/   # Data submission endpoint
│   │   ├── internal/      # Internal processing
│   │   └── reports/       # Report management
│   └── reports/           # Report pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── providers/        # Context providers
├── config/               # Configuration files
├── lib/                  # Utility libraries
│   └── mongo/           # MongoDB connection
└── styles/              # Global styles
```

## ⚙️ Environment Setup

Create `.env.local`:

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
NODE_ENV=development
```

## 🔧 Development

### Available Scripts

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # ESLint checking
```

### AI Configuration

Get your Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create/select a project
3. Generate API key
4. Add to `.env.local`

### Database Schema

For detailed data structure and types, see the [data schema definition](../lens/src/types/data.ts).

## 🏗️ Architecture

### API Routes

- **`/api/submit-data`** - Accepts browsing data from extension
- **`/api/internal/process-report`** - Background AI processing
- **`/api/reports/[reportId]`** - Report retrieval
- **`/api/reports/[reportId]/status`** - Processing status

### AI Processing Pipeline

1. **Data Validation** - Size limits, rate limiting, similarity checks
2. **AI Analysis** - Gemini processes browsing patterns
3. **Insight Generation** - Behavioral patterns, categorization, personas
4. **Visualization** - Chart data and interactive reports
5. **Comparison** - Historical behavior evolution (if previous reports exist)

### Database Schema

```javascript
// Reports Collection
{
  reportId: UUID,
  email: String,
  status: "processing" | "completed" | "failed",
  userData: Object,          // Original browsing data
  report: Object,           // AI-generated insights
  comparisonInsights: Object, // Historical comparison
  createdAt: Date,
  completedAt: Date
}

// Emails Collection
{
  email: String,
  generated_reports: Number,
  registeredAt: Date
}
```

## 🤖 AI Features

### Gemini Integration

- **Model**: `gemini-2.5-flash-preview-05-20`
- **Token Optimization**: Dynamic prompt sizing based on data
- **Schema Validation**: Zod schemas ensure consistent output
- **Fallback Processing**: Post-AI data cleaning and validation

### Analysis Capabilities

- **Behavioral Patterns**: Session habits, multitasking, focus patterns
- **Website Categorization**: AI-powered domain classification
- **Persona Detection**: User type identification
- **Shopping Insights**: E-commerce behavior analysis
- **Travel Insights**: Travel research and booking patterns
- **Productivity Analysis**: Work-related browsing optimization

## 📊 Data Visualization

### Chart Components

- **Focus Time by Domain** - Bar chart of website engagement
- **Visit Count by Category** - Pie chart of browsing categories
- **Session Activity** - Line chart of daily activity patterns
- **Interaction Types** - Bar chart of user interaction patterns
- **Scroll Depth** - Time-series scroll behavior

### Interactive Features

- **Citation Links** - Data source transparency
- **Responsive Design** - Mobile-optimized charts
- **Custom Tooltips** - Enhanced data details
- **Progressive Loading** - Real-time processing updates

## 🔒 Security & Privacy

### Rate Limiting

- **Per Email**: 10 reports/day, 25 reports/week
- **Per IP**: 20 reports/hour, 50 reports/day
- **Global**: 100 reports/minute, 1000 reports/hour

### Data Protection

- **JWT Authentication** - Internal API security
- **Data Encryption** - In-transit encryption
- **Auto Cleanup** - Temporary processing data removal
- **User Control** - Complete data deletion capabilities

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables (Production)

```bash
MONGODB_URI=mongodb+srv://...
GOOGLE_GENERATIVE_AI_API_KEY=...
INTERNAL_JWT_SECRET=...
USE_LOCAL_API=false
```

### Database Indexing

```javascript
// Recommended MongoDB indexes
db.reports.createIndex({ reportId: 1 });
db.reports.createIndex({ email: 1, createdAt: -1 });
db.reports.createIndex({ status: 1, createdAt: 1 });
db.emails.createIndex({ email: 1 });
```

## 🧪 Testing

```bash
# Run type checking
pnpm type-check

# Check for linting issues
pnpm lint

# Test API endpoints locally
curl -X POST http://localhost:3000/api/submit-data \
  -H "Content-Type: application/json" \
  -d '{"reportId":"test-uuid","email":"test@example.com","userData":{}}'
```

## 🤝 Contributing

1. Follow Next.js App Router patterns
2. Use TypeScript for all new code
3. Implement proper error handling
4. Add Zod schemas for data validation
5. Test AI prompts thoroughly
6. Maintain responsive design principles

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Google AI SDK](https://github.com/google/generative-ai-js)
- [MongoDB Node.js Driver](https://docs.mongodb.com/drivers/node/)
- [Recharts Documentation](https://recharts.org/)
- [Vercel Deployment](https://vercel.com/docs)

---

**Part of the [lens platform](../README.md) - Built by [Vael AI](https://vael.ai)**
