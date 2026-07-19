"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBranding } from "@/lib/api";

type Branding = { logoUrl: string | null; logoLink: string | null };
const defaultBranding: Branding = { logoUrl: null, logoLink: null };

export function BrandHeader({ admin = false }: { admin?: boolean }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);

  useEffect(() => {
    getBranding().then(setBranding).catch(() => undefined);
    const update = (event: Event) => setBranding((current) => ({ ...current, ...(event as CustomEvent<Partial<Branding>>).detail }));
    window.addEventListener("branding-updated", update);
    return () => window.removeEventListener("branding-updated", update);
  }, []);

  const brandContent = branding.logoUrl
    ? <img src={branding.logoUrl} alt="MecDigital" />
    : <><span>Mec</span><strong>Digital</strong><i aria-hidden="true" /></>;
  const brandClass = `brand${branding.logoUrl ? " brand-image" : ""}`;

  return (
    <>
      <div className="top-stripe" />
      <header className="site-header">
        <div className="container header-inner">
          {branding.logoLink
            ? <a className={brandClass} href={branding.logoLink} aria-label="Acessar o site configurado para a marca">{brandContent}</a>
            : <Link className={brandClass} href="/" aria-label="MecDigital — página inicial">{brandContent}</Link>}
          <nav aria-label="Navegação principal">
            <Link href="/">Consulta</Link>
            <Link href="/acessibilidade">Acessibilidade</Link>
            {admin && <Link href="/admin">Administração</Link>}
          </nav>
        </div>
      </header>
    </>
  );
}
