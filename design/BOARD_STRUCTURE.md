# Design Board — Structure Guide

Purpose: a shared thinking space for architecture, flows, and open questions. Works as a FigJam board, a Figma file with wide frames, a Miro board, or a physical whiteboard. The layout below is what product + engineering teams typically use when reasoning through a new product end-to-end.

## Layout

Arrange the board as eight large frames laid out in a 2×4 or 4×2 grid. Each frame is one "section" with its own title. Users navigate the board by panning between frames, not by scrolling a single giant canvas.

### 1. Context & North Star

One frame, top-left. The thing you re-read at the start of every design review.

Contents: product one-liner, target user (persona card), 3–5 guiding principles, what success looks like, and an explicit list of non-goals (what you're *not* building). Keep this frame boring and stable — it only changes when the strategy changes.

### 2. User Flows

One frame per primary use case, drawn as a sequence or swim-lane diagram. Actors across the top (user / computer agent / CLI / subagents / store). Steps flow top-to-bottom. Keep each flow to the happy path; edge cases go to frame 7.

Flows to draft now:

- **F1 — Capture.** User adds something; it lands in the store as a typed event.
- **F2 — Retrieval + Render.** User asks a question; a rendered artifact comes back.

### 3. System Architecture

One frame. Box-and-arrow diagram of components and data flow. The canonical layout for this product:

`Computer Agent  →  brain CLI  →  Harness (subagents, hooks, filesystem)  →  Storage (markdown vault, index)  ←→  api.solution.ai (later)`

Keep this the single source of truth for what runs where. Update when a component is added, split, or killed.

### 4. Data Model

One frame. Entity shapes and relationships. For this product at MVP, that's one primary entity (the Event) and a handful of derived views. Show the schema fields, types, required vs. optional, and how events relate to each other (links, parent/child, project membership).

### 5. State Diagrams

One frame. State machines for the major entities. At MVP that's just the event lifecycle: `captured → classified → validated → committed → indexed → referenced`. Show what can transition to what, and what triggers each transition.

### 6. UX Sketches

One frame. Low-fidelity wireframes for the surfaces the human actually sees. Early on this is mostly "chat reply plus one rendered artifact" — the timeline view, the weekly review doc, the project brief. Don't polish; sketch.

### 7. Edge Cases & Unknowns

One frame. What breaks? What's ambiguous? What's the worst input this system can receive? Typical entries: duplicate captures, very large inputs, conflicting edits, offline edits, encrypted attachments, adversarial inputs. One sticky per case; mark "addressed" when handled in a flow.

### 8. Open Questions (Parking Lot)

One frame. Decisions not yet made. Each card: the question, the options under consideration, the trade-offs, who owns the decision, and by when. Revisit every week. Move resolved items out to the relevant frame (usually 3, 4, or 7).

## Adjacent frames (optional)

- **References.** Links to essays, prior art (Org-mode, Roam, Linear, event sourcing), relevant papers. One corner frame.
- **Glossary.** Shared vocabulary — "event", "capture", "render", "subagent". Prevents terminology drift.
- **Dot-vote / priorities.** If the board is being used collaboratively to make decisions.

## Working rhythm

- Start each design review at frame 1 (re-read principles). Ends any temptation to design against the wrong goal.
- End each review at frame 8 (did any new open questions surface?).
- When a decision is made in chat, the *decision* — not the debate — goes on the board. The board is a snapshot of the current best understanding, not a meeting log.
- Board health check once a month: any stale cards? any frame that hasn't been touched in 8 weeks? Prune.

## Where to put this board

FigJam is the common choice for this kind of loose architecture thinking because it has sticky notes, connectors, and low fidelity baked in. A regular Figma file with wide frames works too if you want tighter visual control. Miro and Whimsical are equivalent. The tool matters less than the discipline of keeping the eight frames up to date.
