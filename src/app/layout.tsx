import type { Metadata } from "next";
import { DemoProvider } from "@/modules/demo/provider";
import { AccountShell } from "@/components/account-shell";
import { getAccount } from "@/modules/auth/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulmocare · Respira con tranquilidad",
  description: "Prototipo de atención respiratoria domiciliaria en El Salvador.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const account = await getAccount();
  return (
    <html lang="es">
      <body>
        <DemoProvider>
          <AccountShell account={account}>{children}</AccountShell>
        </DemoProvider>
      </body>
    </html>
  );
}
