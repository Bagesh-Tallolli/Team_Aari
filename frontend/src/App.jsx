import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AppProvider } from './context/AppContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

// Pages
import LoginPage from './features/auth/pages/LoginPage.jsx';
import SignupPage from './features/auth/pages/SignupPage.jsx';
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx';
import FoodDistributionPage from './features/foodDistribution/pages/FoodDistributionPage.jsx';
import StudentsListPage from './features/students/pages/StudentsListPage.jsx';
import StudentRegistrationPage from './features/students/pages/StudentRegistrationPage.jsx';
import StudentProfilePage from './features/students/pages/StudentProfilePage.jsx';
import StudentNutritionTracker from './features/students/pages/StudentNutritionTracker.jsx';
import AlertsPage from './features/alerts/pages/AlertsPage.jsx';
import AnalyticsPage from './features/analytics/pages/AnalyticsPage.jsx';
import HowItWorksPage from './features/info/pages/HowItWorksPage.jsx';
import GovernmentSchemesPage from './features/schemes/pages/GovernmentSchemesPage.jsx';

// Components
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppProvider>
            <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/food-distribution"
                element={
                  <ProtectedRoute>
                    <FoodDistributionPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/students"
                element={
                  <ProtectedRoute>
                    <StudentsListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/students/nutrition-tracker"
                element={
                  <ProtectedRoute>
                    <StudentNutritionTracker />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/students/register"
                element={
                  <ProtectedRoute>
                    <StudentRegistrationPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/students/:id"
                element={
                  <ProtectedRoute>
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <AlertsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/government-schemes"
                element={
                  <ProtectedRoute>
                    <GovernmentSchemesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/how-it-works"
                element={
                  <ProtectedRoute>
                    <HowItWorksPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<div>404 - Not Found</div>} />
            </Routes>

            {/* Toast Container */}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1E293B',
                  color: '#fff',
                  borderRadius: '12px',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                },
              }}
            />
          </Router>
        </AppProvider>
      </NotificationProvider>
    </AuthProvider>
  </ErrorBoundary>
);
}

export default App;
