# 🌊 Splash — Cardinal Grove

A cozy, browser-based city-resilience game. You look after a little storybook
town tucked between a **forest ridge** (wildfire), a **winding river** (floods),
and **restless ground** (earthquakes). Each year you decide what to protect,
**record what the season did**, gather what the town earns, and rebuild what
broke.

Built as a hand-illustrated **pop-up picture book**: warm paper palette, soft
cocoa ink, SVG buildings with live damage/protection states, and gentle
animations.

## Manual-entry edition

This version matches `splash_game_oop_manual_input_v4.py`. **Nothing is
random.** There is no seed, no hazard generation and no damage calculation:

- **You enter the hazard.** Each year the ledger offers the five hazards
  (calm year, wildfire, small flood, big flood, earthquake) and you pick the
  one that happened — after rolling dice at the table, drawing a card, or just
  deciding.
- **You enter the damage.** Splash then lists only the buildings that hazard is
  *allowed* to damage (standing, exposed, and with a repair cost defined) and
  you mark the ones that broke — by tapping them in town or ticking them in the
  ledger. Anything left unmarked came through fine.

Mitigation still costs money and is still tracked and shown (🛡 next to a
building in the damage list), but it no longer changes any odds, because you
are the one deciding the outcome.

## How to play

Each **year** moves through four steps:

1. **Plan the Year** — Tap any glowing building to shield it (🔥 fireproofing,
   🪨 earthquake reinforcement). Buy town-wide **River Defenses** (sandbags or
   levees) from the ledger on the right.
2. **The Season Turns** — Pick this year's hazard from the ledger.
3. **Record the Damage** — Mark every building the hazard wrecked. Damaged
   buildings lose their residents and earn nothing. The town then collects
   revenue.
4. **Rebuild** — Tap smoking / soaked / cracked buildings to repair them and
   bring families home, if you can afford it.

Keep your townsfolk home and your fund healthy. At the end you get a star
rating for how well Cardinal Grove weathered the years.

All of the balance — costs, exposure, mitigation prices and revenue — is
ported 1:1 from `splash_game_oop_manual_input_v4.py`.

One deliberate difference from the Python: revenue is collected **before** the
rebuild step here, so you can spend the year's income on repairs. The Python
collects it after. To match the script exactly, move the `collectRevenue()`
call in `js/ui.js` out of `afterDamage()` and into `endYear()`.

## Run it locally

ES modules need to be served over HTTP (not opened as a `file://`). From this
folder:

```bash
python3 -m http.server 4173
# then open http://localhost:4173/
```

(or any static server, e.g. `npx serve`).

## Put it on the web with GitHub Pages

GitHub Pages hosts static sites for free, which is all this game needs. Anyone
with the link can then play in their browser — no install, no Python.

**Important:** the repository must be **public** for free Pages hosting, and
`index.html` has to sit at the **root of what you publish** — so push the
*contents* of `claude_version`, not the folder itself.

### One-time setup (command line)

```bash
cd /Users/gabrielacalana/Workspace/splash_game/claude_version

git init
git add .
git commit -m "Splash — Cardinal Grove (manual-entry edition)"
git branch -M main

# create an empty PUBLIC repo on github.com first (no README, no .gitignore),
# then point this folder at it:
git remote add origin https://github.com/YOUR-USERNAME/splash-game.git
git push -u origin main
```

Then on GitHub: **Settings ▸ Pages ▸ Build and deployment**. Set **Source** to
*Deploy from a branch*, **Branch** to `main`, folder to `/ (root)`, and press
**Save**. After a minute or two the game is live at:

```
https://YOUR-USERNAME.github.io/splash-game/
```

### No-command-line alternative

On github.com: **New repository** ▸ make it **Public** ▸ **uploading an
existing file** ▸ drag in `index.html` plus the `css` and `js` folders ▸
**Commit changes**. Then turn on Pages exactly as above.

### Publishing changes later

```bash
git add .
git commit -m "Tweak balance"
git push
```

Pages redeploys automatically within a minute or so.

### Gotchas worth knowing

- **Paths are case-sensitive on Pages, but not on macOS.** `css/styles.css` and
  `js/ui.js` must match the real folder names exactly, or the page loads blank
  and unstyled. They're correct as shipped — just don't rename the folders to
  `CSS` / `JS`.
- **Hard refresh after deploying** (`Cmd+Shift+R`); Pages caches aggressively.
- The Google Fonts link needs internet access; offline players get the fallback
  serif/sans, which still looks fine.
- To keep the repo private you'd need a paid plan for Pages. Free alternatives
  that also just take a dragged-in folder: [Netlify
  Drop](https://app.netlify.com/drop) or [Cloudflare
  Pages](https://pages.cloudflare.com/).

## Assets

**No external asset files are needed** — every building, tree, cloud, the sun,
the river, hazard effects (fire, water, cracks), and the paper-grain texture
are generated as inline SVG / CSS in code:

- `js/sprites.js` — building & scenery illustrations
- `js/ui.js` — the diorama background, animations, and effects
- `css/styles.css` — palette, grain texture, motion

If you'd like to take it further, the one thing I *couldn't* generate is
**audio** (a cozy ambient loop + soft chimes for hazards/coins would add a lot).
If you want sound, drop `.mp3`/`.ogg` files in an `audio/` folder and I'll wire
them up.

## Project layout

```
claude_version/
├── index.html        # shell + title / report overlays
├── css/styles.css    # cozy storybook styling
└── js/
    ├── data.js       # game constants (ported from the v4 Python)
    ├── game.js       # SplashGame engine — applies what you enter
    ├── sprites.js    # SVG building & scenery art
    └── ui.js         # diorama, phase machine, hazard + damage entry
```

Fonts: **Fraunces** (display) + **Nunito** (UI), loaded from Google Fonts.
