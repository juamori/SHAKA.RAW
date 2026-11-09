/* ==========================================================================
   SHAKA.RAW — content configuration
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit to personalize the site.
   Every section of the website is built from the data below.

   Legend used in the comments:
     [confirmed]  information the creator has provided
     [optional]   nice to have; leave empty and the site hides it gracefully
     [missing]    not provided yet; the site shows a tidy empty state

   Rules of thumb:
     - Keep the quotes "like this" around text.
     - Put a comma after every item in a list, like the examples show.
     - External links must start with https:// (or mailto:).
     - Local files (images, audio) go in the /assets folder and are written
       like "assets/my-photo.jpg".
   ========================================================================== */

window.SHAKA_CONFIG = {

  /* ---------- Site identity [confirmed] ---------- */
  site: {
    name: "SHAKA.RAW",
    os: "SHAKA OS",
    tagline: "no algorithm, just me",
    established: 2001,           // the creator's birth year, not a launch date
  },

  identity: {
    displayName: "Shaka",
    username: "shaka",
    nickname: "Ko",
    nicknameNote: "short for koala",
    prompt: "ko@shaka:~$",       // alternative: "user@shaka.raw:~$"
  },

  /* ---------- About me [confirmed] ----------
     Shown on the About page, the home status widget and in the terminal.
     Leave a field as "" to hide it. */
  profile: {
    name: "Shaka or Ko (koala)",
    occupation: "Software Engineer",
    location: "Everywhere",
    currentlyInto: "Programming random things",
    status: "Cleaning my vinyl collection",
    funFact: "My arm hurts.",
  },

  /* ---------- Short biography [provisional] ----------
     One string per paragraph. The second paragraph is also used as the
     short intro on the home page. Candidate lines to swap in later:
       "A little corner of the internet filled with random thoughts, music, code, and whatever else happens to exist in my brain."
       "Somewhere between lines of code, old internet nostalgia, music, and a few questionable decisions."
       "Software engineer by day, professional collector of random interests by night."
       "Just Shaka, a computer, too many interests, and an unreasonable amount of tabs open."
       "An independent system for one human being. No algorithm, no particular destination."  */
  bio: [
    "Born in 2001. Digitally wandering ever since.",
    "A personal archive of things I like, things I make, and things I probably forgot about.",
    "No algorithm, just me.",
  ],

  /* ---------- Avatar [optional / missing] ----------
     Leave src empty to show the pixel koala placeholder.
     Example: { src: "assets/avatar.jpg", alt: "Shaka's avatar" } */
  avatar: { src: "", alt: "" },

  /* ---------- Music [confirmed] ----------
     artists:   { title: "Name" }                       (shown in this order, no ranking)
     albums:    { title, artist, note, cover? }         cover = optional image path or https URL
     playlists: { title, url, tags?, cover? }           tags are mood labels, not genres
     wishlist:  { title, artist, status, cover? }       status: "want" | "hunting" | "acquired"
                -> got a record? just change its status to "acquired".
     tracks:    { title, artist, src, url }             src = local audio file -> playable in the player
     cassettes: reserved for later (the site ignores it for now). */
  music: {
    nowListening: null,

    artists: [
      { title: "Green Day" },
      { title: "Queen" },
      { title: "Zara Larsson" },
      { title: "blink-182" },
      { title: "Daisy Jones & The Six" },
      { title: "George Michael" },
      { title: "ABBA" },
      { title: "Post Malone" },
      { title: "Troye Sivan" },
      { title: "Fleetwood Mac" },
    ],

    albums: [
      { title: "GIRL", artist: "Pharrell Williams",
        note: "It's the sound, and the nostalgia of when it came out. I was the music nerd back then, and this album is that whole era." },
      { title: "MADE", artist: "BIGBANG",
        note: "My comfort group. I don't really follow K-pop anymore, but BIGBANG has been a favorite since I was seven." },
      { title: "Aurora", artist: "Daisy Jones & The Six",
        note: "I love all of it: the sound, the era, the series, the characters, the whole idea of a fictional band. It has that Fleetwood Mac feeling, which my mom loves too. She's always asking me to put them on." },
      { title: "Born in the U.S.A.", artist: "Bruce Springsteen",
        note: "Time with my dad. Driving home after fishing, rock playing in the living room in the afternoon, vinyl on the turntable." },
      { title: "Rumours", artist: "Fleetwood Mac",
        note: "I love everything about it: the arrangements, the vocals, the mystique. Honestly, it's hard to put into words." },
    ],

    playlistsHeading: "public.playlists // currently on repeat",
    playlistsSubtitle: "Different moods, different universes. All mine.",
    // true = the visitor's browser asks Spotify for each playlist's cover art.
    // If that fails (or you set false), a styled placeholder cover is shown.
    // To pin an image yourself, add cover: "https://..." to a playlist.
    fetchPlaylistArtwork: true,
    playlists: [
      { title: "Horizonte", url: "https://open.spotify.com/playlist/0lnYjiM6YWfAyyXzOv2rKz", tags: ["Driving", "Cinematic", "Atmosphere"] },
      { title: "Eletrohits de verano", url: "https://open.spotify.com/playlist/0p4c2X5R1ahPNF5mTIErVn", tags: ["Summer", "Chaos", "Unexpected"] },
      { title: "Teenage dirtbag", url: "https://open.spotify.com/playlist/19iF69o7mA4Yc4ySuUPcR2", tags: ["Y2K", "Alternative", "Nostalgia"] },
      { title: "For once in my life", url: "https://open.spotify.com/playlist/5z3E9f1t1TnFMocdu4KH5K", tags: ["Vinyl", "Soul", "Feelings"] },
    ],

    // Records I want. Editions are not specified on purpose.
    wishlist: [
      { title: "Greatest Hits", artist: "Aerosmith", status: "want" },
      { title: "Greatest Hits", artist: "AC/DC", status: "want" },
      { title: "Greatest Hits", artist: "Green Day", status: "want" },
      { title: "Random Access Memories", artist: "Daft Punk", status: "want" },
      { title: "Something to Tell You", artist: "HAIM", status: "want" },
      { title: "Teatro d'ira: Vol. I", artist: "Måneskin", status: "want" },
      { title: "A Star Is Born", artist: "Soundtrack", status: "want" },
      { title: "CALM", artist: "5 Seconds of Summer", status: "want" },
    ],

    tracks: [],
    cassettes: [],
    notes: "",
  },

  /* ---------- Interests [confirmed folders] ----------
     folder: the folder name shown on screen
     description: one or two short lines
     items: optional entries { title, note? } */
  interests: [
    { folder: "cosmic_curiosity", category: "Physics and science",
      description: "Physics and science, the deeper the better. A long-running pull toward how everything actually works.",
      items: [ { title: "Physics" }, { title: "Science" } ] },
    { folder: "final_frontier", category: "Star Trek, Star Wars and sci-fi",
      description: "Science fiction in all its forms. Star Wars matters, but Star Trek wins.",
      items: [ { title: "Star Trek", note: "the favorite" }, { title: "Star Wars" }, { title: "Science fiction" } ] },
    { folder: "save_file.exe", category: "Gaming and The Sims",
      description: "The Sims has been around since I was a kid, and it still is: building, storytelling, interior design.",
      items: [ { title: "The Sims", note: "since childhood" }, { title: "Gaming" } ] },
    { folder: "analog_archive", category: "Music, vinyl and cassette tapes",
      description: "Music, and the physical side of it. Records, tapes, and the slow business of collecting.",
      items: [ { title: "Vinyl records", note: "60+ and counting" }, { title: "Cassette tapes" }, { title: "Music" } ] },
    { folder: "creative_mode", category: "Programming, technology and making things",
      description: "Building things to see what happens. Some work, some don't, all of them count.",
      items: [ { title: "Programming random things", note: "currently" }, { title: "Technology" }, { title: "Making things" } ] },
    { folder: "side_quests", category: "Tennis, Formula 1, books and more",
      description: "Everything that doesn't fit in another folder.",
      items: [ { title: "Tennis" }, { title: "Formula 1" }, { title: "Books" } ] },
  ],

  /* ---------- Lab / projects [missing] ----------
     Example:
       {
         name: "Tiny synth",
         description: "A browser synth I made on a rainy weekend.",
         category: "Web experiments",
         status: "in progress",          // e.g. idea, in progress, done, abandoned
         tech: ["JavaScript", "Web Audio"],
         thumbnail: "assets/lab/synth.png",   // optional
         url: "https://...",                  // optional, public links only
       },  */
  projects: [
    {
      name: "Things I Never Sent",
      // Temporary, neutral description: replace with your own words.
      description: "A creative project, live on the web.",
      category: "Creative project",
      status: "online",
      tech: [],
      url: "https://thingsineversent.netlify.app/",
    },
  ],

  /* ---------- Links [missing] ----------
     Only links listed here appear on the site. Never add private profiles.
     { label, handle (display name), note (optional context), url }
     Example:
       { label: "GitHub",  handle: "@shaka", url: "https://github.com/your-user" },
       { label: "SpaceHey", url: "https://spacehey.com/your-profile" },  */
  links: [
    { label: "Patreon", handle: "Kowannabe", note: "Custom builds and lots for The Sims 4.", url: "https://www.patreon.com/cw/Kowannabe" },
    { label: "Letterboxd", handle: "Kowannabe", note: "Public film profile.", url: "https://letterboxd.com/Kowannabe/" },
    { label: "Spotify", handle: "Public music profile", url: "https://open.spotify.com/user/12156161019" },
    { label: "SpaceHey", handle: "Kowannabe", note: "my corner of the old internet", url: "https://spacehey.com/kowannabe" },
  ],

  /* ---------- Archive [folders confirmed, no files yet] ----------
     The archive is a set of folders. Folders can hold images and/or subfolders.

     Images are found automatically: put the file in its folder under assets/archive/
     and run  python tools/build_archive.py --rename  (or let the GitHub Action do it).
     You only add an entry below when you want to give an image details. Match it
     by its file path; every field except file is optional. hidden: true hides an
     image without deleting it.

     Example entry (details for an existing file):
            {
              file: "assets/archive/forza_horizon/sunset-run.jpg",     // required
              alt: "Orange car on a coastal road at sunset",          // describe the image (accessibility)
              title: "Sunset run",                                    // optional
              date: "2026-10-12",                                     // optional
              description: "One sentence, if you want.",              // optional
              meta: { car: "...", location: "..." },                  // optional, any labels you like
              source: "https://...",                                  // optional original-source link
            },
     Anything left out (or left "") is simply not shown.
     Items appear in the order listed. Newest-first is a nice habit.

     setups/ entries can use meta: { year: "2024", hardware: "..." } the same way.
     id must be lowercase letters, numbers, _ or -. It is also the folder's address:
     #archive/crash_romance/members  */
  archive: {
    // Folders with no files are hidden on the site until you add something to them.
    // The empty ones below are reserved for later; adding a file makes them appear.
    folders: [
      { id: "visual_noise", description: "", items: [] },
      { id: "digital_artifacts", description: "", items: [] },
      { id: "physical_media", description: "", items: [] },
      { id: "currently_observed", description: "", items: [] },
      { id: "unsorted", description: "", items: [] },

      { id: "static",
        description: "STATIC, my fictional punk band: character portraits, promo images, artwork and other visual material.",
        // Images are picked up automatically; these lines only add titles.
        items: [
          { file: "assets/archive/static/static-001.png", title: "STATIC: Too Loud to Ignore" },
          { file: "assets/archive/static/static-002.png", title: "Gritty Fisheye Punk Band Portrait" },
          { file: "assets/archive/static/static-003.png", title: "Punk Trio Behind Velvet Curtains" },
          { file: "assets/archive/static/static-004.png", title: "Moody Sims-Style Casino Crew Portrait" },
          { file: "assets/archive/static/static-005.png", title: "Fisheye Punk Band Rehearsal Portrait" },
          { file: "assets/archive/static/static-006.png", title: "Punk Chaos Magazine Cover" },
          { file: "assets/archive/static/static-007.png", title: "Gritty Punk Portrait Against Red Wall" },
          { file: "assets/archive/static/static-008.png", title: "Punk Portrait Against Crimson Walls" },
          { file: "assets/archive/static/static-009.png", title: "Gritty Punk Rock Stage Portrait" },
          { file: "assets/archive/static/static-010.png", title: "Gritty Punk Backstage Band Portrait" },
          { file: "assets/archive/static/static-011.png", title: "Retro Punk Duo Under Blue Skies" },
          { file: "assets/archive/static/static-012.png", title: "Alt Trio Sharing Secrets" },
          { file: "assets/archive/static/static-013.png", title: "Warm Punk Roommate Selfie" },
          { file: "assets/archive/static/static-014.png", title: "Punk Trio Squished Selfie" },
          { file: "assets/archive/static/static-015.png", title: "Punk Trio Snapshot in a Cosy Room" },
          { file: "assets/archive/static/static-016.png", title: "Crash Romance: A Moody Memory Collage" },
          { file: "assets/archive/static/static-017.png", title: "Goth Trio Presenting in a Tiled Hallway" },
          { file: "assets/archive/static/static-018.png", title: "Gothic Trio in a Tiled Studio" },
        ] },

      { id: "crash_romance",
        description: "Crash Romance, my fictional five-member boy band.",
        // Images are picked up automatically; these lines only add titles.
        items: [
          { file: "assets/archive/crash_romance/crash-romance-001.png", title: "Punk Heroes Poster" },
          { file: "assets/archive/crash_romance/crash-romance-002.png", title: "Five Friends in a Flash-Lit Selfie" },
          { file: "assets/archive/crash_romance/crash-romance-003.png", title: "Cosmic Turtle Bandmates" },
          { file: "assets/archive/crash_romance/crash-romance-004.png", title: "Chaotic Bandmates in a Bubble Bath" },
          { file: "assets/archive/crash_romance/crash-romance-005.png", title: "Neon-Lit Rock Band Portrait" },
          { file: "assets/archive/crash_romance/crash-romance-006.png", title: "Cosy Loft Gaming Hangout" },
          { file: "assets/archive/crash_romance/crash-romance-007.png", title: "Pop-Punk Notebook Collage" },
          { file: "assets/archive/crash_romance/crash-romance-008.png", title: "Sunlit Poolside Friends Retreat" },
          { file: "assets/archive/crash_romance/crash-romance-009.png", title: "Tyler Morgan Zine Profile" },
          { file: "assets/archive/crash_romance/crash-romance-010.png", title: "Dylan Brooks Zine Poster" },
          { file: "assets/archive/crash_romance/crash-romance-011.png", title: "Mason Carter: Crash Romance Collage" },
          { file: "assets/archive/crash_romance/crash-romance-012.png", title: "Adrian Reyes Zine Collage" },
          { file: "assets/archive/crash_romance/crash-romance-013.png", title: "Noah Bennett Zine" },
        ],
        folders: [
          { id: "members", description: "", items: [] },
          { id: "photoshoots", description: "", items: [] },
          { id: "eras", description: "", items: [] },
          { id: "artwork", description: "", items: [] },
          { id: "memorabilia", description: "", items: [] },
        ] },

      { id: "forza_horizon",
        description: "Screenshots and photos I've taken in Forza Horizon.",
        items: [] },

      { id: "setups",
        description: "My computer setups over the years.",
        items: [] },

      // Videos live in assets/video/ (outside assets/archive/, so the image script ignores them).
      // To add one: put the .mp4 in assets/video/, a poster image in assets/video/posters/,
      // and add an entry below. Use H.264/AAC MP4 files under ~25 MB for easy uploads.
      { id: "audiovisual",
        description: "Personal video archive.",
        items: [],
        videos: [
          { file: "assets/video/bigbang-blue.mp4", poster: "assets/video/posters/bigbang-blue.jpg",
            title: "BIGBANG — Blue", width: 1920, height: 1080, duration: "0:48" },
          { file: "assets/video/f1-project.mp4", poster: "assets/video/posters/f1-project.jpg",
            title: "F1 — Project", width: 1920, height: 1080, duration: "0:43" },
        ] },
    ],
  },

  /* ---------- Ko & terminal messages ----------
     Ko says one of these now and then (home caption, "ko" command, 404 page). */
  ko: {
    messages: [
      "ko.exe is running. probably.",
      "no thoughts. just RAM.",
      "system status: emotionally attached to this computer.",
      "please wait. ko is thinking.",
    ],
    notFound: "404: koala wandered off.",
  },
  terminal: {
    fortunes: [
      "today's forecast: 90% chance of opening another tab.",
      "the record you're looking for is in the last crate you check.",
      "a semicolon you forgot is waiting for you.",
      "you will find a song you forgot you loved.",
      "the algorithm can't find you here. good.",
      "rest your arm. ko insists.",
    ],
  },

  /* ---------- Look & feel ----------
     theme: "purple" | "blue" | "amber"
     effects: true shows scanlines / grain / boot screen (visitors can turn it off) */
  theme: {
    default: "purple",
    effects: true,
  },
};
