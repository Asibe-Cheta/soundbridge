export function isWithinTimeWindow(startHour: number, endHour: number, timezone = 'UTC'): boolean {
  try {
    const now = new Date();
    const currentHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }));
    if (startHour <= endHour) return currentHour >= startHour && currentHour <= endHour;
    return currentHour >= startHour || currentHour <= endHour;
  } catch {
    return true;
  }
}
