# Lens View - AI-Powered Browsing Reports

The Next.js web application for generating and viewing browsing behavior reports powered by Gemini AI.

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the `lens-view` directory with:

```bash
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Google AI API
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Internal JWT Secret (minimum 32 characters)
INTERNAL_JWT_SECRET=your-super-secure-internal-jwt-secret-key-32chars-minimum
```

## Security Architecture

### JWT-Based Internal Authentication

- **Public API** (`/api/submit-data`): Accepts requests from browser extension
- **Private API** (`/api/internal/process-report`): Secured with JWT tokens
- **Server-to-Server**: JWT tokens never exposed to client-side code

### Enhanced Rate Limiting

- **Per Email**: 3 reports/day, 10 reports/week
- **Per IP**: 5 reports/hour, 15 reports/day
- **Global**: 10 reports/minute, 100 reports/hour
- **Automatic blocking** with clear error messages

## Features

### Security

- **JWT Authentication**: Server-to-server token validation
- **Multi-Layer Rate Limiting**: Email, IP, and global limits
- **Data Change Detection**: Prevents unnecessary report generation
- **Cached Reports**: Returns existing reports for similar data
- **IP Tracking**: Optional IP-based abuse protection

### Smart Report Generation

- **Data Similarity Check**: Compares new data with previous reports
- **Minimum Change Threshold**: Requires at least 10KB of new data
- **Automatic Caching**: Returns cached reports for >85% similar data
- **Progress Tracking**: Real-time progress updates with smooth animations

### Error Handling

- **Graceful Degradation**: Handles network errors and timeouts
- **User-Friendly Messages**: Clear error explanations for different scenarios
- **Rate Limit Information**: Detailed feedback on limits and retry times

## API Flow

```
Extension → Public API → JWT Generation → Internal API → AI Processing
```

1. **Extension** sends request to `/api/submit-data`
2. **Public API** validates data and checks rate limits
3. **JWT token** generated for internal authentication
4. **Internal API** (`/api/internal/process-report`) processes with AI
5. **Background processing** updates progress in real-time

## API Endpoints

### POST /api/submit-data (Public)

Accepts browsing data from browser extension.

**Required Fields:**

- `reportId`: UUID for the report
- `email`: User email address
- `userData`: Collected browsing data (10KB-1MB)

**Security:**

- Rate limiting per email and IP
- Data similarity detection
- Size validation

### POST /api/internal/process-report (Private)

Processes reports with AI analysis.

**Authentication:**

- JWT Bearer token required
- Token includes reportId, email, timestamp
- Server-to-server only

### GET /api/reports/[reportId]/status

Polls report generation progress.

### GET /api/reports/[reportId]

Retrieves completed report data.

## Rate Limits

| Scope     | Limit       | Reset      |
| --------- | ----------- | ---------- |
| Per Email | 3 reports   | Daily      |
| Per Email | 10 reports  | Weekly     |
| Per IP    | 5 reports   | Hourly     |
| Per IP    | 15 reports  | Daily      |
| Global    | 10 reports  | Per Minute |
| Global    | 100 reports | Hourly     |

## Installation

```bash
cd lens-view
pnpm install
pnpm dev
```

## Environment Variables Reference

| Variable                       | Required | Description                                        |
| ------------------------------ | -------- | -------------------------------------------------- |
| `MONGODB_URI`                  | Yes      | MongoDB connection string                          |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes      | Google AI API key for Gemini                       |
| `INTERNAL_JWT_SECRET`          | Yes      | JWT secret for internal authentication (32+ chars) |
| `NODE_ENV`                     | Auto     | Environment mode (development/production)          |

## Development vs Production

The system automatically detects the environment:

- **Development**: Internal API calls use `http://localhost:3000`
- **Production**: Internal API calls use `https://lens.vael.ai`

The extension switches based on the `PLASMO_PUBLIC_USE_LOCAL_API` environment variable.
