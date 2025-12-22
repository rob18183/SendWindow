# Scoring model (Intermediate)

## Output
- SendScore: 0–100
- Color mapping:
  - Green: 70–100
  - Yellow: 45–69
  - Red: 0–44

## Total score
Total = Wind (0–60) + Direction (0–25) + Gustiness (0–15)

### Wind score (0–60)
Based on avg wind (knots), with prime starting at 16 kt:
- <10: 0
- 10–16: 0 → 45
- 16–24: 45 → 60
- 24–30: 60
- 30–36: 60 → 35
- >36: 20

### Direction score (0–25)
Let d = degrees from forecast direction to nearest “good” range edge (0 if inside).
dir_score = 25 * max(0, 1 - d/60)

### Gustiness score (0–15)
Let g = gust - avg (knots).
gust_score = 15 * max(0, 1 - max(0, g-6)/14)

## Safety override (optional)
If forecast direction is inside unsafe_dirs: force **Red**.
Use sparingly, only when you’re confident per spot.