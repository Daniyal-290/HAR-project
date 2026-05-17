import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '../api/statsApi';

const POLL_INTERVAL = 10000; // 10 seconds

export function useStats(range = 'day') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const stats = await fetchStats(range);
      setData(stats);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      // Don't clear existing data on poll errors — show stale data
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, lastUpdated, refetch: load };
}
