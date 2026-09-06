# Store screenshots — how to capture them

Chrome Web Store listing requirements (verify current numbers in the
dashboard): **at least one screenshot, 1280×800 or 640×400; PNG or JPG**.
We recommend **1280×800**, three shots. The dashboard may also accept optional
promotional tiles (440×280 small / 1400×560 marquee).

## Prepare

1. **Run the demo page** (it exists exactly for this):
   ```
   cd element-picker\demo
   python -m http.server 8080
   ```
   → open `http://127.0.0.1:8080/demo-page.html`.
2. **Run DeepSeek Harness** so the GUI is at `http://127.0.0.1:3080`
   (needed for the “Send” demo shot).
3. Load the extension (Developer mode → Load unpacked → `element-picker/`).
4. Resize the browser window to **exactly 1280×800** (or use DevTools device
   toolbar: `Ctrl+Shift+I` → device icon → 1280×800 → *Capture screenshot*,
   which saves the viewport at that size).

## Shot 1 — “Click an element” (hero)

Shows the core interaction: the demo page with the picker armed and an
element highlighted.

1. On the demo page press **Alt+Shift+E** (pill appears).
2. Hover over the orange **“Get started free”** hero button so the orange
   outline highlights it.
3. Capture the screenshot (must include the pill and the highlighted button).

## Shot 2 — “Write your review”

Shows the review panel with a real comment.

1. Still picking, **click** that same button.
2. In the review panel type:
   `Make this button orange and move it above the headline.`
3. Capture — the panel shows Selector, XPath, HTML and the comment.

## Shot 3 — “Delivered to the Harness chat”

Shows the payoff: the capture inside the Harness chat at 127.0.0.1:3080.

1. In the review panel press **Send to Harness chat**.
2. Switch to the Harness tab — the capture block (or a message containing it)
   is visible in the chat.
3. Capture the Harness window at 1280×800.

## Tiles (optional)

- **Small promo (440×280):** crop Shot 1 or compose icon + tagline.
- **Marquee (1400×560):** wide composite — demo page left, review panel
  center, Harness chat right, tagline overlaid.

## House rules

- No phone mockups, browser-chrome or DevTools panels visible in shots
  (viewport screenshots are fine).
- Keep text legible; the accent color is orange `#ff7a18`.
- Name files `screenshot-1-hero.png`, `screenshot-2-review.png`,
  `screenshot-3-harness.png` and upload in that order.
