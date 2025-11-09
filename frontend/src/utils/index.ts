import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export function formatDuration(ms: number): string {
  const dur = dayjs.duration(ms);
  const hours = dur.hours();
  const minutes = dur.minutes();
  const seconds = dur.seconds();

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
