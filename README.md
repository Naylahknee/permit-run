# Permit Run: California

A calm, game-style app that helps a learner study for the California Class C
driver's permit (knowledge) test. It is designed for someone who learns best with
pictures, motion and sound and can be overwhelmed by too much at once.

## What's where

| Folder | What it is |
| --- | --- |
| [`app/`](app/) | **The game.** An installable, offline web app (PWA) for iPhone and Android, including the 3D Road Test. Start with [`app/README.md`](app/README.md). |
| [`project/`](project/) | The Claude Design asset kit (v1): 135 SVG assets, the kit page, and the DMV handbook PDF the questions come from. |
| `Permit Run Asset Kit v2.dc.html` | The v2 kit page. Its `assets-v2/` image files are not in this repository yet. |
| [`chats/`](chats/) | The design conversation that produced the asset kit. |
| [`tools/`](tools/) | Build scripts: copy assets into the app and refresh the offline file list. |

## Play it

Serve the `app/` folder with any static web server and open it in a browser:

```sh
cd app
npx http-server -p 8080 -c-1
```

To put it on a phone, host `app/` on any HTTPS static host (for example GitHub Pages),
open the link on the phone, and choose **Add to Home Screen**.

## Content

Questions are written from the *California Driver's Handbook* (California DMV, 2025),
licensed CC BY-NC 4.0. This is a practice tool and is not made by the DMV.
