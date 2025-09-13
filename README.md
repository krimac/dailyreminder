# Daily Reminder App

A comprehensive daily reminder and notification system with email integration, timezone support, and modern web interface.

## 🚀 Current Status: Phase 1 Complete

**Backend Foundation**: ✅ FULLY IMPLEMENTED
- Database schema with PostgreSQL
- Express.js API with full CRUD operations
- Timezone support (default UTC+2)
- Event management with recurrence patterns
- Multi-recipient notification system
- User settings and digest preferences

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate
   ```

3. **Start Server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

4. **Verify Installation**
   ```bash
   curl http://localhost:3000/health
   ```

## 🔧 Environment Configuration

Create `.env` file with:
```env
# Database Connection
DATABASE_HOST=172.17.0.1
DATABASE_PORT=5433
DATABASE_NAME=backbone_db
DATABASE_USER=karambacoding_dev
DATABASE_PASSWORD=your_password

# Application Settings
PORT=3000
NODE_ENV=development
DEFAULT_TIMEZONE=Europe/Berlin
```

## 📚 API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /` - API information and available endpoints

### Events Management
- `POST /api/events` - Create new event
- `GET /api/events` - List all events (with filters)
- `GET /api/events/upcoming` - Get upcoming events for digest
- `GET /api/events/:id` - Get event by ID (with recipients)
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event (soft delete)

### Recipients Management
- `POST /api/recipients` - Create new recipient
- `GET /api/recipients` - List all recipients (with search)
- `GET /api/recipients/:id` - Get recipient by ID
- `GET /api/recipients/email/:email` - Get recipient by email
- `PUT /api/recipients/:id` - Update recipient
- `DELETE /api/recipients/:id` - Delete recipient
- `GET /api/recipients/:id/events` - Get recipient's events
- `POST /api/recipients/:id/events` - Add recipient to event
- `DELETE /api/recipients/:id/events/:eventId` - Remove recipient from event

### User Settings
- `POST /api/settings` - Create/update user settings
- `GET /api/settings` - Get all user settings
- `GET /api/settings/timezones` - Get available timezones
- `GET /api/settings/:id` - Get settings by ID
- `GET /api/settings/email/:email` - Get settings by email
- `PUT /api/settings/:id` - Update user settings
- `DELETE /api/settings/:id` - Delete user settings
- `PUT /api/settings/email/:email/digest` - Update digest preferences

## 🗄️ Database Schema

### Core Tables
- **events**: Event details with recurrence patterns
- **recipients**: Email addresses and names
- **event_recipients**: Many-to-many event-recipient relationships
- **user_settings**: Timezone, date/time format preferences
- **digest_preferences**: Email digest configuration
- **notification_history**: Tracking sent notifications

### Event Types
- **One-off**: Single occurrence events
- **Yearly**: Annual recurring events (birthdays, anniversaries)
- **Custom Interval**: Recurring every X days/months/years

## 🌍 Timezone Support

- **Default**: Europe/Berlin (UTC+2)
- **Configurable**: Per-user timezone settings
- **Supported**: All IANA timezone identifiers
- **Features**: Automatic DST handling, localized time display

## 📊 Sample Data

The database includes sample data:
- **Events**: Team meetings, birthdays, project deadlines
- **Recipients**: admin@example.com, user1@example.com, user2@example.com
- **Settings**: UTC+2 timezone defaults, digest preferences

## 🔄 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking

## 🛠️ Development

### Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # API request handlers
├── models/          # Database models and ORM
├── routes/          # Express route definitions
├── middleware/      # Express middleware functions
└── services/        # Business logic services

migrations/          # Database migration files
scripts/            # Utility scripts
```

### Adding New Features

1. **Database Changes**: Add migrations in `migrations/`
2. **Models**: Create/update models in `src/models/`
3. **Controllers**: Add business logic in `src/controllers/`
4. **Routes**: Define API endpoints in `src/routes/`
5. **Testing**: Add tests for new functionality

## 📝 API Usage Examples

### Create Event with Recipients
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Meeting",
    "description": "Weekly sync",
    "event_date": "2024-01-15T10:00:00Z",
    "recurrence_type": "custom_interval",
    "recurrence_value": 7,
    "recurrence_unit": "days",
    "recipients": [
      {
        "email": "admin@example.com",
        "name": "Admin User",
        "notification_lead_time": 24
      }
    ]
  }'
```

### Get Upcoming Events
```bash
curl "http://localhost:3000/api/events/upcoming?days=7&timezone=Europe/Berlin"
```

### Update User Settings
```bash
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "timezone": "America/New_York",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h"
  }'
```

## 🚧 Next Development Phases

1. **Phase 2**: WebSocket real-time updates, enhanced event management
2. **Phase 3**: Gmail SMTP integration, email templates
3. **Phase 4**: React frontend with Material-UI
4. **Phase 5**: Calendar interface with drag-and-drop
5. **Phase 6**: PWA features and mobile optimization
6. **Phase 7**: Notification scheduling and digest automation
7. **Phase 8**: Advanced features and production deployment

## 📄 Documentation

- [Full Project Specification](CLAUDE.md) - Complete project scope and implementation plan
- [API Documentation] - Detailed endpoint documentation (coming soon)
- [Frontend Guide] - React application development (coming soon)

## 🤝 Contributing

1. Review the project specification in `CLAUDE.md`
2. Check implementation status before starting new features
3. Follow existing code patterns and conventions
4. Add tests for new functionality
5. Update documentation as needed