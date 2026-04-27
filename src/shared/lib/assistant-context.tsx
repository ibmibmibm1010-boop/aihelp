import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type AssistantContextValue = {
  open: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  setAssistantOpen: Dispatch<SetStateAction<boolean>>;
  fabHidden: boolean;
  setFabHidden: Dispatch<SetStateAction<boolean>>;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);

  const value = useMemo<AssistantContextValue>(
    () => ({
      open,
      openAssistant: () => setOpen(true),
      closeAssistant: () => setOpen(false),
      setAssistantOpen: setOpen,
      fabHidden,
      setFabHidden,
    }),
    [open, fabHidden],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return ctx;
}
