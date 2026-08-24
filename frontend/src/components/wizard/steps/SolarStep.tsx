import { useBorrador } from "../../../state/BorradorContext";
import { SOLAR_FIELDS } from "../../../domain/moduleFields";
import { motivoSolar } from "../../../domain/wizard";
import { ModuloOpcional } from "../ModuloOpcional";

export function SolarStep() {
  const { borrador } = useBorrador();
  return (
    <ModuloOpcional
      modulo="solar"
      titulo="Control solar y térmico"
      intro="Controlar el sol es decidir cuánta luz entra y cuánto calor se queda. La orientación y el tamaño de la fachada mandan más que el color del vidrio."
      pregunta="¿El sol o el calor son un problema en este proyecto?"
      motivo={motivoSolar(borrador)}
      fields={SOLAR_FIELDS}
      omitido="Se omite el análisis solar y térmico. Si el asoleamiento resulta ser un tema, puedes volver a este paso."
      contradiccion="Señalaste el calor o el sol como uno de tus criterios. Si lo dejas en «No», el diagnóstico no evaluará control solar ni propondrá vidrios para ese problema."
    />
  );
}
