import Link from "next/link";
import Image from "next/image";
import { Brand } from "@/components/brand";
import {
  Activity,
  ArrowRight,
  Check,
  Clock3,
  Heart,
  House,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wind,
  BookOpen,
  Droplets,
  MoveUpRight,
} from "lucide-react";
import { services, money } from "@/modules/services/catalog";
import { BusinessForm } from "@/modules/business/form";
import { getSupabaseCatalog } from "../integrations/supabase/catalog";

const icons = [Stethoscope, Wind, Activity, Droplets, Heart, BookOpen];

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await getSupabaseCatalog();
  const listedServices =
    catalog.status === "ready"
      ? catalog.services.map((service) => ({
        id: service.code,
        name: service.name,
        description: service.description,
        minutes: service.durationMinutes,
        cents: service.amountCents,
      }))
      : catalog.status === "not_configured"
        ? services
        : [];
  return (
    <div className="home-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BIENVENIDO A PULMOCARE</p>
          <h1>Respirar mejor empieza aquí.</h1>
          <p>Cuidado profesional, en la comodidad de tu hogar.</p>
        </div>
        <span className="location-pill">
          <House size={15} /> Atención a domicilio
        </span>
      </div>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span className="status-dot" /> CERCA DE TI
          </span>
          <h2>
            Tu salud respiratoria,
            <br />
            en buenas manos.
          </h2>
          <p>
            Te acompañamos en cada respiro. Solicita atención y encuentra el cuidado que necesitas,
            con orientación profesional desde el primer paso.
          </p>
          <Link className="button primary" href="/solicitar">
            Solicitar atención <ArrowRight size={18} />
          </Link>
          <div className="hero-benefits">
            <span>
              <Check size={15} /> Evaluación inicial
            </span>
            <span>
              <Check size={15} /> Atención personalizada
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <Image
            className="lung-art"
            src="/brand/pulmocare-lungs-green.png"
            alt=""
            width={285}
            height={285}
            sizes="(max-width: 1100px) 235px, 285px"
          />
          <div className="art-tag">
            <span className="small-icon">
              <Heart size={20} />
            </span>
            <div>
              <strong>Cuidado que te acompaña</strong>
              <small>En cada etapa de tu recuperación</small>
            </div>
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <span>
          <ShieldCheck /> Revisión profesional
        </span>
        <span>
          <House /> En tu hogar
        </span>
        <span>
          <Clock3 /> Seguimiento continuo
        </span>
        <span>
          <Heart /> Trato humano
        </span>
      </div>

      <section id="servicios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CUIDADO A TU MEDIDA</p>
            <h2>¿Cómo podemos ayudarte?</h2>
          </div>
          <span>
            {catalog.status === "ready"
              ? "Servicios disponibles · USD"
              : "Precios orientativos · USD"}
          </span>
        </div>
        <div className="service-grid">
          {listedServices.map((service, index) => {
            const iconIndex = services.findIndex((item) => item.id === service.id);
            const Icon = icons[iconIndex] ?? Stethoscope;
            return (
              <Link
                className="service-card"
                key={service.id}
                href={`/solicitar?servicio=${encodeURIComponent(service.id)}`}
              >
                <div className="service-top">
                  <span className={`service-icon tone-${index}`}>
                    <Icon />
                  </span>
                  <MoveUpRight size={18} />
                </div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-bottom">
                  <span>
                    {service.cents === null ? (
                      "Precio por confirmar"
                    ) : (
                      <>
                        Desde <strong>{money(service.cents)}</strong>
                      </>
                    )}
                  </span>
                  <span>
                    <Clock3 size={13} /> {service.minutes} min
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        {listedServices.length === 0 && (
          <p className="notice" role="status">
            {catalog.status === "ready"
              ? "El catálogo de servicios se está preparando."
              : "No pudimos cargar los servicios. Intenta nuevamente más tarde."}
          </p>
        )}
        <p className="fine-print">
          El servicio se define tras revisión profesional. Traslado según zona.
        </p>
      </section>

      <section className="steps-section">
        <div>
          <p className="eyebrow">SENCILLO, DE PRINCIPIO A FIN</p>
          <h2>Nosotros te acompañamos.</h2>
          <p>Tú das el primer paso. Juntos coordinamos lo demás.</p>
        </div>
        <div className="steps-grid">
          {[
            ["01", "Cuéntanos qué necesitas", "Completa una breve solicitud de atención."],
            ["02", "Revisamos tu caso", "Un profesional orienta el siguiente paso."],
            ["03", "Recibe atención en casa", "Coordinamos tu visita y seguimiento."],
          ].map(([number, title, description]) => (
            <div key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="bottom-grid">
        <section id="nosotros" className="about-card">
          <Brand variant="full" />
          <span className="eyebrow">PERSONAS QUE CUIDAN PERSONAS</span>
          <h2>Conoce a Pulmocare</h2>
          <p>
            Una iniciativa de <strong>Lic. Miguel Guzmán</strong>, terapista respiratorio y docente
            universitario, enfocada en acercar el cuidado respiratorio al hogar.
          </p>
          <div className="profile-line">
            <span className="profile-avatar">MG</span>
            <div>
              <strong>Atención con enfoque humano</strong>
              <small>Experiencia clínica, educación y acompañamiento</small>
            </div>
            <ShieldCheck size={25} />
          </div>
        </section>
        <section className="business-card">
          <Sparkles size={24} />
          <p className="eyebrow">PULMOCARE PARA EMPRESAS</p>
          <h2>
            Equipos preparados.
            <br />
            Entornos más saludables.
          </h2>
          <p>RCP, primeros auxilios, evaluación respiratoria y prevención.</p>
          <BusinessForm />
        </section>
      </div>
    </div>
  );
}
