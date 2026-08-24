import { useBorrador } from "../../../state/BorradorContext";
import { ACUSTICO_FIELDS } from "../../../domain/moduleFields";
import { motivoAcustico } from "../../../domain/wizard";
import { ModuloOpcional } from "../ModuloOpcional";

export function AcusticoStep() {
  const { borrador } = useBorrador();
  return (
    <ModuloOpcional
      modulo="acustico"
      titulo="Acústica"
      intro="El vidrio puede bajar el ruido que entra, pero la composición que lo logra depende de qué suena, cuánto y a qué distancia."
      pregunta="¿El ruido exterior es un problema en este proyecto?"
      motivo={motivoAcustico(borrador)}
      fields={ACUSTICO_FIELDS}
      omitido="Se omite el análisis acústico. Si más adelante aparece el ruido, puedes volver a este paso."
      contradiccion="Señalaste el ruido como uno de tus criterios. Si lo dejas en «No», el diagnóstico no evaluará acústica ni propondrá vidrios para ese problema."
    />
  );
}
