# Daily Reminder App

A comprehensive daily reminder and notification system with email integration, timezone support, and modern web interface.

## 🚀 Current Status: Phase 3 Complete

**Backend Foundation + Core Event System + Email Infrastructure**: ✅ FULLY IMPLEMENTED
- Database schema with PostgreSQL
- Express.js API with full CRUD operations
- **WebSocket real-time updates** with Socket.IO
- Advanced event management with recurrence patterns
- **Bulk operations** for events (create/update/delete)
- Multi-recipient notification system
- User settings and digest preferences
- **Enhanced recurrence processing** with timezone support
- **Gmail SMTP Integration**: Professional email delivery system
- **Email Templates**: 4 responsive HTML email templates
- **Automated Scheduling**: Cron-based notification and digest automation

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

# Gmail Configuration (Required for Email Features)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password

# Email Settings
NOTIFICATION_FROM_EMAIL=your_email@gmail.com
NOTIFICATION_FROM_NAME="Daily Reminder System"

# Application Settings
PORT=3000
NODE_ENV=development
DEFAULT_TIMEZONE=Europe/Berlin
SYSTEM_TIMEZONE=UTC
```

## 📚 API Endpoints

### Health & Info
- `GET /health` - Service health check with WebSocket status
- `GET /` - API information and available endpoints

### WebSocket Management
- `GET /api/socket/stats` - Get WebSocket connection statistics
- `POST /api/socket/broadcast` - Send system-wide broadcast message
- `POST /api/socket/notify` - Send notification to specific users
- `POST /api/socket/digest-preview` - Send digest preview to user
- `POST /api/socket/broadcast-stats` - Broadcast connection statistics

### Email Management
- `GET /api/email/status` - Get email service status and configuration
- `POST /api/email/test` - Send test email to verify SMTP setup
- `GET /api/email/stats` - Get email delivery statistics
- `GET /api/email/history` - Get recent email history
- `POST /api/email/digest/:email` - Trigger immediate daily digest
- `POST /api/email/check-notifications` - Manually trigger notification check
- `POST /api/email/weekly-digest` - Send weekly digest to all users
- `GET /api/email/scheduler/stats` - Get notification scheduler statistics
- `POST /api/email/scheduler/restart` - Restart notification scheduler
- `DELETE /api/email/cleanup` - Cleanup old notification records

### Events Management
- `POST /api/events` - Create new event (with real-time broadcasting)
- `GET /api/events` - List all events (with filters)
- `GET /api/events/upcoming` - Get upcoming events for digest
- `GET /api/events/:id` - Get event by ID (with recipients)
- `PUT /api/events/:id` - Update event (with real-time broadcasting)
- `DELETE /api/events/:id` - Delete event (with real-time broadcasting)

### Bulk Event Operations
- `POST /api/events/bulk/create` - Create multiple events with validation
- `PUT /api/events/bulk/update` - Update multiple events simultaneously
- `DELETE /api/events/bulk/delete` - Delete multiple events with notifications

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
- **notification_history**: Tracking sent notifications and email delivery status

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

- `npm start` - Start production server with WebSocket support
- `npm run dev` - Start development server with nodemon and real-time updates
- `npm run migrate` - Run database migrations
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking

## 🌐 WebSocket Features

### Real-time Updates
- **Event Broadcasting**: All event CRUD operations broadcast to connected clients
- **User Notifications**: Targeted notifications to event recipients
- **Connection Management**: Client authentication and room-based messaging
- **System Messages**: Server-wide announcements and status updates

### WebSocket Events (Client-side)
- `event:created` - New event was created
- `event:updated` - Event was modified
- `event:deleted` - Event was removed
- `recipient:updated` - Recipient information changed
- `notification` - Personal notification for user
- `system:message` - System-wide announcement
- `digest:preview` - Upcoming events preview
- `system:stats` - Connection statistics update

### Client Connection Example
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Authenticate with user info
socket.emit('authenticate', {
  email: 'user@example.com',
  timezone: 'Europe/Berlin'
});

// Listen for events
socket.on('event:created', (data) => {
  console.log('New event:', data.event);
});

socket.on('notification', (data) => {
  console.log('Personal notification:', data);
});
```

## 🛠️ Development

### Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # API request handlers with WebSocket integration
├── models/          # Database models with enhanced recurrence logic
├── routes/          # Express route definitions + WebSocket routes
├── middleware/      # Express middleware functions
└── services/        # Business logic services + WebSocket service + RecurrenceService

migrations/          # Database migration files
scripts/            # Utility scripts and migration runner
```

### New in Phase 2
- `src/services/socketService.js` - WebSocket server management and broadcasting
- `src/services/recurrenceService.js` - Advanced event recurrence processing
- `src/routes/socketRoutes.js` - WebSocket management API endpoints
- Enhanced Event model with optimized next occurrence calculations
- Real-time broadcasting integrated into all event controllers

### New in Phase 3 (Email Infrastructure)
- `src/config/email.js` - Gmail SMTP configuration and connection management
- `src/templates/emailTemplates.js` - Professional HTML email templates (4 types)
- `src/services/emailService.js` - Email delivery service with retry logic
- `src/services/notificationScheduler.js` - Cron-based automation for notifications and digests
- `src/controllers/emailController.js` - Email management API endpoints
- `src/routes/emailRoutes.js` - Email system routes and manual triggers

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

### Bulk Create Events
```bash
curl -X POST http://localhost:3000/api/events/bulk/create \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "title": "Team Standup",
        "description": "Daily standup meeting",
        "event_date": "2024-01-16T09:00:00Z",
        "recurrence_type": "custom_interval",
        "recurrence_value": 1,
        "recurrence_unit": "days",
        "recipients": [
          {
            "email": "team@example.com",
            "name": "Team Lead",
            "notification_lead_time": 30
          }
        ]
      }
    ]
  }'
```

### Get WebSocket Statistics
```bash
curl "http://localhost:3000/api/socket/stats"
```

### Send Notification to Users
```bash
curl -X POST http://localhost:3000/api/socket/notify \
  -H "Content-Type: application/json" \
  -d '{
    "userEmails": ["user@example.com"],
    "notification": {
      "title": "Reminder",
      "message": "Don't forget about the meeting!"
    }
  }'
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

**✅ Phase 1 Complete**: Backend foundation with database, API, and timezone support
**✅ Phase 2 Complete**: WebSocket real-time updates, enhanced event management, bulk operations
**✅ Phase 3 Complete**: Gmail SMTP integration, professional email templates, automated scheduling
**🔄 Phase 4 Next**: React frontend with Material-UI and calendar interface

### Upcoming Phases:
4. **React Frontend**: Modern UI with Material-UI and calendar interface
5. **Calendar Interface**: Drag-and-drop event management with real-time updates
6. **PWA Features**: Mobile optimization and offline capability
7. **Email Automation**: Notification scheduling and digest delivery system
8. **Advanced Features**: Search, filtering, import/export, production deployment

### Recent Phase 3 Additions (Email System):
- **Gmail SMTP Integration**: Professional email delivery with authentication
- **HTML Email Templates**: 4 responsive templates (event reminder, daily digest, event created, event cancelled)
- **Automated Scheduling**: 3 cron jobs (notifications every 15min, daily digests at 8AM, cleanup at 2AM)
- **Retry Logic**: 4-step retry mechanism with exponential backoff for failed emails
- **Email Tracking**: Complete history and statistics for all sent emails
- **Manual Controls**: API endpoints for immediate email triggers and system management
- **Real-time Integration**: Email status updates broadcast via WebSocket

### Previous Phase 2 Additions:
- **Real-time WebSocket Updates**: Live event broadcasting to connected clients
- **Bulk Operations**: Create, update, delete multiple events efficiently
- **Enhanced Recurrence**: Advanced recurring event processing with timezone support
- **Connection Management**: Client authentication and targeted messaging
- **Performance Optimizations**: Smart interval calculations for recurring events

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