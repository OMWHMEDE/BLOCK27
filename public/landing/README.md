# Landing images

Drop real shots here with these exact filenames — the landing references them by
path. The names are versioned (`-v2`) to bypass Vercel's static-asset CDN cache;
if you replace an image, bump the version in both the filename and the reference
in `src/app/page.tsx` (a new URL is never stale). Until a file exists, the
landing shows a quiet "27" placeholder (never a broken image). The box is sized
to each image's real aspect ratio, so upload the source unmodified — no cropping.

| File | Section | What it should be |
|---|---|---|
| `proof-before-v2.jpg` | The proof (left half — "Before") | The clothes as the user wears them now. |
| `proof-after-v2.jpg` | The proof (right half — "On you") | The same outfit rendered on the user. |
| `read-1-v2.jpg` | Beat 1 — "It reads your closet." | A wardrobe / garments being read. |
| `read-2-v2.jpg` | Beat 2 — "It puts the fit together." | An outfit composed from owned pieces. |
| `read-3-v2.jpg` | Beat 3 — "It shows it on you." | The render on the user's own body. |

Compress before committing — the landing is meant to load in under a second.
