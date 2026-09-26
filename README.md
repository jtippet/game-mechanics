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

    scripts/deploy.sh   # pnpm build, then rsync dist/ to /srv/static/mechanics/

That script is the only place the host appears. There is no CI deploy: the
host has no deploy account, and adding one is a substrate change.
