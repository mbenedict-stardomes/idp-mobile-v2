import React, { createContext, useContext } from 'react';

interface AppContextType {
  onOnboardingDone: () => void;
  onLogout: () => void;
}

const AppContext = createContext<AppContextType>({
  onOnboardingDone: () => {},
  onLogout: () => {},
});

export const AppContextProvider = AppContext.Provider;
export const useAppContext = () => useContext(AppContext);
