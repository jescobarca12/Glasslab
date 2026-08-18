import { useBorrador } from "../../state/BorradorContext";
import { useLabel } from "../../state/LabelsContext";
import type { Campos } from "../../domain/borrador";
import type { FieldDef } from "../../domain/moduleFields";
import { CheckField, NumberField, SelectField, TextField } from "../ui/Fields";

type ModuloConCampos = "geometria" | "acustico" | "solar" | "condensacion" | "seguridad";

/** Renderiza los campos de un módulo a partir de su configuración declarativa. */
export function ModuleForm({ modulo, fields }: { modulo: ModuloConCampos; fields: FieldDef[] }) {
  const { borrador, setCampo } = useBorrador();
  const label = useLabel();
  const campos = borrador[modulo] as Campos;

  const visibles = fields.filter((f) => !f.showIf || f.showIf(campos));

  return (
    <div className="grid-2">
      {visibles.map((f) => {
        const raw = campos[f.campo];
        const etiqueta = label(modulo, f.campo, f.label);
        if (f.type === "check") {
          return (
            <CheckField
              key={f.campo}
              label={etiqueta}
              checked={raw === true}
              onChange={(v) => setCampo(modulo, f.campo, v)}
            />
          );
        }
        if (f.type === "number") {
          return (
            <NumberField
              key={f.campo}
              label={etiqueta} hint={f.hint} min={f.min} max={f.max}
              value={typeof raw === "number" ? raw : ""}
              onChange={(v) => setCampo(modulo, f.campo, v === "" ? undefined : v)}
            />
          );
        }
        if (f.type === "select") {
          return (
            <SelectField
              key={f.campo}
              label={etiqueta} hint={f.hint} options={f.options ?? []}
              value={typeof raw === "string" ? raw : ""}
              onChange={(v) => setCampo(modulo, f.campo, v === "" ? undefined : v)}
            />
          );
        }
        return (
          <TextField
            key={f.campo}
            label={etiqueta} hint={f.hint}
            value={typeof raw === "string" ? raw : ""}
            onChange={(v) => setCampo(modulo, f.campo, v === "" ? undefined : v)}
          />
        );
      })}
    </div>
  );
}
