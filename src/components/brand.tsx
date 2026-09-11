import Image from "next/image";

interface BrandProps {
  variant?: "compact" | "full";
}

export function Brand({ variant = "compact" }: BrandProps) {
  return (
    <span className={`brand-lockup brand-lockup--${variant}`}>
      <Image
        className="brand-mark"
        src="/brand/pulmocare-lungs-green.png"
        alt=""
        width={variant === "full" ? 104 : 48}
        height={variant === "full" ? 104 : 48}
        sizes={variant === "full" ? "104px" : "48px"}
      />
      <span className="brand-type">
        <span className="brand-name">
          Pulmo<span>Care</span>
        </span>
        {variant === "full" && (
          <span className="brand-tagline">Servicios de terapia respiratoria</span>
        )}
      </span>
    </span>
  );
}
