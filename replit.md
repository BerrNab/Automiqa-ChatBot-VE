# Overview

This is a comprehensive SaaS chatbot platform where the platform owner/admin has full control over every aspect of the service. The system is designed as an admin-centric platform where administrators create client businesses, configure all chatbot settings, manage subscriptions, and control widget access. Clients receive only embeddable widget URLs to integrate chatbots into their websites - they have no login access or administrative capabilities.

The platform is built with a modern full-stack architecture using React for the frontend, Express.js with TypeScript for the backend, PostgreSQL with Drizzle ORM for data persistence, and integrates with OpenAI for AI chat capabilities. The system includes comprehensive subscription management with trial-to-paid conversion workflows and automatic widget deactivation on payment expiry.

# Recent Changes

## December 16, 2024 - Email Notification System Implementation

### Email Notification System with Nodemailer
- **Complete Email Service**: Implemented comprehensive email notification system using Nodemailer instead of SendGrid
- **Automated Notifications**: Trial expiration warnings (7d, 3d, 1d), trial expired, payment reminders, payment failed, subscription reactivated
- **Professional Templates**: 7 responsive HTML email templates with progressive urgency design (blue → amber → red)
- **Development Ready**: Auto-configures with Ethereal test accounts when SMTP credentials not provided
- **Template Management**: Built-in fallback templates and caching system for reliability
- **Email Service Features**:
  - SMTP configuration support (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
  - Test account creation for development
  - HTML-to-text conversion for plain text emails
  - Email preview URLs in development mode
  - Template rendering with dynamic data replacement
  - Connection testing and validation

### Database Schema Updates
- **Email Settings Table**: `email_settings` for configurable notification preferences
- **Email Notifications Table**: `email_notifications` for delivery tracking and history
- **Storage Interface**: Complete CRUD operations for email management

### Backend API Routes
- **Email Configuration**: `/api/email-notifications/settings` for managing notification preferences
- **Notification Processing**: `/api/email-notifications/process` for triggering email campaigns
- **Manual Triggers**: `/api/email-notifications/send-manual` for individual notifications
- **Service Status**: `/api/email-notifications/status` for system health monitoring
- **Test Email**: `/api/email-notifications/test-email` for service verification
- **Statistics**: `/api/email-notifications/stats` for delivery analytics

### Environment Variables for Email
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_USER`: SMTP authentication username
- `SMTP_PASS`: SMTP authentication password
- `DEFAULT_FROM_EMAIL`: Default sender email address

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development tooling
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation

## Backend Architecture
- **Runtime**: Node.js with TypeScript and ES modules
- **Framework**: Express.js with session-based authentication using Passport.js
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Storage**: Express-session with secure configuration and optional PostgreSQL session store
- **Authentication**: Local strategy with bcrypt password hashing and role-based access control
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling

## Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database serverless connection
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Key Entities**:
  - Admins: Platform administrators with full system access
  - Clients: Business entities created and managed by admins
  - Chatbots: AI-powered bots configured per client with customizable branding and behavior
  - Subscriptions: Trial and paid subscription management with automatic status tracking
  - Payment Logs: Transaction history and payment status tracking
  - Widget Analytics: Usage metrics and performance data

## Authentication & Authorization
- **Admin Authentication**: Username/password with secure session management
- **Session Security**: HttpOnly cookies, CSRF protection, and secure cookie settings
- **Role-Based Access**: Admin-only access to all management functions
- **Widget Access Control**: Public widget endpoints with subscription-based access validation

## Core Business Logic
- **Client Lifecycle**: Admin creates clients → configures chatbots → assigns subscriptions → shares widget URLs
- **Subscription Management**: Trial assignment, paid conversion, extension, suspension, and automatic deactivation
- **Widget Integration**: Dual-mode embeddable widgets (floating button or fullpage) with real-time subscription status validation
- **Revenue Tracking**: Payment processing simulation and subscription analytics
- **Widget Deployment Modes**:
  - Floating Widget: Chat bubble button that opens on click (bottom corner placement)
  - Fullpage Widget: Direct iframe embed for dedicated chat sections
  - Both modes share all configuration and features
- **Design Themes**: 5 customizable modern themes with animations
  - Modern: Clean with subtle shadows and rounded corners
  - Wave: Wavy patterns and flowing design elements
  - Glass: Glass-morphism with blur effects
  - Minimal: Simple and clean design
  - Gradient: Vibrant gradients and bold colors
- **Lead Generation System**:
  - Mandatory pre-chat form requiring name and phone number
  - Automatic detection of contact information (email, phone, name)
  - Consent-based lead capture with customizable prompts
  - Progressive capture avoiding duplicate requests
  - Lead status workflow (new → contacted → qualified → converted)
  - Client dashboard for lead management with filtering and export
  - Configurable auto-ask after specified message count
  - Session persistence (24-hour) to avoid re-asking returning visitors

# External Dependencies

## AI & Chat Services
- **OpenAI API**: GPT-4 integration for natural language processing and chat responses
- **Custom Chat Engine**: Message processing with configurable behavior, fallback messages, and context management
- **Smart Response Detection**: Automatic detection of question types with suggested clickable response options
  - Yes/No questions automatically generate buttons
  - Multiple choice questions extract and display options
  - Context-aware suggestions for appointments, services, satisfaction, etc.
  - Users can click buttons or type manually

## Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Drizzle ORM**: Type-safe database operations with schema validation

## Payment Processing
- **Stripe Integration**: Ready for payment processing implementation (currently simulated)
- **Payment Tracking**: Mock payment intents and retry mechanisms for development

## Development & Deployment
- **Vite**: Frontend build tool with hot module replacement and development server
- **Replit Integration**: Cartographer and dev banner plugins for Replit environment
- **TypeScript**: Full type safety across frontend and backend with shared schema types

## MCP (Model Context Protocol) Integration
- **Safe MCP Service**: Secure implementation replacing dangerous npx-based approaches
- **Google Calendar Integration**: Appointment scheduling capabilities (mock implementation)
- **Google Sheets Integration**: Client data storage and management (mock implementation)
- **Security Focus**: No external process spawning or arbitrary code execution

## UI & Styling
- **Shadcn/ui**: Modern component library with customizable themes
- **Radix UI**: Accessible primitive components for complex interactions
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide React**: Icon system for consistent visual elements