"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface HeaderConfig {
  title?: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

interface HeaderContextValue {
  config: HeaderConfig;
  setConfig: (config: HeaderConfig) => void;
}

const HeaderContext = createContext<HeaderContextValue>({
  config: {},
  setConfig: () => {},
});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<HeaderConfig>({});
  const setConfig = useCallback((c: HeaderConfig) => setConfigState(c), []);
  return (
    <HeaderContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderConfig() {
  return useContext(HeaderContext);
}
