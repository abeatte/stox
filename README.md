# Stox — Stock Ticker App

A React + TypeScript stock ticker dashboard that fetches live data from Yahoo Finance via a local proxy server.

## Prerequisites

- Node.js (v18+)
- npm

## Getting Started

```bash
# Install dependencies
npm install

# Start both the backend proxy and Vite dev server
npm run dev:all
```

This runs the Express proxy on `http://localhost:3001` and the Vite frontend on `http://localhost:5173`.

You can also start them separately:

```bash
# Backend only
npm run server

# Frontend only
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Express proxy server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint with ESLint |
| `npm run kill-server` | Kill any process on port 3001 |
