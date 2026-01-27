# EduPlataforma Frontend

Frontend application for the teacher platform built with React, TypeScript, and Tailwind CSS.

## Features

- **Authentication**: Login and signup with Supabase
- **Course Management**: Create, view, update, and delete courses
- **Student Management**: Enroll students individually or via bulk upload (CSV/Excel)
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Responsive Design**: Mobile-friendly interface based on the provided template

## Tech Stack

- **React 19** with TypeScript
- **React Router** for navigation
- **React Hook Form** + **Zod** for form validation
- **Axios** for API calls
- **Tailwind CSS** for styling
- **Vite** as build tool

## Project Structure

```
src/
├── components/
│   ├── courses/          # Course-related components
│   │   ├── CourseCard.tsx
│   │   ├── CreateCourseModal.tsx
│   │   └── EnrollStudentModal.tsx
│   └── layout/           # Layout components
│       ├── Header.tsx
│       └── Sidebar.tsx
├── contexts/             # React contexts
│   └── AuthContext.tsx
├── hooks/                # Custom hooks
│   └── useCourses.ts
├── lib/                  # Utilities
│   └── api.ts           # API client
├── pages/               # Page components
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx
│   └── courses/
│       ├── CoursesPage.tsx
│       └── CourseDetailPage.tsx
├── schemas/             # Zod validation schemas
│   ├── auth.ts
│   └── course.ts
└── types/               # TypeScript types
    └── index.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- Backend services running (auth, courses, gateway)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your API URL (default is `http://localhost:8000`).

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Usage

### Authentication

1. **Signup**: Create a new account at `/signup`
2. **Login**: Access your account at `/login`
3. **Logout**: Click the logout button in the sidebar

### Course Management

1. **Create Course**: Click "Crear Curso" button on the courses page
2. **View Course Details**: Click "Ver Detalles" on any course card
3. **Delete Course**: Click the delete icon on a course card

### Student Enrollment

1. **Individual Enrollment**: 
   - Open course details
   - Click "Inscribir Estudiante"
   - Fill in student name and email

2. **Bulk Enrollment**:
   - Open course details
   - Click "Cargar Excel/CSV"
   - Select a CSV or Excel file with columns: `email` and `full_name` (or `nombre`)

3. **Unenroll Student**: Click the remove icon next to a student in the course details

## API Integration

The frontend communicates with the backend through the API Gateway (`http://localhost:8000`):

- **Auth**: `/auth/signup`, `/auth/login`
- **Courses**: `/courses` (CRUD operations)
- **Students**: `/students`, `/courses/{id}/students` (enrollment)

All authenticated requests include the JWT token in the `Authorization` header.

## Architecture

### Clean Code Principles

- **Separation of Concerns**: Components, pages, hooks, and utilities are clearly separated
- **Single Responsibility**: Each component has a single, well-defined purpose
- **DRY (Don't Repeat Yourself)**: Reusable components and hooks
- **Type Safety**: Full TypeScript support with strict typing
- **Validation**: Zod schemas for runtime validation
- **Error Handling**: Centralized error handling in API client

### State Management

- **Auth State**: Managed by `AuthContext` with localStorage persistence
- **Server State**: Fetched via custom hooks (`useCourses`, `useCourse`)
- **Local State**: Component-level state with `useState`

### Form Handling

- **React Hook Form**: For form state management
- **Zod**: For schema validation
- **@hookform/resolvers**: For integrating Zod with React Hook Form

## Design System

Based on the provided template with:
- **Colors**: Blue primary, slate grays, semantic colors (red, green, yellow)
- **Typography**: Lexend font family
- **Icons**: Material Symbols Outlined
- **Components**: Modern, clean design with dark mode support

## License

MIT
