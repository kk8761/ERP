# Project Structure

## Root Directory Layout

```
NexaERP/
├── index.html              # Authentication/login page
├── dashboard.html          # Main application shell (SPA)
├── landing.html            # Marketing/landing page
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker for PWA
├── netlify.toml            # Netlify deployment config
├── vercel.json             # Vercel deployment config (alternative)
├── css/                    # Frontend stylesheets
├── js/                     # Frontend JavaScript modules
├── assets/                 # Static assets (icons, images)
├── server/                 # Backend application
├── .kiro/                  # Kiro AI configuration
├── .agents/                # Agent skills and configurations
└── scratch/                # Temporary/experimental files
```

## Frontend Structure

### HTML Pages
- `index.html` - Entry point with authentication UI
- `dashboard.html` - Main SPA container with all modules
- `landing.html` - Public-facing marketing page

### CSS Organization (`css/`)
- `design-system.css` - Design tokens, CSS variables, base components
- `auth.css` - Login/register page styles
- `dashboard.css` - Main layout, sidebar, navigation
- `modules.css` - Module-specific styles (POS, inventory, etc.)

### JavaScript Modules (`js/`)
- `utils.js` - Shared utilities (HTTP client, formatters, toast notifications)
- `auth.js` - Authentication logic and session management
- `demo-data.js` - Realistic demo datasets for testing
- `dashboard.js` - Main dashboard, router, and AI assistant
- `inventory.js` - Inventory CRUD operations
- `pos.js` - Point-of-sale billing engine
- `modules.js` - All other business modules
- `enterprise_modules.js` - Enterprise-level features
- `enterprise_plus.js` - Advanced enterprise features
- `sap_modules.js` - SAP-like ERP modules
- `three-logo.js` - 3D logo rendering (Three.js)

## Backend Structure (`server/`)

```
server/
├── src/
│   ├── server.ts           # Application entry point
│   ├── controllers/        # HTTP request handlers
│   ├── services/           # Business logic layer
│   ├── models/             # Database models (legacy Mongoose)
│   ├── routes/             # API route definitions
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   ├── views/              # Server-side templates (EJS)
│   ├── scripts/            # Database scripts, migrations
│   ├── tests/              # Test files
│   └── types/              # TypeScript type definitions
├── prisma/
│   └── schema.prisma       # Database schema (Prisma)
├── dist/                   # Compiled JavaScript output
├── uploads/                # User-uploaded files
├── public/                 # Static files served by Express
├── docs/                   # API documentation
├── examples/               # Code examples
├── ml_models/              # Machine learning models
├── backups/                # Database backups
├── node_modules/           # Dependencies
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
└── *.md                    # Implementation documentation
```

## Module Organization Pattern

Each business module follows this structure:

### Backend Module Structure
```
src/
├── controllers/
│   └── ModuleController.ts    # HTTP handlers
├── services/
│   └── ModuleService.ts       # Business logic
├── routes/
│   └── moduleRoutes.ts        # Route definitions
└── middleware/
    └── moduleAuth.ts          # Module-specific middleware
```

### Prisma Schema Organization
The `schema.prisma` file is organized into logical sections:
- User & Authentication models
- RBAC (Role-Based Access Control)
- Audit logging
- Product & Inventory
- Orders & Sales
- CRM (Leads, Opportunities, Activities)
- Warehouse Management (WMS)
- Accounting (FI/CO)
- Manufacturing
- Human Capital Management (HCM)
- Quality Management
- Project Systems
- Document Management
- Workflow & Approvals
- Business Intelligence
- Multi-tenancy

## Configuration Files

### Kiro AI (`.kiro/`)
- `steering/` - AI guidance documents
- `specs/` - Feature specifications and implementation plans
- `skills/` - Custom AI skills

### Development
- `.vscode/settings.json` - VS Code workspace settings
- `server/.eslintrc.json` - ESLint configuration
- `server/.prettierrc.json` - Prettier configuration
- `server/tsconfig.json` - TypeScript compiler options

## Key Conventions

### File Naming
- **Frontend**: kebab-case for files (`design-system.css`, `demo-data.js`)
- **Backend**: PascalCase for classes/controllers (`UserController.ts`)
- **Backend**: camelCase for utilities/services (`authService.ts`)

### Code Organization
- **Controllers**: Thin layer, delegate to services
- **Services**: Contains all business logic
- **Models**: Database schema only (Prisma) or Mongoose schemas (legacy)
- **Middleware**: Reusable request processing (auth, validation, logging)
- **Utils**: Pure functions, no side effects

### Import Paths
Backend uses absolute imports from `src/`:
```typescript
import { UserService } from './services/UserService';
import { authMiddleware } from './middleware/auth';
```

### API Routes
RESTful convention:
```
GET    /api/resource       # List all
GET    /api/resource/:id   # Get one
POST   /api/resource       # Create
PUT    /api/resource/:id   # Update
DELETE /api/resource/:id   # Delete
```

## Documentation Files

The `server/` directory contains extensive implementation documentation:
- `*_IMPLEMENTATION.md` - Module implementation guides
- `*_COMPLETION.md` - Task completion summaries
- `TASK_*.md` - Specific task documentation
- `*_GUIDE.md` - Setup and configuration guides

## Environment Variables

Required environment variables (see `server/.env.example`):
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing key
- `FRONTEND_URL` - CORS origin

## Testing Structure

Tests are organized by type:
```
server/src/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/            # End-to-end tests
```

## Build Outputs

- **Frontend**: No build output (static files served directly)
- **Backend**: `server/dist/` contains compiled JavaScript
- **Prisma**: Generated client in `node_modules/@prisma/client`
