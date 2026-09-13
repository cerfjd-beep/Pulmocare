"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { isActivePath } from "./navigation";
import { portals, portalPaths, portalLabels, type Access } from "@/modules/auth/access";
import { signOut } from "@/modules/auth/actions";
export function AccountShell({
  children,
  account,
}: {
  children: React.ReactNode;
  account: { email: string; access: Access | null } | null;
}) {
  const pathname = usePathname();
  const allowed = portals(account?.access ?? null);
  const navigation = [
    { href: "/", label: "Inicio" },
    ...allowed.map((p) => ({ href: portalPaths[p], label: portalLabels[p] })),
    ...(account
      ? [{ href: "/cuenta", label: "Mi cuenta" }]
      : [{ href: "/ingresar", label: "Ingresar / Registrarme" }]),
  ];
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Pulmocare - Inicio">
          <Brand />
        </Link>
        <p className="nav-caption">TU ESPACIO EN PULMOCARE</p>
        <nav aria-label="Navegación principal">
          {navigation.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={isActivePath(pathname, n.href) ? "nav-item active" : "nav-item"}
              aria-current={isActivePath(pathname, n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>Cuidamos de ti, en tu hogar.</strong>
          <p>Atención respiratoria con un enfoque humano.</p>
        </div>
        <div className="sidebar-footer">El Salvador · USD</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>{account?.access?.name ?? "Bienvenido a Pulmocare"}</span>
          {account ? (
            <form action={signOut}>
              <button className="text-button">Cerrar sesión</button>
            </form>
          ) : (
            <Link className="text-button" href="/ingresar">
              Iniciar sesión
            </Link>
          )}
        </header>
        <main id="contenido">{children}</main>
        <footer className="page-footer">
          <span>© Pulmocare · Terapia respiratoria domiciliar</span>
        </footer>
      </div>
    </>
  );
}
