import { useCallback, useRef } from 'react';
import {
  startJourney,
  setJourneyStep,
  endJourney,
  getActiveJourney,
  JourneyContext,
} from '../services/journeyTelemetry';

/**
 * React hook for managing a business journey within a screen or flow.
 *
 * Usage:
 *   const journey = useJourney('FLOW_ONBOARD_REGISTRATION');
 *   journey.begin('WELCOME');        // start the journey
 *   journey.step('REGISTER_IDENTITY'); // advance to next step
 *   journey.complete();              // end the journey
 */
export function useJourney(journeyId: string) {
  const contextRef = useRef<JourneyContext | null>(null);

  const begin = useCallback(
    (initialStep: string) => {
      contextRef.current = startJourney(journeyId, initialStep);
    },
    [journeyId],
  );

  const step = useCallback((stepName: string) => {
    setJourneyStep(stepName);
  }, []);

  const complete = useCallback(() => {
    endJourney();
    contextRef.current = null;
  }, []);

  return { begin, step, complete, getContext: getActiveJourney };
}
