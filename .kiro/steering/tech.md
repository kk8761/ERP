# Technology Stack

## Frontend

- **Core**: Vanilla HTML5, CSS3, ES6+ JavaScript (no framework dependencies)
- **Design System**: Custom CSS variables with dark mode support
- **Typography**: Inter (body text), Space Grotesk (display/headings)
- **UI Pattern**: Glassmorphism with backdrop blur effects
- **PWA**: Progressive Web App capabilities with service worker (sw.js)

## Backend

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+ (strict mode enabled)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma (schema-first approach)
- **Authentication**: JWT with bcrypt password hashing
- **Session Management**: Redis with connect-redis
- **Validation**: Express Validator
- **Security**: Helmet, CORS, rate limiting

## Key Dependencies

### Backend Production
- `@prisma/client` - Database ORM
- `express` - Web framework
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `ioredis` - Redis client for caching/sessions
- `socket.io` - Real-time communication
- `multer` - File upload handling
- `nodemailer` - Email notifications
- `pdfkit` - PDF generation
- `xlsx` - Excel file handling
- `sharp` - Image processing
- `@tensorflow/tfjs-node` - ML/AI capabilities

### Development Tools
- `typescript` - Type checking
- `ts-node` - TypeScript execution
- `nodemon` - Development hot reload
- `eslint` - Code linting
- `prettier` - Code formatting
- `prisma` - Database migrations and schema management

## Build System

### Frontend
No build step required - pure static files served directly.

**Local Development:**
```bash
# Serve static files
npx serve .
# or
python -m http.server 8080
```

### Backend

**Development:**
```bash
cd server
npm install
npm run dev  # Hot reload with nodemon + ts-node
```

**Build:**
```bash
npm run build  # Compiles TypeScript to dist/
```

**Production:**
```bash
npm start  # Runs compiled JavaScript from dist/
```

**Database:**
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to database
npm run prisma:studio    # Open Prisma Studio GUI
```

**Code Quality:**
```bash
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting
npm run type-check     # TypeScript type checking
```

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Strict Mode**: Enabled
- **Source Maps**: Enabled for debugging
- **Output**: `dist/` directory
- **Root**: `src/` directory

## Deployment

### Frontend (Netlify)
- **Build Command**: None (static files)
- **Publish Directory**: `./`
- **Redirects**: SPA routing to index.html
- **Headers**: Security headers, cache control

### Backend
- **Environment**: Node.js 18+
- **Database**: PostgreSQL (connection via DATABASE_URL)
- **Redis**: Required for sessions and caching
- **Environment Variables**: See `.env.example`

## Common Commands Reference

```bash
# Frontend - No build needed, just serve
npx serve .

# Backend Development
cd server
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript
npm start                # Run production build

# Database Operations
npm run prisma:generate  # Generate Prisma Client after schema changes
npm run prisma:push      # Push schema changes to database
npm run prisma:studio    # Open database GUI

# Code Quality
npm run lint:fix         # Fix linting issues
npm run format           # Format all TypeScript files
npm run type-check       # Check types without building

# Testing (when implemented)
npm test                 # Run test suite
npm run test:watch       # Run tests in watch mode
```

## Architecture Pattern

**Monolithic MVC** with clear separation:
- **Controllers**: HTTP request/response handling
- **Services**: Business logic and data operations
- **Models**: Prisma schema definitions
- **Middleware**: Authentication, validation, error handling
- **Utils**: Shared utility functions

## API Response Format

All API endpoints follow a standardized format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detail 1", "Detail 2"]
}
```
