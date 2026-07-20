"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBranding } from "@/lib/api";

type Branding = { logoUrl: string | null; logoLink: string | null };
const defaultBranding: Branding = { logoUrl: null, logoLink: null };

const externalLinks = [
  ["Simplifique", "https://www.simplifique.gov.br/"],
  ["Participe", "https://brasilparticipativo.presidencia.gov.br/"],
  ["Acesso à informação", "https://informabr.cgu.gov.br/"],
  ["Legislação", "https://www4.planalto.gov.br/legislacao"],
  ["Canais", "https://www.gov.br/pt-br/canais-do-executivo-federal"]
] as const;

export function BrandHeader({ admin = false }: { admin?: boolean }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getBranding().then(setBranding).catch(() => undefined);
    const update = (event: Event) => setBranding((current) => ({ ...current, ...(event as CustomEvent<Partial<Branding>>).detail }));
    window.addEventListener("branding-updated", update);
    return () => window.removeEventListener("branding-updated", update);
  }, []);

  const logo = branding.logoUrl ? <img src={branding.logoUrl} alt="MecDigital" /> : null;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand-slot">
          {logo && (branding.logoLink
            ? <a className="brand brand-image" href={branding.logoLink} aria-label="Acessar o site configurado para a marca">{logo}</a>
            : <Link className="brand brand-image" href="/registro/consulta" aria-label="MecDigital — página inicial">{logo}</Link>)}
        </div>
        <div className="header-actions">
          <button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true" className="menu-toggle-lines"><i /><i /><i /></span>
            <span>{menuOpen ? "Fechar menu" : "Abrir menu"}</span>
          </button>
          <div id="site-menu" className="site-menu" hidden={!menuOpen}>
            <nav className="external-menu" aria-label="Links de serviços públicos">
              {externalLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
            </nav>
            <nav className="local-menu" aria-label="Navegação principal">
              <Link href="/registro/consulta" onClick={() => setMenuOpen(false)}>Consulta</Link>
              {admin && <Link href="/admin" onClick={() => setMenuOpen(false)}>Administração</Link>}
            </nav>
          </div>
        </div>
      </div>
      <Link className="accessibility-float" href="/acessibilidade" aria-label="Acessibilidade">
        <img src="/accessibility-icon.svg" alt="" aria-hidden="true" />
      </Link>
    </header>
  );
}
