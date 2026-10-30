# SHAKA.RAW

*no algorithm, just me.* A personal website running on SHAKA OS, the fictional system that organizes it.

Plain HTML, CSS and JavaScript. No framework, no build step, no backend, no trackers, no external fonts or libraries.

```
shaka.raw/
├── index.html      page shell, metadata, link-preview tags
├── styles.css      visual system, three themes, effects, responsive layout
├── script.js       rendering, navigation, terminal, player, preferences
├── config.js       ← ALL personal content lives here
├── assets/
│   └── favicon.svg
└── README.md
```

## Run it locally

Double-click `index.html`. That's it: everything works from the file system, including the terminal, themes and the music player (with local audio files).

If you prefer a local server (closer to how it behaves online):

```bash
cd shaka.raw
python3 -m http.server 8000
# open http://localhost:8000
```

## Change personal information

Open `config.js` in any text editor. Each block is commented and marked as **[confirmed]**, **[optional]** or **[missing]**.

- **Profile**: edit `profile` (name, occupation, location, currently into, status, fun fact). Set a field to `""` to hide it.
- **Bio**: edit `bio`, one string per paragraph. Alternative lines are listed in the comment above it. The second paragraph is also the intro on the home page.
- **Avatar**: put an image in `assets/` and set `avatar: { src: "assets/avatar.jpg", alt: "Shaka's avatar" }`. Empty means the pixel koala shows up.

Nothing is duplicated elsewhere; the home page, About page, terminal and system log all read from this file.

## Add links

```js
links: [
  { label: "Letterboxd", handle: "Kowannabe", note: "Public film profile.", url: "https://letterboxd.com/Kowannabe/" },
],
```

`handle` is the display name, `note` is optional context.

Only links with a valid `https://` (or `mailto:`) address appear. They open in a new tab with `rel="noopener noreferrer"`. Anything else is ignored.

## Music

Everything lives under `music` in `config.js`:

- `artists`: favorite artists and bands, shown in the order listed (no ranking).
- `albums`: `{ title, artist, note, cover? }`. `cover` is optional (image path or https URL); without it, a vinyl-sleeve placeholder is shown.
- `playlists`: `{ title, url, tags?, cover? }`. Tags are mood labels. Heading and subtitle come from `playlistsHeading` / `playlistsSubtitle`.
  With `fetchPlaylistArtwork: true` the visitor's browser asks Spotify's public oEmbed endpoint for each cover. If that fails, the styled placeholder stays. To pin an image yourself, add `cover`.
- `wishlist`: `{ title, artist, status }` with status `"want"`, `"hunting"` or `"acquired"`. **Got a record? Change its status to `"acquired"`.** The music page, the home status panel and the `vinyl` terminal command all update from that one line.
- `tracks`: `{ title, artist, src }`. A local audio file you have the right to share becomes playable in the site player. With none, the player says it's unconfigured and never pretends to play.
- `cassettes`: reserved for later; nothing reads it yet.

## Add projects and interests

Put images in `assets/` (e.g. `assets/lab/`) and reference them by path.

```js
projects: [
  { name: "Tiny synth", description: "...", category: "Web experiments",
    status: "in progress", tech: ["JavaScript"], thumbnail: "assets/lab/synth.png",
    url: "https://..." },
],

interests: [
  { folder: "save_file.exe", category: "Gaming and The Sims",
    description: "One or two short lines.", items: [ { title: "The Sims", note: "optional" } ] },
],
```

## Archive (folders and galleries)

The archive is a set of folders that visitors browse inside the site. Each folder and image has its own address (`#archive/forza_horizon`, `#archive/forza_horizon/img-2`), so Back/forward and shared links work.

**Where files go:** one folder per collection, mirroring the archive:

```
assets/archive/
├── visual_noise/   digital_artifacts/   physical_media/
├── currently_observed/   unsorted/   static/
├── crash_romance/
│   ├── members/  photoshoots/  eras/  artwork/  memorabilia/
├── forza_horizon/
└── setups/
```

Each gallery folder may also contain generated `thumbs/` and `display/` folders. The `.nojekyll` file in the project root makes sure GitHub Pages publishes them; keep it.

**Adding images (no code editing):**

GitHub Pages can't list folders, so a small script writes the list of images (`archive-manifest.js`) and makes thumbnails. Pick one of these two ways:

*A. On your computer* (needs Python + `pip install pillow` once):
1. Drop the images into their folder, e.g. `assets/archive/forza_horizon/`. Any filename works.
2. Run `python tools/build_archive.py --rename` from the project folder.
3. Upload/commit everything (new images, `thumbs/`, `display/`, `archive-manifest.js`).

*B. Only on github.com:* in repository **Settings → Pages**, set **Source: GitHub Actions** once. Then upload images into their folder on github.com; the included workflow (`.github/workflows/deploy-pages.yml`) builds and publishes automatically. Files keep the names you uploaded (renaming only happens with option A).

What the script does:
- `--rename` gives new files the next number in date order (`static-019.png`, `setup-008.jpg`; subfolders get e.g. `crash-romance-members-001.png`). It never overwrites, fixes extensions that don't match the real format, and logs every rename in `tools/rename-map.csv`.
- Makes `thumbs/` (grid previews) and, for large images, `display/` (viewer versions). Originals are kept for "open full size". Don't edit or upload into `thumbs/` or `display/` by hand.
- Removes hidden PNG tags that identify an account (e.g. Xbox screenshot author/ID); pixels are not changed.
- `python tools/build_archive.py --check` previews everything without changing anything.
- A new folder on disk shows up in the Archive automatically. Add it to `config.js` only to give it a description or a position in the list.

**Giving an image details (optional):** in `config.js`, under that folder's `items`, add a line matched by file path. Only the fields you write are shown:

```js
{ file: "assets/archive/forza_horizon/forza-horizon-005.jpg",
  title: "Sunset run", alt: "White car on a coastal road", date: "2025-05-27",
  description: "One sentence.", meta: { car: "...", location: "..." } },
```

`hidden: true` hides an image from the gallery without deleting it. For `setups/`, use `meta: { year: "2024", hardware: "..." }`.

**Before uploading photos:**
- No need to resize: the script makes web-sized versions. Very large originals (over ~25 MB) are still best shrunk first.
- **Strip location data (EXIF/GPS).** Phone photos can contain where they were taken. Squoosh and most export tools remove it; on Windows: right-click → Properties → Details → "Remove properties and personal information".
- Use plain file names (no spaces or personal info).

## Videos (Archive → audiovisual/)

Videos live in `assets/video/` with poster images in `assets/video/posters/`, and are listed under the `audiovisual` folder in `config.js`:

```js
{ file: "assets/video/my-clip.mp4", poster: "assets/video/posters/my-clip.jpg",
  title: "My clip", width: 1920, height: 1080, duration: "0:30" },
```

Each video gets its own player (play/pause, volume, timeline, fullscreen), never autoplays, and only one plays at a time. Browsers that can't play a file show a link to it instead.

Guidelines for new videos:
- Use **MP4 with H.264 video and AAC audio**; it plays in every major browser.
- Keep each file **under 25 MiB** so it can be uploaded on github.com; GitHub refuses files over 100 MiB entirely.
- Apply "faststart" so playback starts before the whole file downloads. This is lossless:
  `ffmpeg -i input.mp4 -map 0 -c copy -movflags +faststart output.mp4`
- If a file is too large, re-encode only the video and copy the audio untouched:
  `ffmpeg -i input.mp4 -map 0:v:0 -map 0:a:0 -c:v libx264 -crf 21 -preset medium -c:a copy -movflags +faststart output.mp4`
- Make a poster from a frame (here, at 8 seconds):
  `ffmpeg -ss 8 -i output.mp4 -frames:v 1 -vf scale=1280:720 -map_metadata -1 -q:v 3 poster.jpg`
- Use lowercase filenames without spaces.

## Themes and effects

- Visitors pick **purple**, **blue** or **amber** with the dots in the top bar, or type `theme amber` in the terminal. The choice is remembered in the browser.
- The default theme is `theme.default` in `config.js`.
- To tweak colors, edit the variables at the top of `styles.css` (`[data-theme="purple"] { --a1: ...; }`).
- **fx on/off** toggles scanlines, grain, the wordmark glitch and the short boot screen. Default: `theme.effects`. If the visitor's system asks for reduced motion, all animation is off regardless.

## Terminal

`help`, `whoami`, `ls`, `cd <section>`, `about`, `music`, `vinyl`, `interests`, `lab`, `links`, `archive`, `random`, `ko`, `theme`, `fx`, `neofetch`, `fortune`, `date`, `history`, `clear`. A few unlisted ones are left for the curious (try the Konami code on the page).

Ko's lines and the fortune messages are editable in `config.js` under `ko` and `terminal`. Unknown addresses (e.g. `#nope`) show Ko's 404 page. `archive` lists folders with real file counts, `archive <folder>` (or `cd archive/<folder>`) opens one, Tab completes folder names, and `random` opens a random configured image (or says the archive is empty).

It's simulated in the browser and never runs real system commands. To add a command, add an entry to the `CMDS` object in `script.js`.

## Deploy for free

**GitHub Pages (recommended setup)**

The site is plain static files, so GitHub Pages serves it as-is from the repository root. Everything works under a repository subpath such as `https://<your-user>.github.io/shaka-raw/`.

1. Create a GitHub account and a new **public** repository, e.g. `shaka-raw`.
2. Upload with **GitHub Desktop** (recommended): clone the empty repository, copy the *contents* of this folder into it (so `index.html` sits at the top level, next to `.nojekyll` and `.github/`), then *Commit to main* → *Push origin*.
   - Make sure the hidden items `.nojekyll` and `.github/` are copied too. On macOS press Cmd+Shift+. in Finder to show them; on Windows enable *View → Hidden items*.
   - Uploading through the github.com website also works (every file here is under its 25 MiB limit), but it's easy to miss hidden files that way.
3. Repository → **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)` → *Save*.
4. Because you publish from the branch, turn off the included automation so it doesn't report failed runs: **Actions** tab → *Deploy SHAKA.RAW* → *…* → **Disable workflow**. (Or delete `.github/workflows/deploy-pages.yml` before uploading.)
5. After a minute or two the site is at `https://<your-user>.github.io/<repo>/`.

When you add images later, run `python tools/build_archive.py --rename` on your computer and commit the results (option A in the Archive section).

**Alternative: automatic builds with GitHub Actions**

Use this only if you want to add images directly on github.com (option B in the Archive section): set **Settings → Pages → Source: GitHub Actions** and keep the workflow enabled. Every push then rebuilds thumbnails and the image list before publishing. Use one setup or the other, not both.

**Netlify Drop / Cloudflare Pages** also work: drag the folder in, no configuration needed.

After deploying, open `index.html`, uncomment the `og:url` and `og:image` lines and fill in your real address so Discord previews are complete. For an image preview, add a 1200×630 PNG at `assets/og-image.png`.

## Privacy

Don't put addresses, private contacts, private repositories, tokens or API keys in `config.js`: everything in it is public. `Location: Everywhere` is intentional.

`tools/rename-map.csv` is published along with the site. It lists every image's original filename next to its new one (some original names contain capture dates). Delete it before uploading if you'd rather keep that private; the site doesn't need it.
