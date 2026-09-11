"use client";

import Link from "next/link";
import { Brand } from "./brand";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Heart } from "lucide-react";
import { patientNavigation, staffNavigation, isStaffPath, isActivePath } from "./navigation";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const staff = isStaffPath(pathname);
  const navigation = staff ? staffNavigation : patientNavigation;
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Link
          href={staff ? "/admin" : "/"}
          className="brand"
          aria-label={staff ? "PulmoCare - Administración" : "PulmoCare - Inicio"}
        >
          <Brand />
        </Link>
        <p className="nav-caption">{staff ? "GESTIÓN DE PULMOCARE" : "TU BIENESTAR, MÁS CERCA"}</p>
        <nav aria-label={staff ? "Navegación del personal" : "Navegación del paciente"}>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActivePath(pathname, href) ? "nav-item active" : "nav-item"}
              aria-current={isActivePath(pathname, href) ? "page" : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="small-icon">
            <Heart size={20} />
          </div>
          <strong>
            Cuidamos de ti,
            <br />
            en tu hogar.
          </strong>
          <p>Atención respiratoria con un enfoque humano.</p>
          <Link href="/#nosotros">
            Conoce Pulmocare <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" /> El Salvador <span>· USD</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>{staff ? "Espacio del personal" : "Espacio del paciente"}</span>
          <div>
            <span className="demo-badge">Prototipo interactivo</span>
            <Link className="text-button" href={staff ? "/" : "/admin"}>
              {staff ? "Demo: pacientes" : "Demo: administración"}
            </Link>
          </div>
        </header>
        <main id="contenido">{children}</main>
        <footer className="page-footer">
          <span>© Pulmocare · Terapia respiratoria domiciliar</span>
          <span>Demostración: usa únicamente datos ficticios.</span>
        </footer>
      </div>
    </>
  );
}
