import BadgeLoader from "@/components/BadgeLoader";

export default function QuranLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <BadgeLoader size="page" label="Loading Quran..." />
    </div>
  );
}
