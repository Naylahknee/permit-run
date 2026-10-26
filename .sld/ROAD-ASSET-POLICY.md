# SLD road-asset policy for Permit Run

**Allowed:** Add new signs and signal SVGs. Redesign existing sign and signal SVGs, with a visible human-review notice.

**Blocked:** Delete an existing sign or signal SVG, or add/modify an invalid or unsafe SVG.

SLD's line-count preservation check cannot distinguish a complete redraw of a single-line SVG from substantial content loss. To address that specific limitation:

- `.sld/settings.mjs` excludes only `app/assets/signs/*.svg` and `app/assets/signals/*.svg` from the SLD line-count heuristic. Other SLD layers still apply.
- `.sld/validate-road-assets.mjs` validates those two directories separately, and runs for every PR before SLD checks the change. It rejects true deletions, unsupported statuses, executable content, external URLs, missing SVG structure, and oversized assets.
- `.sld/validate-road-assets.test.mjs` verifies the rule on additions, replacements, deletions, bad assets, and out-of-scope source code.

**Not allowed by this policy:** Deleting assets, changing the SLD engine, modifying app behavior or code, or bypassing protections for scenes, tiles, or other files.

After making changes, run:

```bash
node --test .sld/validate-road-assets.test.mjs
node .sld/validate-road-assets.mjs origin/main
node .sld/vendor/cli/sld.js check origin/main --manifest .sld/settings.mjs --human
```

The change maintains the default SLD preservation rule for all other file types.
