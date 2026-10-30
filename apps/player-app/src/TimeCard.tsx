import { MONTHS, WEEKDAYS, dateWords, daysInMonth, timeWords, wallClock, type WallClock } from "@socialstory/core";

/**
 * A calendar with the day circled and a clock showing the time, drawn in
 * code rather than by the image model, so the date and the clock hands are
 * always exactly right. Words underneath say the same thing.
 */
export function TimeCard({ when }: { when: string }) {
  const t = wallClock(when);
  if (!t) return null;
  return (
    <figure className="time-card" aria-label={`${dateWords(t)}, ${timeWords(t)}`}>
      <div className="time-pictures" aria-hidden="true">
        <Calendar t={t} />
        <Clock t={t} />
      </div>
      <figcaption>
        <span className="time-date">{dateWords(t)}</span>
        <span className="time-time">{timeWords(t)}</span>
      </figcaption>
    </figure>
  );
}

function Calendar({ t }: { t: WallClock }) {
  const first = new Date(Date.UTC(t.year, t.month - 1, 1)).getUTCDay();
  const days = daysInMonth(t.year, t.month);
  const rows = Math.ceil((first + days) / 7);
  const cell = 30;
  const top = 64;
  const width = cell * 7 + 20;
  const height = top + rows * cell + 12;
  return (
    <svg className="calendar" viewBox={`0 0 ${width} ${height}`} role="img">
      <rect x="1" y="1" width={width - 2} height={height - 2} rx="14" fill="#fbfaf6" stroke="#ddd6c8" strokeWidth="2" />
      <rect x="1" y="1" width={width - 2} height="34" rx="14" fill="#8fb3a6" />
      <rect x="1" y="20" width={width - 2} height="15" fill="#8fb3a6" />
      <text x={width / 2} y="25" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff">
        {MONTHS[t.month - 1]}
      </text>
      {WEEKDAYS.map((d, i) => (
        <text key={d} x={10 + cell * i + cell / 2} y="54" textAnchor="middle" fontSize="11" fill="#6b7478">
          {d.slice(0, 2)}
        </text>
      ))}
      {Array.from({ length: days }, (_, i) => {
        const slot = first + i;
        const x = 10 + (slot % 7) * cell + cell / 2;
        const y = top + Math.floor(slot / 7) * cell + cell / 2;
        const isDay = i + 1 === t.day;
        return (
          <g key={i}>
            {isDay && <circle cx={x} cy={y} r="13.5" fill="none" stroke="#c0604a" strokeWidth="3" />}
            <text
              x={x}
              y={y + 4.5}
              textAnchor="middle"
              fontSize="13"
              fontWeight={isDay ? 700 : 400}
              fill={isDay ? "#2b3236" : "#8a9195"}
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Clock({ t }: { t: WallClock }) {
  const minuteAngle = t.minute * 6;
  const hourAngle = ((t.hour % 12) + t.minute / 60) * 30;
  const hand = (angle: number, length: number, width: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return (
      <line
        x1="100"
        y1="100"
        x2={100 + Math.cos(rad) * length}
        y2={100 + Math.sin(rad) * length}
        stroke="#2b3236"
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };
  return (
    <svg className="clock" viewBox="0 0 200 200" role="img">
      <circle cx="100" cy="100" r="94" fill="#fbfaf6" stroke="#ddd6c8" strokeWidth="5" />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const rad = ((n * 30 - 90) * Math.PI) / 180;
        return (
          <text key={n} x={100 + Math.cos(rad) * 72} y={100 + Math.sin(rad) * 72 + 7} textAnchor="middle" fontSize="20" fill="#2b3236">
            {n}
          </text>
        );
      })}
      {hand(hourAngle, 44, 8)}
      {hand(minuteAngle, 54, 5)}
      <circle cx="100" cy="100" r="6" fill="#2b3236" />
    </svg>
  );
}
