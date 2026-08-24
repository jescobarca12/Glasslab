import { useEffect } from "react";
import { useBorrador } from "../../../state/BorradorContext";
import { GEOMETRIA_FIELDS } from "../../../domain/moduleFields";
import { ModuleForm } from "../ModuleForm";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Geometría del proyecto.
 *
 * Lo obligatorio es el total en metros cuadrados. Lo demás ayuda pero no
 * detiene: con ancho y alto se calcula el área de cada unidad, y con el área y
 * la cantidad se sugiere el total, que el usuario puede corregir.
 */
export function GeometriaStep() {
  const { borrador, setCampo } = useBorrador();
  const g = borrador.geometria;

  const ancho = Number(g["ancho"]) || 0;
  const alto = Number(g["alto"]) || 0;
  const area = Number(g["area"]) || 0;
  const unidades = Number(g["modulos"]) || 0;
  const total = Number(g["areaTotal"]) || 0;

  // Con ancho y alto, el área de la unidad se calcula sola.
  useEffect(() => {
    if (ancho > 0 && alto > 0) {
      const calculada = round2(ancho * alto);
      if (calculada !== area) setCampo("geometria", "area", calculada);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancho, alto]);

  // Con área y unidades se propone el total, solo mientras esté vacío: si la
  // persona escribió el suyo, manda el suyo.
  useEffect(() => {
    if (area > 0 && unidades > 0 && total === 0) {
      setCampo("geometria", "areaTotal", round2(area * unidades));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, unidades]);

  const sugerido = area > 0 && unidades > 0 ? round2(area * unidades) : 0;

  return (
    <>
      <h2>Geometría</h2>
      <p className="lead">
        Con el total del proyecto basta para seguir. Si conoces las dimensiones de cada unidad,
        el diagnóstico afina el espesor: depende del tamaño del paño, no de cuántos haya.
      </p>

      <ModuleForm modulo="geometria" fields={GEOMETRIA_FIELDS} />

      {sugerido > 0 && total !== sugerido && (
        <p className="hint">
          Por área y unidades, el total daría {sugerido} m².{" "}
          <button
            type="button" className="enlace"
            onClick={() => setCampo("geometria", "areaTotal", sugerido)}
          >
            Usar ese valor
          </button>
        </p>
      )}
      {total === 0 && (
        <p className="hint">Indica el total del proyecto para continuar.</p>
      )}
    </>
  );
}
