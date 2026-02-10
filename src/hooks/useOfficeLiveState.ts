import { useCallback, useEffect, useRef, useState } from 'react';
import type { OfficeEvent, OfficeStateEnvelope } from '../types';
import { fetchOfficeState, fetchOfficeTimeline } from '../services/agentOfficeApi';

const POLL_MS = 12_000;

interface UseOfficeLiveStateResult {
  envelope: OfficeStateEnvelope | null;
  timeline: OfficeEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOfficeLiveState(): UseOfficeLiveStateResult {
  const [envelope, setEnvelope] = useState<OfficeStateEnvelope | null>(null);
  const [timeline, setTimeline] = useState<OfficeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const [nextEnvelope, nextTimeline] = await Promise.all([fetchOfficeState(), fetchOfficeTimeline(80)]);

      setEnvelope(nextEnvelope);
      setTimeline(nextTimeline.events);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load office state');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  useEffect(() => {
    void load();

    timerRef.current = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [load]);

  return {
    envelope,
    timeline,
    loading,
    refreshing,
    error,
    refresh,
  };
}
