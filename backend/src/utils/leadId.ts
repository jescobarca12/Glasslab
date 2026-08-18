/** Genera un identificador de lead con el formato del demo: GL-YYYYMMDD-#####. */
export function generarLeadId(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const fecha = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `GL-${fecha}-${rand}`;
}
