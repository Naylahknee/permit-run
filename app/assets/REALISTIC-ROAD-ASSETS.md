# Permit Run: California road-visual assets (October 2026)

Designed for the existing lightweight PWA. No question logic was changed.

## Included

- **10 regulatory/warning sign faces:** refined standalone signs in `assets/signs/` used by existing recognition questions.
- **9 signal states:** circular and left-arrow red/yellow/green, flashing circular red/yellow, and newly added flashing yellow left arrow in `assets/signals/`.
- **3 pedestrian signals:** walk, don't walk and countdown.
- **6 driver-eye scenes:** `real-signs-street`, `real-signal-intersection`, `real-protected-left-turn`, `real-school-crosswalk`, `real-railroad-crossing`, and `real-curve-warning` under `assets/scenes/`.
- Existing top-down interactive scenarios remain untouched.

## Visual accuracy & limitations

Signs use designations from California MUTCD sign charts supplied by the project owner. These charts are dated March 10, 2023 (2014 Rev. 3). California MUTCD **2026** took effect January 18, 2026; refer to the 2026 manual for current requirements. The pictorial scene illustrations are **not photographs, engineering drawings, or complete sign-installation specifications**. Fonts, placements, scale, visibility, traffic-signal wiring and geometry are approximations for driver education. The drawings are vector SVG so remain crisp on high-density devices.

Signal assets depict a **single static illuminated phase** (including flashing signals), to avoid misleading blink timing and motion sensitivity. Lesson rules come from the California Driver's Handbook, not from artwork. In a real intersection follow the posted controls.

## Offline support

`app/precache.js` includes every new scene and the flashing-yellow-arrow SVG. Run `node tools/build.mjs --no-icons` after further changes to rebuild the file inventory and hash.

## References

- California MUTCD 2026: https://dot.ca.gov/programs/safety-programs/camutcd
- California MUTCD Sign Charts: https://dot.ca.gov/programs/safety-programs/sign-charts
- California DMV Driver Handbook: https://qr.dmv.ca.gov/portal/handbook/california-driver-handbook/laws-and-rules-of-the-road/

Not affiliated with the California DMV or Caltrans.