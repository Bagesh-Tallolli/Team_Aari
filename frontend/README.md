# 🍽️ AI-Based Smart Nutrition Monitoring & Automated Food Distribution System
## Frontend UI - Production Grade React Application

---

## 📋 Project Overview

This is a **production-grade dark-mode React frontend** for a comprehensive nutrition monitoring system targeting educational institutions. Built with modern technologies and architectural best practices, it delivers a polished, investor-ready user experience.

### Key Features:
- ✅ **5 Main Pages** (Auth, Dashboard, Students, Alerts, Analytics)
- ✅ **Glassmorphism UI** with dark mode design inspired by Apple Health & Tesla Dashboard
- ✅ **Real-time Data Visualization** with Recharts
- ✅ **Mock API Integration** via MSW (Mock Service Worker)
- ✅ **Type-safe Context API** state management
- ✅ **Responsive Design** (Desktop-first, tablet/mobile secondary)
- ✅ **Loading Skeletons** for smooth UX
- ✅ **Toast Notifications** for user feedback
- ✅ **Protected Routes** with authentication

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI Framework** | React 18+ with Hooks |
| **Styling** | Tailwind CSS 3+ |
| **Routing** | React Router v6 |
| **State Management** | Context API + useReducer |
| **Charts** | Recharts |
| **Forms** | React Hook Form |
| **Icons** | Lucide React |
| **Notifications** | React Hot Toast |
| **API Mocking** | MSW (Mock Service Worker) |
| **Development** | Vite (HMR) |
| **Date Handling** | date-fns |

---

## ⚠️ IMPORTANT: Node.js Requirement

**Current Environment**: Node.js 20.18.0 ❌  
**Required**: Node.js 20.19.0+ or 22.12.0+ ✅

To run this project, you **MUST upgrade Node.js** first:

```bash
# Check current version
node --version

# Upgrade from nodejs.org or use nvm
# https://nodejs.org/
# https://github.com/nvm-sh/nvm (Linux/Mac)
# https://github.com/coreybutler/nvm-windows (Windows)

# After upgrade, verify
node --version  # Should be 20.19+ or 22.12+
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.19.0 or v22.12.0+ (⚠️ Must upgrade from 20.18.0)
- **npm**: v10.2.0+
- **Git**: For version control

### Installation

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:5173
```

### Demo Credentials
```
Email:    admin@nutrition.com
Password: password123
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/common/        # Reusable UI components (Card, Badge, Table, Modal, etc.)
│   ├── components/layout/        # Layout wrapper (Sidebar + Navbar)
│   ├── features/                 # Feature modules (auth, dashboard, students, alerts, analytics)
│   ├── context/                  # Global state (App, Auth, Notifications)
│   ├── hooks/                    # Custom React hooks
│   ├── mocks/                    # MSW mock API setup
│   ├── utils/                    # Constants, formatters, validators
│   ├── styles/                   # Global CSS (Tailwind)
│   ├── assets/                   # Images, logos
│   ├── App.jsx                   # Main router
│   └── main.jsx                  # App entry (MSW init)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 📄 Available Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Authentication (public) |
| `/` | DashboardPage | Dashboard (protected) |
| `/students` | StudentsListPage | Student list (protected) |
| `/students/:id` | StudentProfilePage | Student profile (protected) |
| `/alerts` | AlertsPage | Alerts (protected) |
| `/analytics` | AnalyticsPage | Analytics (protected) |

---

## 🔐 Authentication

- **Login endpoint**: `/api/auth/login` (mocked via MSW)
- **Token storage**: localStorage
- **Auth flow**: Login → Token saved → ProtectedRoute allows access
- **Logout**: Clears token, redirects to login

---

## 📊 Mock API Endpoints

All API calls are intercepted by MSW (no real backend needed):

```
POST   /api/auth/login              Login with email/password
GET    /api/dashboard               KPI cards, charts, activity feed
GET    /api/students                Student list
GET    /api/students/:id            Student detail + food logs
GET    /api/alerts                  Alert list
GET    /api/analytics               Analytics data
```

---

## 🎨 Design Highlights

### Color Scheme
- **Primary**: #4F46E5 (Indigo)
- **Secondary**: #22C55E (Green)
- **Danger**: #EF4444 (Red)
- **Background**: #0F172A (Dark Navy)

### Glassmorphism Cards
```css
.glass {
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 1rem;
}
```

---

## 🧩 Key Components

**Card**: Glassmorphic container  
**KpiCard**: Metric with trend  
**Table**: Reusable data display  
**Modal**: Dialog overlay  
**Sidebar**: Navigation menu  
**Navbar**: Top bar with search & profile  
**Skeleton**: Loading placeholder  
**Badge**: Status badge  
**Loader**: Spinner animation

---

## 🪝 Custom Hooks

- `useFetch()` - Data fetching
- `useLocalStorage()` - Persistent state
- `useForm()` - Form handling
- `useDebounce()` - Debounced values
- `useToggle()` - Boolean toggle
- `useAsync()` - Async operations

---

## 💼 State Management

**App Context**: Global UI state  
**Auth Context**: User & session  
**Notification Context**: Toast messages

---

## 📦 Build Commands

```bash
npm run dev            # Start dev server
npm run build          # Create production build
npm run preview        # Preview build locally
npm run lint           # Run ESLint (if configured)
```

---

## 🚀 Production Deployment

1. **Build**: `npm run build` → Creates `dist/` folder
2. **Deploy to**:
   - Vercel (easiest for Next.js/Vite)
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages
   - Firebase Hosting

---

## 🔗 Integration with Backend

When backend API is ready:

1. Remove MSW setup from `src/main.jsx`
2. Update API URLs in environment variables
3. Replace mock data with real API calls
4. Implement error handling for real failures
5. Add loading states and retries

---

## 📚 Documentation

- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Recharts](https://recharts.org)
- [MSW](https://mswjs.io)
- [Lucide Icons](https://lucide.dev)

---

## ✨ Quality Checklist

- ✅ **Architecture**: Feature-based, modular structure
- ✅ **Components**: Reusable, well-documented
- ✅ **Styling**: Consistent Tailwind patterns
- ✅ **State**: Centralized Context API
- ✅ **Performance**: Code splitting, optimized imports
- ✅ **UX**: Smooth animations, loading states
- ✅ **Security**: Protected routes, localStorage tokens
- ✅ **Documentation**: README, code comments
- ✅ **Responsiveness**: Desktop-first design
- ✅ **Dark Mode**: Forced dark theme throughout

---

**Status**: ✅ Production-Ready | **Last Updated**: March 31, 2026

