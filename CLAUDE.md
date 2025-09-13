# Daily Reminder App - Project Scope & Implementation Plan

## Database Connection Analysis
- **Database**: PostgreSQL (backbone_db)
- **User**: karambacoding_dev
- **Port**: 5433
- **Host**: host.docker.internal
- **Connection**: Python-based test setup available at test_db.py
- **Schema**: Project schema to be created under dailyreminder

## Project Requirements

### Core Features

#### 1. Event Management System
- **Event Types**:
  - One-off events (specific date/time)
  - Yearly recurring events (birthdays, anniversaries)
  - Custom interval events (every X days/months/years)
- **Event Storage**: PostgreSQL database with flexible scheduling
- **Event Properties**: title, description, date/time, recurrence pattern, recipients

#### 2. Multi-Recipient Notification System
- **Email Recipients**: Multiple recipients per event
- **Email Provider**: Gmail SMTP integration
- **Email Format**: Professional HTML templates with event details
- **Notification Timing**: Configurable lead time before events

#### 3. Daily Digest System
- **Digest Types**: Configurable lookout periods (7, 14, 30, 60, 90 days)
- **User Preferences**: Email-linked settings for digest frequency and scope
- **Content**: Upcoming events within selected timeframe
- **Format**: Professional HTML email with event summary
- **Timezone Support**: Configurable timezone settings (default UTC+2)

#### 4. Timezone & Time Management
- **Default Timezone**: UTC+2 for event times and notification scheduling
- **User Configuration**: Per-user timezone settings in preferences
- **Time Display**: All times shown in user's configured timezone
- **Notification Timing**: Email sending respects user's timezone preferences

### Frontend & User Experience

#### Modern Web Frontend
- **Framework**: React.js with modern hooks and state management
- **UI Library**: Material-UI or Tailwind CSS for professional styling
- **Calendar Component**: Full-featured calendar view for visual event management
- **Drag-and-Drop**: React DnD for intuitive event rescheduling
- **Real-time Updates**: WebSocket integration for live event updates
- **Responsive Design**: Mobile-first approach with breakpoint optimization

#### User Interface Features
- **Dashboard**: Clean overview of upcoming events and digest settings
- **Calendar View**: Monthly/weekly/daily views with event visualization
- **Event Management**: Intuitive forms with date/time pickers and recipient management
- **Recipient Management**: Tag-based recipient selection with autocomplete
- **Settings Panel**: User-friendly digest preference and timezone configuration
- **Notification Center**: In-app notifications and email status tracking
- **Timezone Settings**: Easy timezone selection with search and detection

#### Mobile-First Design
- **Progressive Web App (PWA)**: Offline capability and mobile notifications
- **Touch-Friendly**: Large touch targets and swipe gestures
- **Responsive Breakpoints**: Optimized for phones, tablets, and desktop
- **Mobile Navigation**: Hamburger menu and bottom navigation patterns
- **Performance**: Lazy loading and code splitting for fast mobile experience

### Technical Architecture

#### Frontend Stack
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.8.0",
  "@mui/material": "^5.11.0",
  "@mui/x-date-pickers": "^5.0.0",
  "react-big-calendar": "^1.6.0",
  "react-beautiful-dnd": "^13.1.1",
  "socket.io-client": "^4.6.0",
  "axios": "^1.3.0",
  "react-hook-form": "^7.43.0",
  "react-query": "^3.39.0"
}
```

#### Database Schema (PostgreSQL)
```sql
-- Events table
events:
  - id (UUID primary key)
  - title (VARCHAR)
  - description (TEXT)
  - event_date (TIMESTAMP)
  - recurrence_type (ENUM: one_off, yearly, custom_interval)
  - recurrence_value (INTEGER - for custom intervals)
  - recurrence_unit (ENUM: days, months, years)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - active (BOOLEAN)

-- Recipients table
recipients:
  - id (UUID primary key)
  - email (VARCHAR)
  - name (VARCHAR)
  - created_at (TIMESTAMP)

-- Event recipients junction table
event_recipients:
  - event_id (UUID FK)
  - recipient_id (UUID FK)
  - notification_lead_time (INTEGER) -- hours before event

-- User digest preferences
digest_preferences:
  - id (UUID primary key)
  - email (VARCHAR unique)
  - enabled (BOOLEAN)
  - lookout_days (INTEGER: 7,14,30,60,90)
  - frequency (ENUM: daily, weekly)
  - timezone (VARCHAR default 'Europe/Berlin') -- UTC+2
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

-- User settings
user_settings:
  - id (UUID primary key)
  - email (VARCHAR unique)
  - timezone (VARCHAR default 'Europe/Berlin') -- UTC+2
  - date_format (VARCHAR default 'DD/MM/YYYY')
  - time_format (VARCHAR default '24h')
  - language (VARCHAR default 'en')
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
```

#### Application Stack
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with migrations
- **Email**: Gmail SMTP with Nodemailer
- **Scheduling**: Node-cron for digest automation
- **Environment**: Development container setup

### Implementation Phases

#### Phase 1: Backend Foundation
1. Create database schema and migrations
2. Set up database connection pooling
3. Create data access layer (models)
4. Implement basic CRUD operations
5. Set up Express server with middleware

#### Phase 2: Core Event System
1. Event creation and management API
2. Recipient management system
3. Event-recipient relationship handling
4. Recurrence calculation logic
5. WebSocket setup for real-time updates

#### Phase 3: Email Infrastructure
1. Gmail SMTP configuration
2. Professional HTML email templates
3. Email sending service layer
4. Error handling and retry logic
5. Email status tracking

#### Phase 4: Frontend Foundation
1. Create React application structure
2. Set up routing with React Router
3. Implement responsive layout with Material-UI
4. Create reusable components and hooks
5. Set up state management and API integration

#### Phase 5: Calendar & Event Management UI
1. Integrate React Big Calendar component
2. Implement drag-and-drop functionality
3. Create event creation/editing forms
4. Add recipient management interface
5. Build dashboard with event overview

#### Phase 6: Mobile & PWA Features
1. Implement responsive design breakpoints
2. Add PWA manifest and service worker
3. Create mobile-optimized navigation
4. Add touch gestures and mobile interactions
5. Implement offline capability

#### Phase 7: Notification & Digest Systems
1. Event notification scheduler with timezone support
2. Lead time calculation and processing in user timezones
3. Daily digest automation respecting user preferences
4. User preference management UI with timezone settings
5. Notification center and status tracking

#### Phase 8: Advanced Features & Polish
1. Real-time updates via WebSockets
2. Advanced filtering and search
3. Event import/export functionality
4. Performance optimization and caching
5. Comprehensive testing and documentation

### Email Templates Required
1. **Event Notification**: Professional event reminder with details
2. **Daily Digest**: Summary of upcoming events in timeframe
3. **Event Created**: Confirmation when new events are added
4. **Digest Settings**: Confirmation of preference changes

### Security Considerations
- Gmail App Password authentication
- Environment variable protection
- Input validation and sanitization
- Email rate limiting
- Database connection security

### Dependencies to Add

#### Backend Dependencies
```json
{
  "nodemailer": "^6.9.0",
  "node-cron": "^3.0.0",
  "pg": "^8.11.0",
  "uuid": "^9.0.0",
  "joi": "^17.9.0",
  "moment": "^2.29.0",
  "moment-timezone": "^0.5.43",
  "socket.io": "^4.6.0",
  "cors": "^2.8.5",
  "helmet": "^6.0.0"
}
```

#### Frontend Dependencies (separate React app)
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.8.0",
  "@mui/material": "^5.11.0",
  "@mui/icons-material": "^5.11.0",
  "@mui/x-date-pickers": "^5.0.0",
  "react-big-calendar": "^1.6.0",
  "react-beautiful-dnd": "^13.1.1",
  "socket.io-client": "^4.6.0",
  "axios": "^1.3.0",
  "react-hook-form": "^7.43.0",
  "@tanstack/react-query": "^4.24.0",
  "date-fns": "^2.29.0",
  "date-fns-tz": "^2.0.0",
  "react-hot-toast": "^2.4.0",
  "react-timezone-select": "^1.3.0"
}
```

#### Development Dependencies
```json
{
  "@vitejs/plugin-react": "^3.1.0",
  "vite": "^4.1.0",
  "vite-plugin-pwa": "^0.14.0",
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
  "typescript": "^4.9.0"
}
```

### Environment Variables Required
```
# Gmail Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Application Settings
PORT=3000
NOTIFICATION_FROM_EMAIL=notifications@yourdomain.com
NOTIFICATION_FROM_NAME=Daily Reminder System

# Timezone Configuration
DEFAULT_TIMEZONE=Europe/Berlin
SYSTEM_TIMEZONE=UTC
```

### Project Structure
```
dailyreminder/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── models/          # Database models
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   ├── middleware/      # Express middleware
│   │   └── routes/          # API route definitions
│   ├── migrations/          # Database migrations
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-based page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API integration
│   │   ├── store/           # State management
│   │   └── utils/           # Helper functions
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js           # Service worker
│   └── package.json
└── shared/                  # Shared types and utilities
    └── types/              # TypeScript definitions
```

## Implementation Status

### ✅ COMPLETED - Phase 1: Backend Foundation
**Status: FULLY IMPLEMENTED** *(Completed: September 13, 2025)*

#### Database Schema & Migrations
- ✅ Created comprehensive PostgreSQL schema in `dailyreminder` namespace
- ✅ All tables implemented: events, recipients, event_recipients, user_settings, digest_preferences, notification_history
- ✅ Migration scripts created: `migrations/001_create_schema.sql`, `migrations/002_seed_data.sql`
- ✅ Migration runner: `scripts/migrate.js` and `npm run migrate` command

#### Database Connection & Configuration
- ✅ Connection pooling with pg module: `src/config/database.js`
- ✅ Environment configuration: Database host: `172.17.0.1:5433` (backbone_db)
- ✅ Schema initialization and connection testing
- ✅ Search path configured for `dailyreminder` schema

#### Data Access Layer (Models)
- ✅ **Event Model** (`src/models/Event.js`): Full CRUD, recurrence calculation, timezone support
- ✅ **Recipient Model** (`src/models/Recipient.js`): Email management, event associations
- ✅ **UserSettings Model** (`src/models/UserSettings.js`): Timezone preferences, digest configuration
- ✅ Model exports: `src/models/index.js`

#### Controllers & Business Logic
- ✅ **EventController** (`src/controllers/eventController.js`): Full event management with Joi validation
- ✅ **RecipientController** (`src/controllers/recipientController.js`): Recipient CRUD and event linking
- ✅ **UserSettingsController** (`src/controllers/userSettingsController.js`): Settings and digest preferences

#### Express Server & Middleware
- ✅ **Main Server** (`index.js`): Express app with health checks and error handling
- ✅ **Security**: Helmet, CORS configuration
- ✅ **Logging**: Request logger middleware (`src/middleware/requestLogger.js`)
- ✅ **Error Handling**: Global error handler (`src/middleware/errorHandler.js`)
- ✅ **Validation**: Joi validation middleware (`src/middleware/validation.js`)

#### API Routes & Endpoints
- ✅ **Event Routes** (`src/routes/eventRoutes.js`): `/api/events/*`
- ✅ **Recipient Routes** (`src/routes/recipientRoutes.js`): `/api/recipients/*`
- ✅ **User Settings Routes** (`src/routes/userSettingsRoutes.js`): `/api/settings/*`

#### Dependencies & Package Configuration
- ✅ **Backend Dependencies**: express, pg, joi, moment-timezone, cors, helmet, dotenv, uuid, nodemailer, node-cron, socket.io
- ✅ **Package Scripts**: start, dev, migrate, test, lint, format, type-check

#### Sample Data & Testing
- ✅ **Sample Events**: Team meetings, birthdays, project deadlines with recurrence
- ✅ **Sample Recipients**: admin@example.com, user1@example.com, user2@example.com
- ✅ **Sample Settings**: UTC+2 timezone defaults, digest preferences
- ✅ **API Testing**: Health check, events list, recipients list all working

#### Server Status
- ✅ **Running**: Server operational on port 3000
- ✅ **Database**: Connected to PostgreSQL with 6 tables created
- ✅ **API Endpoints**: All basic CRUD operations functional

---

### 🔄 NEXT PHASE - Phase 2: Core Event System
**Status: READY TO START**

#### WebSocket Setup for Real-time Updates
- ⏳ Socket.io server configuration
- ⏳ Real-time event creation/updates
- ⏳ Client notification system

#### Enhanced Event Management
- ⏳ Event recurrence processing service
- ⏳ Next occurrence calculation improvements
- ⏳ Bulk event operations

#### Advanced Recipient Management
- ⏳ Recipient import/export functionality
- ⏳ Group management for recipients
- ⏳ Recipient preferences per event

---

### ⏸️ PENDING PHASES

#### Phase 3: Email Infrastructure
- ⏳ Gmail SMTP configuration and testing
- ⏳ Professional HTML email templates
- ⏳ Email sending service with retry logic
- ⏳ Email status tracking and history

#### Phase 4: Frontend Foundation
- ⏳ React application setup with Vite
- ⏳ Material-UI integration and theming
- ⏳ React Router configuration
- ⏳ API integration with axios/react-query

#### Phase 5: Calendar & Event Management UI
- ⏳ React Big Calendar integration
- ⏳ Drag-and-drop event editing
- ⏳ Event creation/editing forms
- ⏳ Dashboard and event overview

#### Phase 6: Mobile & PWA Features
- ⏳ Responsive design implementation
- ⏳ PWA manifest and service worker
- ⏳ Mobile-optimized navigation
- ⏳ Offline capability

#### Phase 7: Notification & Digest Systems
- ⏳ Event notification scheduler with timezone support
- ⏳ Daily digest automation
- ⏳ User preference management UI
- ⏳ Email delivery optimization

#### Phase 8: Advanced Features & Polish
- ⏳ Advanced filtering and search
- ⏳ Event import/export
- ⏳ Performance optimization
- ⏳ Comprehensive testing
- ⏳ Production deployment setup

## Next Immediate Steps
1. **Phase 2 Start**: Implement WebSocket real-time updates
2. **Event System Enhancement**: Advanced recurrence handling
3. **Gmail Integration**: SMTP setup and email template creation
4. **Frontend Planning**: React application architecture design