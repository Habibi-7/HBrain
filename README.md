# Hvis

Local-first dashboard for **where your time went** (ActivityWatch) and **what you did** (habits). All data stays on your machine.

## Setup

**1. Install [ActivityWatch](https://activitywatch.net/)**. It tracks apps and sites in the background. Keep it running (default port `5600`). Hvis reads this for screen-time heatmaps and focus stats.

**2. Install Hvis**

```bash
git clone https://github.com/Habibi-7/hvis.git
cd hvis
npm install
```

**3. Start the app**

```bash
npm run dev
```

This starts the habits API (`127.0.0.1:3100`) and the web UI. Open **[http://localhost:3000](http://localhost:3000)**.


| Data        | Where it lives                  |
| ----------- | ------------------------------- |
| Habits      | `data/hvis.sqlite` (gitignored) |
| Screen time | ActivityWatch's local DB        |


MIT