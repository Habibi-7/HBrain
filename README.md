# HBrain

A local-first activity tracker, habit tracker, and life dashboard. 
Inspired by ActivityWatch, but with a unified, beautiful UI and manual habit tracking.

## Getting Started

1. Install [ActivityWatch](https://activitywatch.net/) and ensure it is running in the background (port 5600).
2. Clone this repository.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Features
- **Dashboard:** Today's active time, category breakdown, top apps, and habits.
- **Activity:** GitHub-style 6-month contribution heatmap of your screen time.
- **Habits:** Manual habit tracking with streak counters and mini heatmaps.
- **Privacy First:** 100% local. AW data stays in its local SQLite DB, habits stay in your browser's LocalStorage.

## Phase 2 Roadmap
- Linear integration (track time spent vs tasks completed)
- Obsidian integration (interactive graph view of second-brain notes)

## License
MIT
