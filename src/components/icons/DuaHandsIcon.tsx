export function DuaHandsIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-hidden="true"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/icons/dua-hands.png)",
        maskImage: "url(/icons/dua-hands.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
