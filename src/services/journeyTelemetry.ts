/**
 * Journey Telemetry Service
 *
 * Manages business journey lifecycle on the mobile client.
 * Generates journey instance IDs and provides headers for API calls
 * so the backend can correlate all requests within a single journey.
 */

export interface JourneyContext {
  journeyId: string;
  journeyInstanceId: string;
  currentStep: string;
  startedAt: number;
  stepStartedAt: number;
}

let activeJourney: JourneyContext | null = null;

function generateId(): string {
  // Use crypto.randomUUID where available, otherwise fall back to timestamp-based ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Start a new business journey. Any previously active journey is ended.
 */
export function startJourney(journeyId: string, initialStep: string): JourneyContext {
  const now = Date.now();
  activeJourney = {
    journeyId,
    journeyInstanceId: generateId(),
    currentStep: initialStep,
    startedAt: now,
    stepStartedAt: now,
  };
  return activeJourney;
}

/**
 * Advance to the next step within the active journey.
 */
export function setJourneyStep(step: string): void {
  if (activeJourney) {
    activeJourney.currentStep = step;
    activeJourney.stepStartedAt = Date.now();
  }
}

/**
 * Get HTTP headers to inject into API calls.
 * Returns empty object if no journey is active.
 */
export function getJourneyHeaders(): Record<string, string> {
  if (!activeJourney) return {};
  return {
    'X-Journey-Id': activeJourney.journeyId,
    'X-Journey-Instance': activeJourney.journeyInstanceId,
    'X-Journey-Step': activeJourney.currentStep,
  };
}

/**
 * End the active journey (e.g. on completion or abandonment).
 */
export function endJourney(): void {
  activeJourney = null;
}

/**
 * Get the currently active journey context (or null).
 */
export function getActiveJourney(): JourneyContext | null {
  return activeJourney;
}
