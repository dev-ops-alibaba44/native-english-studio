// A single large, faint brush-style character behind a section's content.
// Purely decorative/atmospheric — aria-hidden, and the character itself is
// chosen to mean something about the section it sits behind (旅 = journey,
// 心 = heart/care, 謝 = gratitude), not just a generic ornament.

export function CalligraphyMark({
  char,
  className = "",
}: {
  char: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none font-calligraphy text-brand/5 ${className}`}
    >
      {char}
    </span>
  );
}
