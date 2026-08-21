/**
 * Roles del panel administrativo.
 *
 *  - admin : acceso completo (leads + configuración del motor).
 *  - viewer: solo consulta de leads; no puede tocar preguntas, reglas ni ciudades.
 *
 * El rol viaja en el JWT, pero quien manda es el backend: cada ruta de escritura
 * exige `admin` aunque la interfaz esconda la pestaña.
 */
export const ROLES = {
  ADMIN: "admin",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function esRolValido(valor: string): valor is Role {
  return Object.values(ROLES).includes(valor as Role);
}
