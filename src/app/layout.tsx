import type { Metadata } from "next";
import { DemoProvider } from "@/modules/demo/provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulmocare · Respira con tranquilidad",
  description: "Prototipo de atención respiratoria domiciliaria en El Salvador.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <DemoProvider>
          <Shell>{children}</Shell>
        </DemoProvider>
      </body>
    </html>
  );
}
