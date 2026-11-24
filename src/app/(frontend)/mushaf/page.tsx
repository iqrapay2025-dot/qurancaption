"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLibrary } from "@/lib/library/storage";
import { Loader2 } from "lucide-react";

export default function MushafIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const lib = getLibrary();
    if (lib.reading && lib.reading.page && lib.reading.page >= 1 && lib.reading.page <= 604) {
      router.replace(`/mushaf/${lib.reading.page}`);
    } else {
      router.replace("/mushaf/1");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
}
