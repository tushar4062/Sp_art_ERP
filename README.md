# Little Brushes Studio - ERP System

An all-in-one ERP system for Little Brushes Art Academy, built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- **Multi-role dashboard system** for Super Admin, Admin, Senior Teacher, Teacher, and Student
- **Comprehensive management** of students, teachers, classes, fees, inventory, and certificates
- **Real-time notifications** and chat system
- **Progress tracking** and drawing test evaluations
- **Attendance management** and payroll processing
- **Responsive design** with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **State Management**: Zustand (dataStore) + React Context (AuthContext)
- **Data Fetching**: TanStack React Query
- **Testing**: Jest + React Testing Library
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ or Bun

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start development server
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
# Create production build
npm run build

# Start production server
npm run start
```

## Project Structure

```
app/
  ├── layout.tsx              # Root layout with providers
  ├── page.tsx                # Home page (redirect to role dashboard)
  ├── login/                  # Login page
  ├── admin/                  # Admin dashboard and routes
  ├── teacher/                # Teacher dashboard and routes
  ├── student/                # Student dashboard and routes
  ├── senior-teacher/         # Senior teacher dashboard and routes
  └── super-admin/            # Super admin dashboard and routes
src/
  ├── components/             # Reusable UI components
  │   ├── ui/                # shadcn/ui components
  │   ├── shared/            # Shared components (Avatar, Logo, etc.)
  │   └── layouts/           # Layout components (RoleLayout)
  ├── contexts/              # React context providers (AuthContext)
  ├── pages/                 # Page components (migrated from Vite)
  ├── hooks/                 # Custom React hooks
  ├── lib/                   # Utility functions
  ├── store/                 # Zustand state management
  ├── data/                  # Mock data
  └── styles/               # Global styles
```

## Authentication

The application uses a simple authentication context (`AuthContext`) with role-based access control. 

**Demo credentials:**
- Super Admin: vikram@littlebrushes.in
- Admin: anjali@littlebrushes.in
- Senior Teacher: rahul@littlebrushes.in
- Teacher: sneha@littlebrushes.in
- Student: aarav@kid.in

Any password works in demo mode.

## Key Components

### RoleLayout
Main layout component that wraps role-based dashboards with sidebar navigation and header.

### RequireRole
Route protection component that ensures users can only access their authorized role's pages.

### Providers
Client-side providers wrapper that includes:
- QueryClientProvider (React Query)
- TooltipProvider (shadcn/ui)
- AuthProvider (Authentication context)
- Toaster and Sonner (Toast notifications)

## Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Migration Notes

This project was recently migrated from Vite to Next.js. Key changes:

1. **Build Tool**: Vite → Next.js
2. **Routing**: React Router → Next.js App Router
3. **File Structure**: Flat src/pages → Nested app directory
4. **Testing**: Vitest → Jest
5. **Component Updates**: All components updated to use Next.js routing (useRouter, Link)
6. **Layout System**: Converted RoleLayout to work with Next.js nested layouts

## Environment Variables

Create a `.env.local` file for environment-specific variables (if needed):

```
NEXT_PUBLIC_API_URL=your_api_url
```

## Contributing

Follow these guidelines:
1. Use TypeScript for all new code
2. Follow the existing folder structure
3. Keep components modular and reusable
4. Use Tailwind CSS for styling
5. Write tests for new features

## License

TODO: Add license information


#Hereis your project


<!-- --Dev.PawanBWagh-- -->
<!-- testing by shashant  -->
<!-- dev>coflictr -->
