import { RequestPage } from "@/modules/administration/request-page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequestPage id={(await params).id} portal="admin" />;
}
