/**
 * Helper to compute estimated memorization time and a suggested pace name
 * based on any custom line count.
 */
export function getPaceEstimate(lines: number): { timeEstimate: string; defaultPaceName: string } {
  const safeLines = Math.max(1, Math.round(lines));

  let defaultPaceName = "Custom Pace";
  if (safeLines <= 2) defaultPaceName = "Gentle Starter Pace";
  else if (safeLines <= 4) defaultPaceName = "Gentle Pace";
  else if (safeLines <= 6) defaultPaceName = "Balanced Pace";
  else if (safeLines <= 8) defaultPaceName = "Standard Pace (Half Page)";
  else if (safeLines <= 14) defaultPaceName = "Intensive Pace";
  else if (safeLines === 15) defaultPaceName = "Full Page Daily";
  else defaultPaceName = "Accelerated Pace";

  // Standard Quranic memorization: ~2.2 to 3.4 minutes per line for deep retention
  const minMins = Math.max(3, Math.round(safeLines * 2.2));
  const maxMins = Math.max(5, Math.round(safeLines * 3.4));
  const timeEstimate = `~${minMins}–${maxMins} mins`;

  return { timeEstimate, defaultPaceName };
}
