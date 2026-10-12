# mechanics

A sampler of 2D game mechanics: pick one from the menu, play with it on a
canvas. Not a game. Each demo shows one mechanic on the same flat tile art.

Design: `docs/superpowers/specs/2026-09-26-mechanics-sampler-design.md`.

## Develop

    pnpm install
    pnpm dev          # http://localhost:5173/
    pnpm test         # vitest, Node only
    pnpm typecheck
    pnpm build        # dist/, relative asset URLs, works at any path

## Deploy

`dist/` is plain files; put it on any web server at any path. Hash routing
means no server-side rewrite is needed.

The first host is static.tippet.net, filled by hand:

    scripts/deploy.sh   # pnpm build, then tar dist/ over ssh into /srv/static/mechanics/

That script is the only place the host appears. There is no CI deploy to it:
the host has no deploy account, and adding one is a substrate change.

### GitHub Pages

`.github/workflows/pages.yml` builds and publishes `dist/` to GitHub Pages on
every push to `main` (and on demand from the Actions tab). The site then lives
at `https://<user>.github.io/<repo>/`; the relative base and hash routing need
nothing else. Both jobs skip anywhere but github.com, so the same file sitting
in the Forge repository does nothing there.

One-time setup:

1. Create the GitHub repository (public: Pages on a private repository needs
   a paid plan) and push `main` to it:

       git remote add github git@github.com:<user>/<repo>.git
       git push github main

2. In the repository's Settings, Pages, set Source to "GitHub Actions".
3. The first run was already queued by the push; re-run it (or push again)
   if it ran before the source was set.

Note the homelab copy sits behind SSO; the GitHub copy is public.
