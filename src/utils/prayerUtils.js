export const PRAYERS = [
  { key: 'Fajr', name: 'الفجر', icon: '🌅' },
  { key: 'Dhuhr', name: 'الظهر', icon: '☀️' },
  { key: 'Asr', name: 'العصر', icon: '🌤️' },
  { key: 'Maghrib', name: 'المغرب', icon: '🌇' },
  { key: 'Isha', name: 'العشاء', icon: '🌙' },
];

export function cleanPrayerTime(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getPrayerDateTime(time, referenceDate = new Date(), dayOffset = 0) {
  const cleaned = cleanPrayerTime(time);
  if (!cleaned) return null;
  const [hours, minutes] = cleaned.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function getPrayerState(timings, now = new Date()) {
  if (!timings) return null;
  const prayers = PRAYERS.map((prayer) => ({
    ...prayer,
    time: cleanPrayerTime(timings[prayer.key]),
  }));
  if (prayers.some((prayer) => !prayer.time)) return null;

  const today = prayers.map((prayer) => ({
    ...prayer,
    dateTime: getPrayerDateTime(prayer.time, now),
  }));
  const nextToday = today.find((prayer) => prayer.dateTime > now);

  if (nextToday) {
    const nextIndex = today.findIndex((prayer) => prayer.key === nextToday.key);
    const previous = nextIndex > 0
      ? today[nextIndex - 1]
      : { ...today[today.length - 1], dateTime: getPrayerDateTime(today[today.length - 1].time, now, -1) };
    const duration = nextToday.dateTime.getTime() - previous.dateTime.getTime();
    const elapsed = now.getTime() - previous.dateTime.getTime();
    return {
      prayers: today,
      current: previous,
      next: nextToday,
      nextDateTime: nextToday.dateTime,
      previousDateTime: previous.dateTime,
      progress: Math.max(0, Math.min(100, duration > 0 ? (elapsed / duration) * 100 : 0)),
    };
  }

  const previous = today[today.length - 1];
  const next = { ...today[0], dateTime: getPrayerDateTime(today[0].time, now, 1) };
  const duration = next.dateTime.getTime() - previous.dateTime.getTime();
  const elapsed = now.getTime() - previous.dateTime.getTime();
  return {
    prayers: today,
    current: previous,
    next,
    nextDateTime: next.dateTime,
    previousDateTime: previous.dateTime,
    progress: Math.max(0, Math.min(100, duration > 0 ? (elapsed / duration) * 100 : 0)),
  };
}

export function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':');
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
