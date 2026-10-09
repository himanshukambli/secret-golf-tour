# Secret Golf Tour — Automatic Playlist Gallery

This update displays YouTube playlist items as individual thumbnail cards with titles and direct Watch on YouTube links.

## Before uploading
1. Open `script.js` in Notepad.
2. Find this line:
   `const YOUTUBE_API_KEY = "PASTE_YOUR_API_KEY_HERE";`
3. Replace only `PASTE_YOUR_API_KEY_HERE` with your Google Cloud API key, keeping the quotation marks.
4. Save the file.

Do not send the key in chat or commit it to a public repository without understanding that browser-side keys are visible to visitors. The website referrer restriction and YouTube Data API v3 restriction reduce misuse but do not make a browser key secret.

## Update the GitHub repository
Replace the existing `index.html` and `style.css` with the versions in this package, and upload the new `script.js` to the repository root. Commit the changes. Keep the repository's GitHub Pages source set to `main` and `/ (root)`.

## Playlist used
https://www.youtube.com/playlist?list=PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n

The page requests up to 24 videos at a time and shows a Load More button if the playlist contains additional items. The gallery refreshes its data whenever the page loads.

## Troubleshooting
- `API key not valid`: confirm the key was pasted correctly and the restrictions have had a few minutes to apply.
- `RefererNotAllowedMapError` / referrer denied: ensure the website restriction includes `https://himanshukambli.github.io/*`.
- API not enabled: confirm YouTube Data API v3 is enabled in the same Google Cloud project.
- Quota exceeded: check Google Cloud → APIs & Services → YouTube Data API v3 → Quotas.
