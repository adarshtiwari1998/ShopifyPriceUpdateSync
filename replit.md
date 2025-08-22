# Shopify Inventory Sync Dashboard

## Overview

This is a full-stack web application that synchronizes inventory data between Shopify stores and Google Sheets. The system allows users to manage multiple Shopify stores, configure Google Sheets connections, and run automated sync processes that update product prices and inventory data in real-time.

The application provides a comprehensive dashboard for monitoring sync operations, viewing live activity logs, and managing store configurations. It features real-time updates through WebSocket connections and maintains detailed sync history and reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for monorepo structure

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with WebSocket support for real-time updates
- **Request Handling**: Express middleware for JSON parsing, logging, and error handling
- **Development**: Custom Vite integration for SSR-like development experience

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Node.js pg driver with connection pooling
- **Tables**: Stores, Google Sheets configurations, sync sessions, sync logs, and users
- **Data Validation**: Drizzle-Zod integration for runtime type safety

### Authentication and Authorization
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **User System**: Basic user authentication with username-based lookup
- **Store Access**: Store-based access control for multi-tenant functionality

### Real-time Communication
- **WebSocket Server**: ws library for real-time sync progress updates
- **Client Integration**: Custom useWebSocket hook for handling live updates
- **Message Types**: Sync progress, log entries, completion notifications

### Sync Engine Architecture
- **Service Layer**: Separate services for Shopify API and Google Sheets API integration
- **Session Management**: Tracked sync sessions with progress monitoring
- **Error Handling**: Comprehensive error tracking and recovery mechanisms
- **Concurrency Control**: Single sync per store with status tracking

## External Dependencies

### Third-party Services
- **Shopify Admin API**: Product and variant data management using REST API v2023-10
- **Google Sheets API v4**: Reading pricing data from configured spreadsheets
- **Google Cloud Service Account**: Authentication for Sheets API access

### Database Integration
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **SSL Configuration**: Production SSL with development fallback

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Runtime Error Handling**: Replit error modal integration
- **Environment Detection**: Automatic configuration based on Replit environment

### UI and Styling
- **Radix UI Primitives**: Accessible component foundation
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variants
- **Tailwind Merge**: Utility class conflict resolution

### Data Validation and Type Safety
- **Zod**: Runtime schema validation and TypeScript integration
- **Drizzle-Zod**: Database schema to Zod schema generation
- **TypeScript**: Strict type checking with path mapping for imports