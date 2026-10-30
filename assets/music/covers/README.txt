SHAKA.RAW - album covers

Put one image per album in this folder (JPG, PNG or WebP, any size; a square
image of at least 600 x 600 px looks best), named exactly:

  girl-pharrell-williams.jpg
  made-bigbang.jpg
  aurora-daisy-jones-the-six.jpg
  born-in-the-u-s-a-bruce-springsteen.jpg
  rumours-fleetwood-mac.jpg

Then run:  python tools/build_archive.py
It makes a square 600 x 600 WebP copy in web/ (originals are left untouched)
and the Music section picks it up automatically, with alt text.
Albums without a file keep the vinyl-sleeve placeholder.

Vinyl wishlist records work the same way: "title-artist", lowercase, words
joined by hyphens, e.g. random-access-memories-daft-punk.jpg
Only use images you have the right to publish (for example, your own photo
of a record you own).
