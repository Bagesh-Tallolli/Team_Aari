import React, { createContext, useReducer, useCallback } from 'react';

export const AppContext = createContext();

const initialState = {
  selectedStudent: null,
  students: [],
  filters: {
    search: '',
    riskLevel: 'all', // 'all', 'healthy', 'at_risk', 'critical'
    sortBy: 'name', // 'name', 'bmi', 'risk'
  },
  sidebarCollapsed: false,
  darkMode: true,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SELECTED_STUDENT':
      return {
        ...state,
        selectedStudent: action.payload,
      };

    case 'SET_STUDENTS':
      return {
        ...state,
        students: action.payload,
      };

    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.filterName]: action.payload.value,
        },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };

    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };

    case 'TOGGLE_DARK_MODE':
      return {
        ...state,
        darkMode: !state.darkMode,
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setSelectedStudent = useCallback((student) => {
    dispatch({ type: 'SET_SELECTED_STUDENT', payload: student });
  }, []);

  const setStudents = useCallback((students) => {
    dispatch({ type: 'SET_STUDENTS', payload: students });
  }, []);

  const updateFilter = useCallback((filterName, value) => {
    dispatch({
      type: 'UPDATE_FILTER',
      payload: { filterName, value },
    });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
  }, []);

  const toggleDarkMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  }, []);

  const value = {
    ...state,
    setSelectedStudent,
    setStudents,
    updateFilter,
    resetFilters,
    toggleSidebar,
    setSidebarCollapsed,
    toggleDarkMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
