import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants.js';
import apiService from '../services/apiService.js';

export const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'LOGIN_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };

    case 'RESTORE_TOKEN':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: !!action.payload.token,
        isLoading: false,
      };

    case 'INIT_COMPLETE':
      return {
        ...state,
        isLoading: false,
      };

    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const rawUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);

      if (token && rawUser && rawUser !== 'undefined' && rawUser !== 'null') {
        const parsedUser = JSON.parse(rawUser);
        dispatch({
          type: 'RESTORE_TOKEN',
          payload: {
            token,
            user: parsedUser,
          },
        });
      } else {
        dispatch({ type: 'INIT_COMPLETE' });
      }
    } catch (err) {
      console.warn('Failed to parse cached auth session, clearing:', err);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      dispatch({ type: 'INIT_COMPLETE' });
    }
  }, []);

  // Listen for token expiration events
  useEffect(() => {
    const handleTokenExpired = () => {
      dispatch({ type: 'LOGOUT' });
      dispatch({
        type: 'LOGIN_ERROR',
        payload: 'Your session has expired. Please login again.',
      });
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    return () => window.removeEventListener('tokenExpired', handleTokenExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      // Call the backend API
      const result = await apiService.auth.login(email, password);

      if (!result.success) {
        dispatch({
          type: 'LOGIN_ERROR',
          payload: result.error || 'Login failed',
        });
        return { success: false, error: result.error };
      }

      const { token, user: apiUser } = result.data;

      const user = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name || 'User',
        role: apiUser.role || 'staff',
        avatar: apiUser.avatar || '',
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          token,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      dispatch({
        type: 'LOGIN_ERROR',
        payload: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  const signup = useCallback(async (email, password, name, role = 'staff', phone = null, school_name = null) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      // Call the backend API
      const result = await apiService.auth.signup(
        typeof email === 'object'
          ? email
          : { email, password, name, role, phone, school_name }
      );

      if (!result.success) {
        dispatch({
          type: 'LOGIN_ERROR',
          payload: result.error || 'Signup failed',
        });
        return { success: false, error: result.error };
      }

      const { token, user: apiUser } = result.data;

      const user = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name || 'User',
        role: apiUser.role || 'staff',
        avatar: apiUser.avatar || '',
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          token,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Signup failed';
      dispatch({
        type: 'LOGIN_ERROR',
        payload: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user });
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    }
  }, []);

  const value = {
    ...state,
    signup,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
