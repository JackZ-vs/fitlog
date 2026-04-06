import WorkoutEditor from "@/components/WorkoutEditor";

export default async function WorkoutPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <WorkoutEditor date={date} />;
}
