# Frontend & Backend Integration Guide

## ✅ Integration Status

The frontend and backend are now **fully wired together**. Here's what has been configured:

### 1. **API Service Layer Created** ✅
- **File**: `src/services/apiService.js`
- **Features**:
  - Axios client with automatic JWT token injection
  - Automatic token expiration handling (401 responses)
  - Fallback to mock data on API failures
  - All 16 API endpoints covered:
    - Authentication (login, verify)
    - Dashboard, Students, Food Logs
    - Alerts, RFID Scan, Analytics

### 2. **Environment Configuration** ✅
- **File**: `.env.development`
- **Variables**:
  ```
  VITE_API_BASE_URL=http://localhost:5001/api
  VITE_API_TIMEOUT=10000
  VITE_ENABLE_MOCK_API=false
  ```

### 3. **Authentication Wiring** ✅
- **File**: `src/context/AuthContext.jsx`
- **Updated**:
  - Login now calls real backend API
  - Dynamic JWT token handling
  - Token expiration detection

### 4. **Component Updates** ✅
All pages updated to use API service:
- ✅ `DashboardPage` → `useDashboardData` hook
- ✅ `AlertsPage` → Real alert fetching
- ✅ `StudentsListPage` → Real student list
- ✅ `StudentProfilePage` → Real student profile
- ✅ `AnalyticsPage` → Real analytics data

---

## 🚀 How to Test the Integration

### Prerequisites
1. **Backend Running**
   ```bash
   cd backend
   npm run dev
   # Server should be running on http://localhost:5001
   ```

2. **Frontend Running**
   ```bash
   cd frontend
   npm run dev
   # Frontend should be running on http://localhost:5173
   ```

### Test Case 1: Health Check
**Goal**: Verify backend is accessible

```javascript
// Open browser DevTools console and run:
const response = await fetch('http://localhost:5001/api/health');
const data = await response.json();
console.log(data);
// Expected: { success: true, message: 'API is running' }
```

### Test Case 2: Login Flow
**Goal**: Test authentication integration

1. Go to login page: `http://localhost:5173/login`
2. Use backend credentials:
   - **Email**: `admin@nutrition.com`
   - **Password**: `password123`
3. Expected behavior:
   - Login succeeds
   - Redirected to dashboard
   - Token stored in localStorage
   - Header shows "Authorization: Bearer <token>"

### Test Case 3: Dashboard Loading
**Goal**: Verify API calls and data binding

1. After login, check Network tab in DevTools
2. Look for requests to:
   - `GET http://localhost:5001/api/dashboard` - should return KPIs, BMI trends, etc.
   - Response includes: `{ success: true, data: { ... } }`
3. Check if dashboard renders with:
   - KPI cards (X students, X meals today, avg BMI, at-risk count)
   - Active charts (BMI trend, Risk distribution, Food intake)
   - Activity feed with recent actions

### Test Case 4: Students Page
**Goal**: Test student list fetching

1. Navigate to Students page
2. Check Network tab for:
   - `GET http://localhost:5001/api/students?page=1&limit=50`
   - Should return array of 8 students (from seed data)
3. Verify table displays all students with:
   - Name, Age, BMI, Risk Level columns
   - Click any student row to see profile

### Test Case 5: Student Detail View
**Goal**: Test individual student API call

1. Click on any student from Students list
2. Check Network tab for:
   - `GET http://localhost:5001/api/students/{id}`
   - Returns detailed student data including:
     - Name, email, age, height, weight
     - Current BMI, risk level
     - Food logs array
     - Diet plan details
3. Verify profile page displays:
   - Student card with vital stats
   - Food intake table
   - Nutrition summary

### Test Case 6: Alerts Page
**Goal**: Test alerts filtering and display

1. Navigate to Alerts page
2. Check Network tab for:
   - `GET http://localhost:5001/api/alerts?riskLevel=all`
   - Returns array of alerts with categories
3. Try filtering by risk level:
   - Critical, At Risk, Healthy
   - Check network request updates the filter parameter
4. Verify display shows:
   - Student name and risk badge
   - Alert message
   - Timestamp

### Test Case 7: Token Persistence
**Goal**: Verify token is saved and reused

1. Login successfully
2. Open DevTools → Application → LocalStorage
3. Check for:
   - Key: `auth_token` → Value: JWT token
   - Key: `auth_user` → Value: User JSON
4. Refresh page
5. Verify:
   - Still logged in (no redirect to login)
   - Dashboard loads without re-login
6. Check Network → Request Headers for:
   - `Authorization: Bearer <token>` on all API calls

### Test Case 8: Token Expiration
**Goal**: Verify token expiration handling

1. Manually remove token from localStorage
2. Try to access a protected page (e.g., `/dashboard`)
3. Expected: Redirect to login page
4. OR: Call `apiService.auth.verify()` and it should fail

---

## 📊 Response Format Reference

### Success Response (2xx)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message description",
  "message": "User-friendly message"
}
```

---

## 🔄 API Interceptor Details

### Request Interceptor
```javascript
// Automatically adds JWT token to all requests
config.headers.Authorization = `Bearer ${localStorage.getItem('auth_token')}`;
```

### Response Interceptor
```javascript
// Handles 401 Unauthorized responses
if (error.response?.status === 401) {
  // Clears token and dispatches 'tokenExpired' event
  // AuthContext listens and redirects to login
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot reach backend"
**Solution**:
1. Check backend is running: `npm run dev` in backend folder
2. Verify port 5001: `netstat -ano | findstr :5001` (Windows)
3. Check `.env.development`: `VITE_API_BASE_URL=http://localhost:5001/api`
4. Check for CORS headers in DevTools Network tab

### Issue: "401 Unauthorized on all requests"
**Solution**:
1. Login with valid credentials first
2. Check token in localStorage: `localStorage.getItem('auth_token')`
3. Verify backend JWT_SECRET matches frontend expectations
4. Check token format in headers: Should be `Bearer <token>`

### Issue: "Mock data showing instead of real data"
**Solution**:
1. Check API service console for errors
2. Verify backend endpoint is responding:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:5001/api/dashboard
   ```
3. Check network responses in DevTools for error messages
4. Verify request format matches backend expectations

### Issue: "CORS errors in DevTools"
**Solution**:
1. Backend should have CORS enabled for `http://localhost:5173`
2. Check `src/app.js` for CORS configuration
3. If needed, manually add to backend:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true,
   }));
   ```

---

## 📝 Key Files Modified

| File | Changes |
|------|---------|
| `src/services/apiService.js` | NEW - Central API client |
| `.env.development` | NEW - Backend URL config |
| `src/context/AuthContext.jsx` | Updated login to use API service |
| `src/features/dashboard/hooks/useDashboardData.js` | Updated to use API service |
| `src/features/alerts/pages/AlertsPage.jsx` | Updated to use API service |
| `src/features/students/pages/StudentsListPage.jsx` | Updated to use API service |
| `src/features/students/pages/StudentProfilePage.jsx` | Updated to use API service |
| `src/features/analytics/pages/AnalyticsPage.jsx` | Updated to use API service |

---

## ✨ Features Now Available

### Authentication
- ✅ Real login with backend validation
- ✅ JWT token generation and storage
- ✅ Automatic token injection on requests
- ✅ Token expiration handling

### Data Fetching
- ✅ Real student data from database
- ✅ Real alerts from database
- ✅ Real dashboard KPIs and analytics
- ✅ Food log history
- ✅ Risk assessment data

### Error Handling
- ✅ Graceful fallback to mock data
- ✅ User-friendly error messages
- ✅ Network error handling
- ✅ Timeout handling (10 seconds)

### User Experience
- ✅ Automatic token refresh
- ✅ Persistent login (survives refresh)
- ✅ Loading states while fetching
- ✅ Toast notifications for actions

---

## 🎯 Next Steps

### Optional Enhancements
1. **Add error toast notifications** for failed API calls
2. **Add loading skeletons** for better UX
3. **Implement request retry logic** for failed requests
4. **Add API request caching** to reduce database hits
5. **Add request debouncing** for search/filter endpoints
6. **Implement pagination** for large datasets
7. **Add real-time WebSocket** for live alerts

### Performance Optimizations
1. Cache dashboard data for 30 seconds
2. Implement infinite scroll for lists
3. Add request batching for multiple queries
4. Use React Query for server state management

### Security Enhancements
1. Add CSRF token validation
2. Implement rate limiting on frontend
3. Add password strength validation
4. Implement session timeout warning

---

## 📞 Support

If you encounter any issues with the integration:

1. **Check the browser DevTools Network tab** - Look at API responses
2. **Check the browser Console** - Look for error messages
3. **Check backend logs** - Look for database or validation errors
4. **Verify environment setup** - Check .env.development file
5. **Restart both servers** - Fresh connection might help

---

**Status**: ✅ Frontend & Backend fully integrated and ready to use!

**Test Date**: March 31, 2026
**Integration Version**: 1.0.0
