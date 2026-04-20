# BlurIt

👉 https://blurkit-ashy.vercel.app/

Blur anything in one click. Privately. BlurIt is a privacy-first image redaction tool. Click a face, drag a box, download a clean PNG. AI detects faces automatically, and your image never leaves your browser. No uploads. No accounts. No logs. No watermarks.

## ✨ Features

- **100% client-side**: Images are processed entirely in your browser. Nothing is ever uploaded to a server.
- **AI face detection**: Automatic face detection powered by [`@vladmandic/face-api`](https://github.com/vladmandic/face-api) running locally via TinyFaceDetector.
- **Four blur styles**: Gaussian blur, pixelate, solid redact (black bars), or emoji cover-up.
- **Two modes**: Click to blur detected faces, or Draw to box over anything (license plates, screens, logos, addresses).
- **Adjustable intensity**: Fine-tune the blur strength from subtle to fully redacted.
- **Zero friction**: No signup, no paywall, no email verification. Open the page, drop an image, ship it.

## 🚀 Quick Start

### Use it online

Just go to(https://blurkit-ashy.vercel.app/ and drop an image. That's it.

### Run locally

BlurIt is a single self-contained HTML file — no build step, no dependencies to install.

```bash
git clone https://github.com/<your-username>/blurit.git
cd blurit
```

Then either:

- Open `index.html` directly in your browser, **or**
- Serve it with any static server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Visit `http://localhost:8000` and you're done.

## 🔐 Privacy

This is the whole point of BlurIt, so here's the full story:

- Your image is read into the browser via `FileReader.readAsDataURL()` and lives only in memory.
- The face detection model is fetched once from the jsDelivr CDN and then runs entirely on your device.
- There is no server component. There is no analytics pixel. There is no logging.
- Closing the tab drops the image from memory. There's nothing to "delete" because there's nothing stored.

You can verify this by opening your browser's Network tab — after the initial page and model load, there is zero network activity, no matter how many images you process.


## 🎨 Blur Styles

| Style | Best for |
|---|---|
| **Gaussian** | Natural-looking face blur, soft redaction |
| **Pixelate** | Retro / obvious "this was hidden" look |
| **Redact** | Solid black bars — maximum redaction for documents |
| **Emoji** | Playful cover-up with a 🙂 over the face |

All styles respect the intensity slider, so you can dial in exactly how hidden you want the region to be.

## 🤝 Contributing

Contributions welcome. Since it's a single HTML file, the workflow is simple:

1. Fork the repo
2. Edit `index.html`
3. Open a PR

Please keep the "no build step, no dependencies" ethos intact unless there's a strong reason otherwise.

## 📄 License

MIT — do whatever you want with it.

## 🙏 Credits

- Face detection: [`@vladmandic/face-api`](https://github.com/vladmandic/face-api) (a maintained fork of `face-api.js`)
- Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces), [JetBrains Mono](https://www.jetbrains.com/lp/mono/), [DM Sans](https://fonts.google.com/specimen/DM+Sans)

<sub>Made for humans who don't want to be seen.</sub>
