# Landing images

Drop real shots here with these exact filenames — the landing references them by
path, so no code change is needed. Until a file exists, the landing shows a quiet
"27" placeholder at the right aspect ratio (never a broken image).

| File | Section | Aspect | What it should be |
|---|---|---|---|
| `proof-before.jpg` | The proof (left half) | 3:4 portrait | The clothes as the user wears them now — the "before". |
| `proof-after.jpg` | The proof (right half) | 3:4 portrait | The same outfit rendered on the user — the "after". |
| `read-1.jpg` | Beat 1 — "It reads your closet." | 16:10 landscape | A wardrobe / garments being read. |
| `read-2.jpg` | Beat 2 — "It puts the fit together." | 16:10 landscape | An outfit composed from owned pieces. |
| `read-3.jpg` | Beat 3 — "It shows it on you." | 16:10 landscape | The render on the user's own body. |

Compress before committing — the landing is meant to load in under a second.
Match the aspect ratios above so nothing shifts. `.jpg` (or swap the extension in
`src/app/page.tsx` if you prefer `.webp`).
