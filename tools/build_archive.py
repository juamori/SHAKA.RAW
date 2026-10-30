#!/usr/bin/env python3
"""
SHAKA.RAW — archive builder
===========================

GitHub Pages can't list folders, so the website can't "see" new images on its own.
This script looks inside assets/archive/ and writes archive-manifest.js, the list
of images the gallery reads. Run it after adding, removing or renaming images.

    python tools/build_archive.py            # thumbnails + display versions + manifest
    python tools/build_archive.py --rename   # also give new files standard names first
    python tools/build_archive.py --check    # report only, change nothing

Requires Pillow:  pip install pillow

What it does
------------
* Every folder under assets/archive/ is a gallery (subfolders too).
  The folders "thumbs" and "display" are reserved for generated files.
* --rename gives files that don't follow the naming convention the next free number:
      static/whatever.png          ->  static/static-019.png
      crash_romance/members/x.jpg  ->  crash_romance/members/crash-romance-members-001.jpg
  New files are numbered in date order (capture date from camera-style
  names like 20230102_201621.jpg, otherwise the file's modified date). Nothing is overwritten. If a file's
  extension doesn't match its real format (e.g. a JPEG called .png), the
  extension is corrected; the image data is not converted. Every rename is
  appended to tools/rename-map.csv.
* Originals are kept. The only change ever made to an original is removing
  hidden PNG text tags that identify an account or device (e.g. Xbox "GameDVR"
  author/ID); pixels are untouched.
* thumbs/  : small WebP previews for the grid (always made).
  display/ : WebP for the image viewer, only when the original is large
             (long edge > 2000 px or file > 900 KB). Otherwise the original is used.
* Derived files are only regenerated when the original is newer, and derived
  files whose original was deleted are removed.
"""
import argparse
import csv
import datetime as dt
import json
import os
import re
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(ROOT, "assets", "archive")
MANIFEST = os.path.join(ROOT, "archive-manifest.js")
COVERS = os.path.join(ROOT, "assets", "music", "covers")
COVER_SIZE = 600         # px, square album covers shown in the Music section
RENAME_LOG = os.path.join(ROOT, "tools", "rename-map.csv")

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
RESERVED = {"thumbs", "display"}
FORMAT_EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}
# Folder path -> filename prefix where the default (path with _ -> -) isn't wanted.
PREFIX_OVERRIDES = {"setups": "setup"}

THUMB_BOX = 640          # px, long edge of grid previews
DISPLAY_MAX = 2000       # px, long edge of viewer versions
DISPLAY_IF_BYTES = 900 * 1024
SENSITIVE_PNG_KEYS = re.compile(r"^(Microsoft\.GameDVR\.|XML:com\.adobe\.xmp)", re.I)


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def prefix_for(folder_rel):
    return PREFIX_OVERRIDES.get(folder_rel, folder_rel.replace("/", "-").replace("_", "-"))


def gallery_folders():
    """Every non-reserved, non-hidden folder under assets/archive (recursive)."""
    out = []
    for dirpath, dirnames, _ in os.walk(ARCHIVE):
        dirnames[:] = sorted(d for d in dirnames if d not in RESERVED and not d.startswith((".", "_")))
        if dirpath != ARCHIVE:
            out.append(dirpath)
    return out


def images_in(folder):
    return sorted(
        f for f in os.listdir(folder)
        if os.path.isfile(os.path.join(folder, f)) and not f.startswith(".")
        and os.path.splitext(f)[1].lower() in IMAGE_EXT
    )


def real_ext(path):
    try:
        with Image.open(path) as im:
            return FORMAT_EXT.get(im.format)
    except Exception:
        return None


CAMERA_NAME = re.compile(r"(20\d{2})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})")


def sort_time(path):
    """Capture time from camera-style names (20230102_201621.jpg), else file modification time."""
    m = CAMERA_NAME.search(os.path.basename(path))
    if m:
        try:
            return dt.datetime(*map(int, m.groups())).timestamp()
        except ValueError:
            pass
    return os.path.getmtime(path)


def rename_folder(folder, check, log_rows):
    folder_rel = os.path.relpath(folder, ARCHIVE).replace(os.sep, "/")
    prefix = prefix_for(folder_rel)
    pat = re.compile(rf"^{re.escape(prefix)}-(\d{{3,}})\.[a-z0-9]+$")
    files = images_in(folder)
    used = {int(m.group(1)) for f in files if (m := pat.match(f))}
    todo = [f for f in files if not pat.match(f)]
    # Files that already follow the convention may still need an extension fix.
    fixes = []
    for f in files:
        if pat.match(f):
            want = real_ext(os.path.join(folder, f))
            if want and os.path.splitext(f)[1].lower() != want:
                fixes.append((f, os.path.splitext(f)[0] + want))
    todo.sort(key=lambda f: (sort_time(os.path.join(folder, f)), f.lower()))
    plan, n = [], max(used, default=0)
    for f in todo:
        n += 1
        ext = real_ext(os.path.join(folder, f)) or os.path.splitext(f)[1].lower()
        plan.append((f, f"{prefix}-{n:03d}{ext}"))
    plan += fixes
    targets = [b for _, b in plan]
    existing = set(files) - {a for a, _ in plan}
    clash = [b for b in targets if b in existing or targets.count(b) > 1]
    if clash:
        sys.exit(f"Refusing to rename in {folder_rel}: name collision {clash}")
    for a, b in plan:
        print(f"  rename {folder_rel}/{a}  ->  {b}")
        log_rows.append([dt.date.today().isoformat(), folder_rel, a, b])
    if check or not plan:
        return len(plan)
    # Two-phase rename (via temporary names) so no file can overwrite another.
    temps = []
    for i, (a, b) in enumerate(plan):
        t = os.path.join(folder, f".renaming-{os.getpid()}-{i}")
        os.rename(os.path.join(folder, a), t)
        temps.append((t, os.path.join(folder, b)))
    for t, b in temps:
        assert not os.path.exists(b), b
        os.rename(t, b)
    return len(plan)


def strip_sensitive_png(path, check):
    """Remove identifying PNG text chunks (e.g. Xbox GameDVR author/ID). Pixels unchanged."""
    with Image.open(path) as im:
        if im.format != "PNG":
            return False
        keys = [k for k in im.info if isinstance(k, str) and SENSITIVE_PNG_KEYS.match(k)]
        if not keys:
            return False
        if check:
            print(f"  would strip hidden tags from {rel(path)}: {len(keys)} field(s)")
            return True
        im.load()
        before = im.copy()
        keep = {}
        if "icc_profile" in im.info:
            keep["icc_profile"] = im.info["icc_profile"]
        if "dpi" in im.info:
            keep["dpi"] = im.info["dpi"]
    mtime = os.path.getmtime(path)
    tmp = path + ".tmp"
    before.save(tmp, format="PNG", optimize=True, **keep)
    with Image.open(tmp) as after:
        if after.convert("RGBA").tobytes() != before.convert("RGBA").tobytes():
            os.remove(tmp)
            sys.exit(f"Pixel mismatch while cleaning {rel(path)}; original left untouched.")
    os.replace(tmp, path)
    os.utime(path, (mtime, mtime))
    print(f"  stripped hidden tags from {rel(path)} ({len(keys)} field(s), pixels identical)")
    return True


def make_derivative(src, dst, box, quality):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        if im.mode == "RGBA" and im.getextrema()[3][0] == 255:
            im = im.convert("RGB")  # alpha channel present but unused
        im.thumbnail((box, box), Image.LANCZOS)
        im.save(dst, "WEBP", quality=quality, method=6)


def fresh(dst, src):
    return os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)


def build(check):
    manifest = {}
    stats = {"images": 0, "thumbs": 0, "display": 0, "removed": 0}
    for folder in gallery_folders():
        folder_rel = os.path.relpath(folder, ARCHIVE).replace(os.sep, "/")
        files = images_in(folder)
        entries = []
        wanted = set()
        for f in files:
            src = os.path.join(folder, f)
            strip_sensitive_png(src, check)
            stem = os.path.splitext(f)[0]
            with Image.open(src) as im:
                w, h = ImageOps.exif_transpose(im).size
            thumb = os.path.join(folder, "thumbs", stem + ".webp")
            wanted.add(thumb)
            if not check and not fresh(thumb, src):
                make_derivative(src, thumb, THUMB_BOX, 72)
                stats["thumbs"] += 1
            entry = {"file": rel(src), "thumb": rel(thumb), "w": w, "h": h}
            if max(w, h) > DISPLAY_MAX or os.path.getsize(src) > DISPLAY_IF_BYTES:
                disp = os.path.join(folder, "display", stem + ".webp")
                wanted.add(disp)
                if not check and not fresh(disp, src):
                    make_derivative(src, disp, DISPLAY_MAX, 84)
                    stats["display"] += 1
                entry["display"] = rel(disp)
            entries.append(entry)
            stats["images"] += 1
        # Remove derivatives whose original is gone.
        for sub in RESERVED:
            d = os.path.join(folder, sub)
            if os.path.isdir(d):
                for f in os.listdir(d):
                    p = os.path.join(d, f)
                    if p not in wanted and os.path.isfile(p):
                        print(f"  remove orphan {rel(p)}")
                        stats["removed"] += 1
                        if not check:
                            os.remove(p)
        manifest[folder_rel] = entries
    return manifest, stats


def build_covers(check):
    """Album covers: assets/music/covers/<name>.(jpg|png|webp) -> covers/web/<name>.webp (square, 600 px).
    The site matches <name> to an album or wishlist record by "title-artist", e.g. rumours-fleetwood-mac.
    Originals are left untouched; the web copy is centre-cropped to a square and carries no metadata."""
    out = {}
    if not os.path.isdir(COVERS):
        return out
    web = os.path.join(COVERS, "web")
    wanted = set()
    for f in sorted(os.listdir(COVERS)):
        src = os.path.join(COVERS, f)
        stem, ext = os.path.splitext(f)
        if not os.path.isfile(src) or f.startswith(".") or ext.lower() not in IMAGE_EXT:
            continue
        key = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
        dst = os.path.join(web, key + ".webp")
        wanted.add(dst)
        if not check and not fresh(dst, src):
            os.makedirs(web, exist_ok=True)
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im = ImageOps.fit(im, (COVER_SIZE, COVER_SIZE), Image.LANCZOS)
                im.save(dst, "WEBP", quality=84, method=6)
            print(f"  cover {rel(src)} -> {rel(dst)}")
        out[key] = rel(dst)
    if os.path.isdir(web):
        for f in os.listdir(web):
            p = os.path.join(web, f)
            if p not in wanted and os.path.isfile(p):
                print(f"  remove orphan cover {rel(p)}")
                if not check:
                    os.remove(p)
    return out


def main():
    ap = argparse.ArgumentParser(description="Build the SHAKA.RAW archive manifest.")
    ap.add_argument("--rename", action="store_true", help="give non-standard filenames the next free number")
    ap.add_argument("--check", action="store_true", help="report only; change nothing")
    args = ap.parse_args()
    if not os.path.isdir(ARCHIVE):
        sys.exit(f"Not found: {rel(ARCHIVE)}")

    if args.rename:
        log_rows = []
        total = sum(rename_folder(f, args.check, log_rows) for f in gallery_folders())
        if log_rows and not args.check:
            new = not os.path.exists(RENAME_LOG)
            with open(RENAME_LOG, "a", newline="", encoding="utf-8") as fh:
                wr = csv.writer(fh)
                if new:
                    wr.writerow(["date", "folder", "original_name", "new_name"])
                wr.writerows(log_rows)
        print(f"{'would rename' if args.check else 'renamed'}: {total} file(s)")

    manifest, stats = build(args.check)
    names = [e["file"] for v in manifest.values() for e in v]
    dupes = {n for n in names if names.count(n) > 1}
    if dupes:
        sys.exit(f"Duplicate paths in manifest: {sorted(dupes)}")
    if args.check:
        print(f"check only: {stats['images']} image(s) found, nothing written")
        return
    covers = build_covers(False)
    body = json.dumps({"folders": manifest, "covers": covers}, indent=1, ensure_ascii=False)
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by tools/build_archive.py. Do not edit by hand: re-run the script instead. */\n")
        fh.write(f"window.SHAKA_ARCHIVE_MANIFEST = {body};\n")
    print(f"manifest: {stats['images']} image(s) in {len(manifest)} folder(s), {len(covers)} album cover(s) -> {rel(MANIFEST)}")
    print(f"generated: {stats['thumbs']} thumbnail(s), {stats['display']} display version(s); removed {stats['removed']} orphan(s)")


if __name__ == "__main__":
    main()
