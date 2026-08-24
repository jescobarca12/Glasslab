/**
 * Siembra el portafolio comercial por criterio desde portafolio.json.
 *
 *   npm run db:seed:portafolio
 */
import fs from "fs";
import path from "path";
import { pool, closePool } from "../src/db/pool";

interface Criterio {
  id: string; label: string; requisito: string; familiaVitelsa: string; proceso: string;
  indicador: string; solucionEstandar: string; solucionAltoDesempeno: string; orden: number;
  certificaciones: string | null; incentivos: string | null; derivado: boolean;
}

async function run(): Promise<void> {
  const archivo = path.join(__dirname, "..", "src", "db", "seed", "data", "portafolio.json");
  const { criterios } = JSON.parse(fs.readFileSync(archivo, "utf8")) as { criterios: Criterio[] };

  for (const c of criterios) {
    await pool.query(
      `INSERT INTO criterio_portafolio (criterio, label, requisito, familia_vitelsa, proceso,
                                        indicador, solucion_estandar, solucion_alto_desempeno, orden,
                                        certificaciones, incentivos, derivado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (criterio) DO UPDATE SET
         label=EXCLUDED.label, requisito=EXCLUDED.requisito, familia_vitelsa=EXCLUDED.familia_vitelsa,
         proceso=EXCLUDED.proceso, indicador=EXCLUDED.indicador,
         solucion_estandar=EXCLUDED.solucion_estandar,
         solucion_alto_desempeno=EXCLUDED.solucion_alto_desempeno, orden=EXCLUDED.orden,
         certificaciones=EXCLUDED.certificaciones, incentivos=EXCLUDED.incentivos,
         derivado=EXCLUDED.derivado`,
      [c.id, c.label, c.requisito, c.familiaVitelsa, c.proceso, c.indicador,
        c.solucionEstandar, c.solucionAltoDesempeno, c.orden,
        c.certificaciones, c.incentivos, c.derivado],
    );
  }
  console.log(`✓ criterio_portafolio: ${criterios.length} criterios`);
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
