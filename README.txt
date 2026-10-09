SECRET GOLF TOUR — FOUR DEDICATED PLAYLISTS

Files in this package:
- index.html
- style.css
- script.js
- worker.js (Cloudflare Worker source)
- README.txt

Playlist mapping:
1. Golf Influencers: https://www.youtube.com/playlist?list=PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n
2. LPGA & KLPGA: https://www.youtube.com/playlist?list=PL1m3Bw6VGCWSIkzpxSfnm5nvOKjBQDlIj
3. Swing Analysis: https://www.youtube.com/playlist?list=PL1m3Bw6VGCWTFtTx9KRJRmKZ_dSWkgJlv
4. Golf Stories: https://www.youtube.com/playlist?list=PL1m3Bw6VGCWSUW80LYY9bilDhW-FpYUsK

IMPORTANT: Update the Cloudflare Worker too, not just the GitHub files.
The existing Worker originally served only one playlist. This package includes worker.js updated to accept only the four approved playlist IDs.

Steps:
A. GitHub website
1. Extract this ZIP.
2. In https://github.com/himanshukambli/secret-golf-tour replace index.html, style.css, and script.js with the files from this ZIP.
3. Commit the changes to main.

B. Cloudflare Worker
1. Open Cloudflare Dashboard > Workers & Pages > secret-golf-playlist > Edit code.
2. Replace the entire Worker source with worker.js from this ZIP.
3. Deploy the Worker.
4. Keep the existing YOUTUBE_API_KEY secret in Settings > Variables and secrets. Do not add the key to worker.js or GitHub.

C. Test
Open each category section on https://himanshukambli.github.io/secret-golf-tour/ and confirm it shows the videos from its own playlist. Click a thumbnail; the video should play inside its card. Descriptions are not displayed.

Security:
- Do not put the Google API key in public GitHub files.
- Keep the API key stored only as a Cloudflare Worker secret.
