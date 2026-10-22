# Picks live in browser storage and reach the agent by paste

The page could have used the Artifact `db` capability so the agent reads ticks live with ArtifactData. We chose browser storage plus a copy CTA instead: ticks and notes survive reloads and redeploys on KD's machine, and the Pick sheet (Markdown grouped by Design) reaches the agent only when KD pastes it. Fewer moving parts per page, works for anyone who opens the link, and the paste is the explicit "I am done reviewing" signal that starts the next round.
