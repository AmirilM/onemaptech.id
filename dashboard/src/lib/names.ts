export function greeting(
  date = new Date(),
  timeZone = "Asia/Jakarta",
): string {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(date),
  );
  if (h < 11) return "Good Morning";
  if (h < 15) return "Good Afternoon";
  if (h < 19) return "Good Evening";
  return "Good Night";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
