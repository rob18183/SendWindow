# Data model

## Spot
Each spot defines where it is and what wind directions work.

Fields:
- id (string)
- name (string)
- lat, lon (number)
- good_dirs: list of { start, end } degrees (wrap supported)
- unsafe_dirs (optional): list of ranges that force Red (e.g., offshore)

Example:
```json
{
  "id": "zandvoort",
  "name": "Zandvoort",
  "lat": 52.373,
  "lon": 4.533,
  "good_dirs": [{ "start": 210, "end": 20 }],
  "unsafe_dirs": [{ "start": 70, "end": 120 }]
}
```

## ForecastHour (per spot, per hour)
- timeISO (string)
- wind_avg_kt (number)
- wind_gust_kt (number)
- wind_dir_deg (number)

## HourScore

Computed:
- timeISO
- score (0–100)
- color: green|yellow|red
- (later) breakdown for “why”