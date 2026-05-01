import { ItemDetailClient } from "@/features/items/item-detail-client";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ItemDetailClient itemId={id} />;
}
