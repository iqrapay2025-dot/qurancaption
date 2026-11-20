import BadgeLoader from "@/components/BadgeLoader";

export default function SurahLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <BadgeLoader size="page" label="Loading Surah..." />
    </div>
  );
}
