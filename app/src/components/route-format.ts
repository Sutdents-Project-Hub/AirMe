export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)} 公尺`;
  const precision = distanceMeters >= 10_000 ? 1 : 2;
  return `${(distanceMeters / 1_000).toFixed(precision)} 公里`;
}

export function formatDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  if (minutes < 60) return `${minutes} 分鐘`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours} 小時` : `${hours} 小時 ${remainingMinutes} 分鐘`;
}
