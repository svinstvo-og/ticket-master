# Ticket Submission Platform

A web-based Ticket Submission Platform designed to streamline issue reporting with modern web technologies and user-friendly interfaces.

## Features

- User authentication system
- Interactive ticket submission form
- QR code scanning integration
- Czech language localization
- Dashboard for ticket management
- Search and filter capabilities
- Status updates and notifications
- File attachment support
- Responsive mobile-first design

## Technology Stack

- Frontend:
  - React with TypeScript
  - Tailwind CSS for styling
  - Shadcn UI components
  - Form validation with React Hook Form and Zod
  - TanStack Query for API data fetching

- Backend:
  - Express.js server
  - Database integration with Drizzle ORM
  - Authentication with Passport.js
  - File upload handling with Multer

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ticket-submission-platform.git
   cd ticket-submission-platform
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:5000`
2. Register for a new account or login
3. Submit tickets using the form
4. View and manage tickets in the dashboard

## Project Structure

- `/client` - React frontend application
  - `/src` - Source code
    - `/components` - UI components
    - `/hooks` - Custom React hooks
    - `/lib` - Utility functions
    - `/pages` - Page components
- `/server` - Express backend application
  - `/routes.ts` - API routes
  - `/storage.ts` - Data storage interface
  - `/auth.ts` - Authentication logic
- `/shared` - Shared code between frontend and backend
  - `/schema.ts` - Data models and validation schemas