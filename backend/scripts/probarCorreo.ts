/**
 * Prueba el envío de correo con el proveedor configurado, sin tocar la base de
 * datos ni crear ningún lead.
 *
 *   npm run email:probar -- alguien@dominio.com
 *
 * Sirve para el estreno del buzón de VITELSA: con EMAIL_PROVIDER=graph y las
 * credenciales de Entra ID puestas, dice si el envío sale de verdad y, cuando
 * falla, por qué —permiso sin consentimiento, secreto vencido, política de
 * acceso que no incluye el buzón—, que es justo lo que no se ve desde fuera.
 */
import "dotenv/config";
import { emailService } from "../src/integrations";
import { env } from "../src/config/env";

async function main(): Promise<void> {
  const destino = process.argv[2];
  if (!destino || !destino.includes("@")) {
    console.error("Uso: npm run email:probar -- alguien@dominio.com");
    process.exit(1);
  }

  console.log(`Proveedor: ${env.integrations.emailProvider}`);
  if (env.integrations.emailProvider === "graph") {
    console.log(`Buzón:     ${env.integrations.graph.sender}`);
    console.log(`Tenant:    ${env.integrations.graph.tenantId || "(sin definir)"}`);
  }
  console.log(`Destino:   ${destino}\n`);

  const entrega = await emailService.sendVerificationCode({
    to: destino,
    code: "000000",
    userName: "Prueba de configuración",
    expiresInMinutes: 10,
  });
  console.log(entrega);
  console.log(
    entrega.delivered
      ? "\n✓ Entregado. Revisa la bandeja del destino y la carpeta Enviados del buzón."
      : "\n· No se entregó de verdad: el proveedor configurado es de relleno.",
  );
}

main().catch((e: unknown) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
