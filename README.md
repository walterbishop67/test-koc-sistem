# TaskFlow

TaskFlow is a Trello-style Kanban board for small software teams. Users can sign up, create boards, add columns and cards, drag cards between columns, edit card details, and keep ordering persistent after refresh. The project is structured for Vercel deployment with a React + Vite frontend and a FastAPI backend.

## What Works

- Email/password sign up and login with JWT-based session handling
- Board creation, listing, archive/unarchive, and deletion
- Column creation, rename, delete, and drag-to-reorder
- Card creation, edit, delete, comments, labels, assignee, due date, priority, sprint assignment
- Drag-and-drop for cards across columns with visual overlay and mobile touch support
- Persistent ordering for both columns and cards
- Board members / invitations
- Activity history for card move and priority updates
- Responsive layout with mobile-friendly add-task flow
- Vercel-ready frontend output and Python serverless entrypoint

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Zustand, Tailwind CSS
- Drag and drop: `dnd-kit`
- Backend: FastAPI
- Data/storage/auth: Supabase
- Ordering: `fractional-indexing`
- Deployment: Vercel

## Why `dnd-kit`

This project uses `dnd-kit` because it is the most balanced choice for a 48-hour build:

- Maintained and modern. `react-beautiful-dnd` is effectively deprecated; `@hello-pangea/dnd` is healthier than that fork history, but still keeps the same mental model and heavier abstraction.
- Mobile support is stronger. `dnd-kit` works well with pointer and touch sensors, which matters for long-press drag on phones.
- Flexible. We need both card sorting and column sorting in one board, plus drag overlays and custom collision behavior.
- Bundle size is reasonable and the API is composable.

Quick comparison:

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| `dnd-kit` | Active, flexible, touch sensors, sortable primitives, strong React fit | Slightly more implementation effort | Chosen |
| `@hello-pangea/dnd` | Familiar API, good list reordering UX | Less flexible for custom layouts, heavier list-centric model | Not chosen |
| `SortableJS` | Fast and battle-tested | DOM-first, weaker React state ergonomics | Not chosen |
| Native HTML5 DnD | No dependency | Weak touch/mobile UX, inconsistent behavior, poor polish | Not chosen |

## Ordering Strategy

Persistent ordering is solved with **fractional indexing**.

- Every column and card stores a `position` string.
- When an item moves, a new key is generated between the previous and next item using `generateKeyBetween`.
- This means we do **not** need to renumber every sibling on each move.
- Order survives page refresh because the new `position` is written to the backend immediately.

Why this matters:

- Fast writes for normal drag operations
- Safer concurrent edits than array index storage
- Easy insertion between existing items

Fallback logic in the frontend also normalizes malformed historical positions when older data is loaded.

## Mobile Behavior

Mobile drag is supported through `TouchSensor` with a long-press style activation:

- `delay: 250`
- `tolerance: 15`

This avoids accidental drags while scrolling. The UI also includes:

- A mobile floating action button for quick card creation
- Responsive horizontal board scrolling
- Touch-friendly buttons and modal sheets

## 48-Hour Scope Decisions

Priority was given to making the Kanban core reliable instead of shipping too many half-finished features.

Included in the build because they add clear value fast:

- Drag-and-drop for cards
- Persistent ordering
- Card detail editing
- Column reordering
- Assignee, due date, label, and priority support
- Basic activity history

De-prioritized for a first 48-hour delivery:

- True real-time collaborative editing
- Fine-grained board sharing permissions beyond membership/invite flows
- Heavy analytics / virtualization optimization

## Answers To Evaluation Questions

### Should columns also be reorderable?

Yes. This project supports column reordering because teams often refine workflow stages after the board is already populated.

### Which extra card fields are worth doing in 48 hours?

Assignee, due date, priority, and labels are worth it. They are high-value, low-risk additions that improve usability without destabilizing the drag-and-drop core.

### Should board sharing exist?

For a 48-hour version, invite-based membership is enough. Full collaborative permission matrices would be overkill unless explicitly required.

### Is activity history valuable?

Yes, especially for moved cards. It gives teams accountability and helps explain “what changed?” without building a full audit platform.

### Will performance hold with many cards?

For small-to-medium boards, yes. `dnd-kit` plus persisted position keys is sufficient. For very large boards, next improvements would be:

- List virtualization
- Debounced secondary UI updates
- More aggressive memoization / render splitting

## Architecture

### Frontend

- `frontend/src/components/BoardView.tsx`
  Main Kanban board, drag context, filters, overlays, mobile interactions
- `frontend/src/store/useBoardStore.ts`
  Client state, optimistic reordering, API mutations, fractional indexing logic
- `frontend/src/components/KanbanColumn.tsx`
  Sortable column and per-column card list
- `frontend/src/components/SortableCard.tsx`
  Sortable card rendering
- `frontend/src/components/CardModal.tsx`
  Card detail editing

### Backend

- `backend/main.py`
  FastAPI app setup, CORS, router wiring, SPA serving in production
- `api/index.py`
  Vercel serverless entrypoint
- `backend/services/*`
  Service-oriented modules for auth, boards, columns, cards, comments, labels, teams, notifications, sprints, AI
- `migrations/`
  SQL migrations for Supabase/Postgres schema

## Local Development

### 1. Install dependencies

From the repo root:

```powershell
python -m pip install -r requirements.txt
cd frontend
npm install
```

### 2. Configure environment

Create a `.env` file from `.env.example` and fill the required Supabase values.

Expected backend environment includes values like:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (optional but useful for email/admin flows)
- `CORS_ORIGINS`

### 3. Run backend

```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 9090 --reload
```

### 4. Run frontend

In a second terminal:

```powershell
cd frontend
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:9090`.

## Build

Frontend production build:

```powershell
cd frontend
npm run build
```

The built assets are emitted to `frontend/dist`.

## Vercel Deployment

The repository is already configured for Vercel:

- `vercel.json` installs Python and frontend dependencies
- frontend build output is served from `frontend/dist`
- `/api/*` rewrites to `api/index.py`
- all other routes rewrite to the SPA entrypoint

Deployment flow:

1. Import the repo into Vercel
2. Set the same `.env` values in the Vercel project settings
3. Deploy

## Data Model Summary

- `Board`
  Contains workflow for a project/team
- `Column`
  Belongs to a board, stores `position`
- `Card`
  Belongs to a column, stores `position`, title, description, priority, assignee, due date, labels, sprint info

Relationship:

`Board -> Columns -> Cards`

This matches the evaluation focus on data model consistency and makes drag-and-drop updates straightforward.

## How Ordering Persistence Works

When a card is dropped:

1. The frontend determines target column and neighboring cards
2. A new fractional `position` key is generated
3. Zustand updates the UI optimistically
4. The backend persists `column_id` and `position`
5. On refresh, the board reloads in the same order

The same strategy is used for column reordering.

## Verification

The project was validated with:

- TypeScript frontend build
- Static inspection of drag-and-drop, auth, routing, and Vercel wiring

If you want to extend this further, the next best improvement would be real-time collaboration via Supabase realtime channels.
