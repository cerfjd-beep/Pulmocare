import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortal } from "@/modules/auth/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { PriceForm, DiscountForm } from "@/modules/administration/pricing-forms";
export default async function PricesPage() {
  const account = await requirePortal("admin");
  if (!account.access?.roles.some((r) => ["operations_admin", "billing_admin"].includes(r)))
    redirect("/admin");
  const client = await createSupabaseServerClient();
  const [prices, discount] = await Promise.all([
    client.rpc("list_service_prices"),
    client.rpc("get_nebulization_discount"),
  ]);
  return (
    <div className="inner-page">
      <Link href="/admin">Volver a administración</Link>
      <h1>Precios de servicios</h1>
      <p>
        Publica tarifas en USD por sesión o etapa. Los cambios se aplican a nuevas cotizaciones; no
        modifican cobros ni acuerdos anteriores.
      </p>
      {prices.error || discount.error ? (
        <p className="notice">
          Para administrar los precios, aplica la actualización 07-precios-servicios.sql en
          Supabase. No se ha cambiado ninguna tarifa.
        </p>
      ) : (
        <>
          {!discount.data?.length && (
            <p className="notice">
              No se pudo consultar la configuración del descuento. Revisa la actualización
              08-acceso-descuentos.sql en Supabase antes de cotizar el tratamiento de siete días.
            </p>
          )}
          {discount.data?.[0] && (
            <DiscountForm
              key={
                discount.data[0].revision +
                prices.data?.find((p) => p.code === "nebulization")?.price_id
              }
              percent={discount.data[0].percent}
              revision={discount.data[0].revision}
              unitPrice={prices.data?.find((p) => p.code === "nebulization")?.amount_cents ?? null}
            />
          )}
          <div className="portal-grid">
            {prices.data?.map((item) => (
              <PriceForm key={item.service_id + item.price_id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
