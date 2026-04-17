# TRP Probe Analyzer TZ

A clone of the TRP-Probe-Analyzer application. This tool provides an interactive dashboard for analyzing TRP (Total Radiated Power) probe data across different technologies, bands, antennas, and channels.

## Features

- **Interactive Filtering**: Filter data by technology, band, antenna, and channel
- **Probe Selection**: Select individual probes for analysis
- **Multiple Combine Modes**: Analyze probes individually, as linear power average, dB average, top-half linear average, or best 2-probe combination
- **Scatter Plot Visualization**: Visualize probe vs. TRP correlation with regression lines
- **R² Correlation Analysis**: Bar chart showing R² values for each probe/combination
- **Antenna Analysis**: Cross-band/channel R² heatmap for selected antenna

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: TailwindCSS v4
- **Charts**: Recharts
- **Backend**: Express.js (SPA fallback server)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Build

```bash
pnpm build
```

### Production

```bash
pnpm start
```

## Design

The application follows a **Data Brutalism meets Swiss Design** philosophy:
- Monospaced JetBrains Mono for technical precision
- Dark charcoal (`#1a1a1a`) with electric cyan (`#00d9ff`) accents
- Grid-based asymmetric layout with split-screen dashboard
- Flat brutalist aesthetic with sharp borders, no shadows
