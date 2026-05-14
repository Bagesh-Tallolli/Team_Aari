import React, { createContext, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const toastRefs = useRef({});

  const showToast = useCallback((message, type = 'success', options = {}) => {
    const defaultOptions = {
      duration: 4000,
      position: 'top-right',
      ...options,
    };

    let toastFn = toast;

    switch (type) {
      case 'success':
        toastFn = toast.success;
        break;
      case 'error':
        toastFn = toast.error;
        break;
      case 'loading':
        toastFn = toast.loading;
        break;
      default:
        toastFn = toast;
    }

    const id = toastFn(message, defaultOptions);
    toastRefs.current[id] = { message, type, id };
    return id;
  }, []);

  const showSuccess = useCallback((message, options = {}) => {
    return showToast(message, 'success', options);
  }, [showToast]);

  const showError = useCallback((message, options = {}) => {
    return showToast(message, 'error', options);
  }, [showToast]);

  const showLoading = useCallback((message, options = {}) => {
    return showToast(message, 'loading', options);
  }, [showToast]);

  const dismissToast = useCallback((id) => {
    toast.dismiss(id);
    delete toastRefs.current[id];
  }, []);

  const dismissAll = useCallback(() => {
    toast.remove();
    toastRefs.current = {};
  }, []);

  const updateToast = useCallback((id, message, type = 'success') => {
    toast((t) => message, {
      id,
    });
    if (toastRefs.current[id]) {
      toastRefs.current[id].message = message;
      toastRefs.current[id].type = type;
    }
  }, []);

  const value = {
    showToast,
    showSuccess,
    showError,
    showLoading,
    dismissToast,
    dismissAll,
    updateToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
