import test from "node:test";
import assert from "node:assert/strict";

/**
 * El envío real solo se puede probar contra el tenant de VITELSA. Lo que sí se
 * puede fijar aquí es lo que se le pide a Graph: de qué buzón sale, quién lo
 * recibe, que el informe viaje como adjunto y que quede copia en Enviados.
 * Un error en ese cuerpo no falla ruidosamente, manda un correo equivocado.
 */

process.env.GRAPH_TENANT_ID = "tenant-de-prueba";
process.env.GRAPH_CLIENT_ID = "cliente-de-prueba";
process.env.GRAPH_CLIENT_SECRET = "secreto-de-prueba";
process.env.GRAPH_SENDER = "glasslab@vitelsa.com.co";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "secreto-de-prueba-para-tests";

interface Llamada { url: string; body: any }

/** Sustituye fetch: devuelve un token y captura el sendMail sin salir a la red. */
function espiarFetch(): { llamadas: Llamada[]; restaurar: () => void } {
  const original = globalThis.fetch;
  const llamadas: Llamada[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    const u = String(url);
    llamadas.push({ url: u, body: init?.body });
    if (u.includes("login.microsoftonline.com")) {
      return new Response(JSON.stringify({ access_token: "token-falso", expires_in: 3600 }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  return { llamadas, restaurar: () => { globalThis.fetch = original; } };
}

const cargar = async () => (await import("./graphEmailService")).GraphEmailService;

test("el diagnóstico sale del buzón compartido, con copia e informe adjunto", async () => {
  const { llamadas, restaurar } = espiarFetch();
  try {
    const Servicio = await cargar();
    const resultado = await new Servicio().sendDiagnosis({
      leadId: "LEAD-1",
      to: "persona@ejemplo.com",
      copyTo: "informacion@vitelsa.com.co",
      summary: {},
      attachment: { filename: "informe.pdf", content: Buffer.from("%PDF-falso") },
    });

    const envio = llamadas.find((l) => l.url.includes("/sendMail"));
    assert.ok(envio, "no se llamó a sendMail");
    assert.match(envio.url, /users\/glasslab%40vitelsa\.com\.co\/sendMail$/);

    const cuerpo = JSON.parse(envio.body);
    assert.equal(cuerpo.saveToSentItems, true, "sin copia en Enviados del buzón");
    assert.equal(cuerpo.message.from.emailAddress.address, "glasslab@vitelsa.com.co");
    assert.equal(cuerpo.message.toRecipients[0].emailAddress.address, "persona@ejemplo.com");
    assert.equal(cuerpo.message.ccRecipients[0].emailAddress.address, "informacion@vitelsa.com.co");

    const adjunto = cuerpo.message.attachments[0];
    assert.equal(adjunto["@odata.type"], "#microsoft.graph.fileAttachment");
    assert.equal(adjunto.contentType, "application/pdf");
    assert.equal(Buffer.from(adjunto.contentBytes, "base64").toString(), "%PDF-falso");

    assert.equal(resultado.delivered, true);
    assert.equal(resultado.adapter, "graph");
  } finally {
    restaurar();
  }
});

test("el código de verificación va solo a la persona, sin copia", async () => {
  const { llamadas, restaurar } = espiarFetch();
  try {
    const Servicio = await cargar();
    await new Servicio().sendVerificationCode({
      to: "persona@ejemplo.com", code: "123456", expiresInMinutes: 10,
    });

    const cuerpo = JSON.parse(llamadas.find((l) => l.url.includes("/sendMail"))!.body);
    assert.equal(cuerpo.message.toRecipients.length, 1);
    assert.equal(cuerpo.message.ccRecipients, undefined, "el código nunca lleva copia");
    // El código va en el asunto para que se lea sin abrir el correo, pero el
    // cuerpo tiene que traerlo igual: hay clientes que recortan el asunto.
    assert.match(cuerpo.message.subject, /123456/);
    assert.match(cuerpo.message.body.content, /123456/);
  } finally {
    restaurar();
  }
});

test("un rechazo de Graph se reporta con su causa, no como éxito", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: any) => {
    if (String(url).includes("login.microsoftonline.com")) {
      return new Response(JSON.stringify({ access_token: "token-falso", expires_in: 3600 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({ error: { code: "ErrorAccessDenied", message: "Access denied" } }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const Servicio = await cargar();
    await assert.rejects(
      () => new Servicio().sendVerificationCode({ to: "a@b.com", code: "1", expiresInMinutes: 10 }),
      /ErrorAccessDenied/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
