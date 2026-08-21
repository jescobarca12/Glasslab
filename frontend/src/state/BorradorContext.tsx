import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { borradorInicial, type Borrador, type Campos, type Confirmacion } from "../domain/borrador";
import { rutearPrefill } from "../domain/wizard";
import type { Challenge } from "../api/types";

type ModuloConCampos = "geometria" | "acustico" | "solar" | "condensacion" | "seguridad";

interface BorradorContextValue {
  borrador: Borrador;
  indice: number;
  setIndice: (updater: number | ((i: number) => number)) => void;
  retoActivo: string | null;
  setProyectoInfo: (patch: Partial<Borrador["proyecto"]>) => void;
  setAplicacionUI: (aplicacionUI: string) => void;
  setCampo: (modulo: ModuloConCampos, campo: string, valor: unknown) => void;
  toggleNecesidadUI: (id: string) => void;
  setConfirmacion: (patch: Partial<Confirmacion>) => void;
  setEleccion: (selectedSolution: string) => void;
  setRequestCommercialContact: (v: boolean) => void;
  cargarReto: (challenge: Challenge) => void;
  reset: () => void;
}

const BorradorContext = createContext<BorradorContextValue | null>(null);

export function BorradorProvider({ children }: { children: ReactNode }) {
  const [borrador, setBorrador] = useState<Borrador>(borradorInicial);
  const [indice, setIndice] = useState(0);
  const [retoActivo, setRetoActivo] = useState<string | null>(null);

  const value = useMemo<BorradorContextValue>(() => ({
    borrador,
    indice,
    setIndice,
    retoActivo,
    setProyectoInfo: (patch) => setBorrador((b) => ({ ...b, proyecto: { ...b.proyecto, ...patch } })),
    setAplicacionUI: (aplicacionUI) => setBorrador((b) => ({ ...b, aplicacionUI })),
    setCampo: (modulo, campo, valor) =>
      setBorrador((b) => ({ ...b, [modulo]: { ...(b[modulo] as Campos), [campo]: valor } })),
    toggleNecesidadUI: (id) =>
      setBorrador((b) => ({
        ...b,
        necesidadesUI: b.necesidadesUI.includes(id)
          ? b.necesidadesUI.filter((n) => n !== id)
          : [...b.necesidadesUI, id],
      })),
    setConfirmacion: (patch) =>
      setBorrador((b) => ({ ...b, confirmacion: { ...b.confirmacion, ...patch } })),
    setEleccion: (selectedSolution) => setBorrador((b) => ({ ...b, eleccion: { selectedSolution } })),
    setRequestCommercialContact: (v) => setBorrador((b) => ({ ...b, requestCommercialContact: v })),
    cargarReto: (challenge) => {
      const modulos = rutearPrefill(challenge.prefill ?? {});
      setBorrador(() => ({
        ...borradorInicial(),
        proyecto: { ...borradorInicial().proyecto, nombre: `Reto: ${challenge.titulo}`, ciudadId: challenge.suggestedCityCode ?? "" },
        aplicacionUI: challenge.applicationCode,
        geometria: modulos.geometria,
        acustico: modulos.acustico,
        solar: modulos.solar,
        condensacion: modulos.condensacion,
        seguridad: modulos.seguridad,
      }));
      setRetoActivo(challenge.code);
      setIndice(0);
    },
    reset: () => { setBorrador(borradorInicial()); setRetoActivo(null); setIndice(0); },
  }), [borrador, indice, retoActivo]);

  return <BorradorContext.Provider value={value}>{children}</BorradorContext.Provider>;
}

export function useBorrador(): BorradorContextValue {
  const ctx = useContext(BorradorContext);
  if (!ctx) throw new Error("useBorrador debe usarse dentro de <BorradorProvider>");
  return ctx;
}
