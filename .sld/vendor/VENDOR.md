# The SLD engine files (do not edit)

The `vendor/` folder is an exact copy of the SLD engine, installed from the
SLD repo at the version recorded in `.core-version`.

**Do not edit these files here.** If the engine needs a fix or an improvement,
it gets fixed in the SLD repo and re-installed here. Editing them in place
will fail the automatic engine check (it compares every file against
`.core-hashes.json`).

Your project's own settings live outside this folder:

- `.sld/settings.mjs` — your project's SLD settings (safe to edit; plain words)
- `.sld/baseline.json` — what "normal" looked like when SLD was installed
- `.github/workflows/sld-check.yml` — the automatic check that runs on every change

To install a newer engine version, re-run the SLD installer.
