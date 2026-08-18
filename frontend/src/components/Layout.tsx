import type { ReactNode } from "react";

export function Layout({ children, headerRight }: { children: ReactNode; headerRight?: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-logo" role="img" aria-label="VITELSA — Vidrio de Seguridad" />
            <span className="brand-divider" aria-hidden="true" />
            <div className="brand-text">
              <strong className="glasslab">GlassLab</strong>
              <div className="tagline">Diagnóstico de vidrio arquitectónico</div>
            </div>
          </div>
          {headerRight && <div className="header-right">{headerRight}</div>}
        </div>
      </header>
      <main className="site-main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
