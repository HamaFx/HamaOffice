import { useEffect, useMemo, useRef, useState } from 'react';
import type { OfficeSceneSnapshot } from '../types';
import {
  createSimulationState,
  selectRenderedAgents,
  stepSimulation,
  type OfficeSimulationState,
} from '../lib/simulation';

interface UseOfficeSimulationResult {
  simulation: OfficeSimulationState | null;
  agents: ReturnType<typeof selectRenderedAgents>;
}

export function useOfficeSimulation(scene: OfficeSceneSnapshot | null): UseOfficeSimulationResult {
  const [simulation, setSimulation] = useState<OfficeSimulationState | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!scene) {
      setSimulation(null);
      return;
    }

    setSimulation((previous) => createSimulationState(scene, previous));
  }, [scene]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = Math.min(40, Math.max(10, timestamp - lastTimeRef.current));
      lastTimeRef.current = timestamp;

      setSimulation((current) => (current ? stepSimulation(current, delta) : current));
      frameRef.current = window.requestAnimationFrame(loop);
    };

    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastTimeRef.current = 0;
    };
  }, []);

  const agents = useMemo(() => {
    if (!simulation) return [];
    return selectRenderedAgents(simulation);
  }, [simulation]);

  return {
    simulation,
    agents,
  };
}
