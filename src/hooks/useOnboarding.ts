import { useState, useEffect, useCallback } from 'react';
import {
  getOnboardingState,
  OnboardingState,
} from '../services/onboarding';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await getOnboardingState();
    setState(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, loading, refresh };
}
