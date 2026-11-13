import { useState, useEffect, useCallback } from 'react';
import apiService from '../../../services/apiService.js';

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading((prev) => (data ? false : true)); // Only show full loader on initial load

      const result = await apiService.dashboard.getData();

      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Error loading dashboard metrics');
      // If no data loaded yet, set null; otherwise preserve last known data
      if (!data) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

export default useDashboardData;
