type HourScore = { timeISO: string; score: number; color: "green" | "yellow" | "red" };

function bestWindow(hours: HourScore[], minScore: number) {
  let best = null as null | { start: number; end: number; len: number; avg: number };

  let i = 0;
  while (i < hours.length) {
    if (hours[i].score < minScore) { i++; continue; }

    const start = i;
    let sum = 0;
    while (i < hours.length && hours[i].score >= minScore) {
      sum += hours[i].score;
      i++;
    }
    const end = i - 1;
    const len = end - start + 1;
    const avg = sum / len;

    const candidate = { start, end, len, avg };
    if (!best) best = candidate;
    else if (candidate.len > best.len) best = candidate;
    else if (candidate.len === best.len && candidate.avg > best.avg) best = candidate;
  }

  return best;
}
