# UX and screens (MVP)

## Screen 1: Home (Now & Next)
Goal: quickly decide where to go.

Shows:
- Location + radius selector (10/25/50/100 km)
- Spot cards sorted by:
  1) green tier first, then
  2) soonest start of best window, then
  3) longer duration, then
  4) higher avg score, then
  5) closer distance

Each card shows (Option A):
- Spot name + distance
- SendScore (0–100) + color
- Best window: start–end + duration

## Screen 2: Spot detail
- Hourly colored strip (next 24–48h)
- Select an hour → show score + key numbers
- (later) “Why?” breakdown: wind/direction/gust components

## Screen 3: Alerts
Rule builder:
- Spot
- Threshold: Green / Yellow+ / custom score
- Min duration (1–4h)
- Time window (anytime or hours)
Delivery: start simple, expand later.

## Screen 4: Spot Map
- Full-screen interactive map (Leaflet)
- Markers for all spots
- **Visual Barcode Icons**: dynamic markers showing the next ~12 daylight hours as colored strips (Green/Yellow/Red).
  - Allows instant scanning of the entire region to see where the wind is ON.
- Click to view popup with link to Spot Detail.
