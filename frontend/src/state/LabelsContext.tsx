import { createContext, useContext, type ReactNode } from "react";
import { getLabels } from "../api/endpoints";
import { useFetch } from "../hooks/useFetch";
import type { GroupedLabels } from "../api/types";

/** Devuelve el texto de una etiqueta desde la BD, con respaldo local si no existe. */
type LabelFn = (grupo: string, campo: string, fallback: string) => string;

const LabelsContext = createContext<LabelFn>((_g, _c, fallback) => fallback);

export function LabelsProvider({ children }: { children: ReactNode }) {
  const { data } = useFetch<GroupedLabels>(getLabels);
  const label: LabelFn = (grupo, campo, fallback) => data?.[grupo]?.[campo] ?? fallback;
  return <LabelsContext.Provider value={label}>{children}</LabelsContext.Provider>;
}

export function useLabel(): LabelFn {
  return useContext(LabelsContext);
}
