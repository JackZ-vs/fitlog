import NutritionEditor from "@/components/NutritionEditor";

export default async function NutritionPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <NutritionEditor date={date} />;
}
