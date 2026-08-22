import { useEffect } from "react";
import { useBorrador } from "../../../state/BorradorContext";
import { GEOMETRIA_FIELDS } from "../../../domain/moduleFields";
import { ModuleForm } from "../ModuleForm";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Geometría del proyecto. Dos comodidades sobre el formulario:
 * el área de cada unidad se calcula con ancho x alto, y el total del proyecto
 * se deduce multiplicando por la cantidad de unidades.
 */
export function GeometriaStep() {
  const { borrador, setCampo } = useBorrador();
  const g = borrador.geometria;

  const ancho = Number(g["ancho"]) || 0;
  const alto = Number(g["alto"]) || 0;
  const area = Number(g["area"]) || 0;
  const unidades = Number(g["modulos"]) || 0;
  const total = area > 0 && unidades > 0 ? round2(area * unidades) : 0;

  // Con ancho y alto, el área se calcula sola; el usuario puede sobrescribirla.
  useEffect(() => {
    if (ancho > 0 && alto > 0) {
      const calculada = round2(ancho * alto);
      if (calculada !== area) setCampo("geometria", "area", calculada);
    }
    // Solo cuando cambian las dimensiones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancho, alto]);

  return (
    <>
      <h2>Geometría</h2>
      <p className="lead">
        Dimensiones y cantidad. Con el ancho y el alto calculamos el área de cada unidad, y con las
        unidades, el total del proyecto.
      </p>

      <ModuleForm modulo="geometria" fields={GEOMETRIA_FIELDS} />

      <div className="total-proyecto">
        <span>Total del proyecto</span>
        <strong>{total > 0 ? `${total} m²` : "—"}</strong>
        {total === 0 && <span className="hint">Indica la magnitud y la cantidad de unidades.</span>}
      </div>
    </>
  );
}
