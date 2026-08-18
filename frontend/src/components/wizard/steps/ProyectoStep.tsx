import { useBorrador } from "../../../state/BorradorContext";
import { useLabel } from "../../../state/LabelsContext";
import type { City } from "../../../api/types";
import { SelectField, TextField } from "../../ui/Fields";

const ETAPAS = [
  { value: "idea", label: "Idea / anteproyecto" },
  { value: "diseño", label: "Diseño" },
  { value: "construccion", label: "Construcción" },
  { value: "remodelacion", label: "Remodelación" },
];

export function ProyectoStep({ cities }: { cities: City[] }) {
  const { borrador, setProyectoInfo } = useBorrador();
  const label = useLabel();
  const info = borrador.proyecto;
  const ciudad = cities.find((c) => c.code === info.ciudadId);

  return (
    <>
      <h2>El proyecto</h2>
      <p className="lead">La ciudad determina clima, zona sísmica y contexto de ruido que alimentan el diagnóstico.</p>
      <div className="grid-2">
        <TextField label={label("registro", "nombre", "Nombre del proyecto")} value={info.nombre} onChange={(v) => setProyectoInfo({ nombre: v })} />
        <SelectField
          label={label("registro", "ciudad", "Ciudad")} value={info.ciudadId}
          onChange={(v) => setProyectoInfo({ ciudadId: v })}
          options={cities.map((c) => ({ value: c.code, label: `${c.nombre} (${c.departamento})` }))}
        />
        <TextField label={label("registro", "tipoProyecto", "Tipo de proyecto")} hint="ej. vivienda, oficinas, comercio" value={info.tipoProyecto} onChange={(v) => setProyectoInfo({ tipoProyecto: v })} />
        <SelectField label={label("registro", "etapa", "Etapa del proyecto")} value={info.etapa} onChange={(v) => setProyectoInfo({ etapa: v })} options={ETAPAS} />
      </div>

      {ciudad && (
        <div className="callout">
          <strong>{ciudad.nombre}:</strong> clima {ciudad.climaClase ?? "—"} · zona sísmica {ciudad.zonaSismicaNsr10 ?? "—"} (NSR-10)
          {ciudad.corredoresRuido.length > 0 && ` · ${ciudad.corredoresRuido.length} corredor(es) de ruido registrados`}
        </div>
      )}
    </>
  );
}
