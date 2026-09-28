const collator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

function volumeMl(value: string): number | null {
  const match = /\b([0-9]+(?:[.,][0-9]+)?)\s*(ml|l)\b/i.exec(value);
  if (!match) return null;
  return (
    Number(match[1].replace(",", ".")) *
    (match[2].toLowerCase() === "l" ? 1000 : 1)
  );
}

export function sortProductVariants<
  T extends {
    name: string;
    presentation: string | null;
    weight: { toString(): string } | null;
  },
>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    if (a.weight !== null && b.weight !== null) {
      const difference = Number(a.weight) - Number(b.weight);
      if (difference) return difference;
    }
    const volumeA = volumeMl(a.presentation ?? a.name);
    const volumeB = volumeMl(b.presentation ?? b.name);
    if (volumeA !== null && volumeB !== null && volumeA !== volumeB)
      return volumeA - volumeB;
    return collator.compare(a.presentation ?? a.name, b.presentation ?? b.name);
  });
}
