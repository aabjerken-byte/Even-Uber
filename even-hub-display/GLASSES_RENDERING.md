# Rendering to the G2 Glasses

**The React component tree does not appear on the glasses.** It is a phone-side
preview. Output to the G2 goes through the Even Hub SDK's container model, which
is implemented in [`src/glasses/`](src/glasses/).

This surprises people, and the project's own docs asserted otherwise for a
while, so it's worth being explicit.

---

## How it actually works

The page runs inside the **Even App's WebView**, where the host injects
`window.flutter_inappwebview.callHandler`. The SDK bridges to it. Rendering to
the glasses means creating absolutely positioned **containers** once, then
updating their contents in place:

```ts
const bridge = await waitForEvenAppBridge()

await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({ ... }))
await bridge.textContainerUpgrade(new TextContainerUpgrade({
  containerID: 4, containerName: 'eta', content: '3 MIN'
}))
```

There is no HTML, no CSS, and no layout engine on the glasses. What you write is
what gets drawn.

> The SDK's README shows plain object literals in these calls. The shipped
> TypeScript types require **class instances** — they carry a `toJson()` used on
> the way to native. `renderer.ts` constructs them at the boundary.

## Constraints

Taken from the SDK's own type declarations, not the README — which omits the
image cap:

| Constraint | Value |
|---|---|
| Total containers | 1–12 |
| Text containers | max 8 |
| Image containers | max 4 |
| Image width | 20–288 px |
| Image height | 20–144 px |
| Event capture | exactly one container with `isEventCapture: 1` |
| `zOrderIndex` | all containers or none; unique when present |

`validateLayout()` in `layout.ts` enforces every one of these before we call the
SDK, because a violation otherwise comes back as a bare
`StartUpPageCreateResult.invalid` with no indication of what was wrong.

## Layout

Five text containers on the left, the map image on the right:

```
┌──────────────────────────────┬──────────────────┐
│ John D. ★4.9        (driver) │                  │
│ Silver Toyota Prius (vehicle)│                  │
│ Plate ABC123        (plate)  │   map (image)    │
│                              │   280 × 144      │
│ 3 MIN               (eta)    │                  │
│ ON THE WAY          (status) │                  │
└──────────────────────────────┴──────────────────┘
                576 × 288
```

Six containers total — comfortably inside every limit, leaving headroom.

## Files

| File | Role |
|---|---|
| `constants.ts` | Geometry, container IDs, SDK limits |
| `layout.ts` | Container definitions + validation. No SDK imports, so it's testable without a device |
| `format.ts` | `RideData` → the text for each container; diffing |
| `rasterize.ts` | Draws the map to a canvas and converts to bytes |
| `bridge.ts` | Acquires the bridge, or reports its absence |
| `renderer.ts` | Lifecycle, SDK type conversion, incremental updates |
| `useGlasses.ts` | React hook wiring it to the current ride |

## Running in a browser

`acquireBridge()` feature-detects `window.flutter_inappwebview.callHandler`
before doing anything, and races `waitForEvenAppBridge()` against a 5-second
timeout. Outside the Even App you get one console line —

```
ℹ️ Not running in Even App WebView — glasses output disabled
```

— and the page behaves like an ordinary web app. `npm run dev` is unaffected.

The SDK is loaded with a dynamic `import()`, so it is code-split out of the main
bundle and never fetched in a plain browser.

## Efficiency

Every update crosses a Bluetooth LE link, so:

- Text is **diffed** — only lines whose content changed are sent, not all five
  on every 2-second poll.
- The map image is re-sent only when the coordinates or ETA actually change.
  It is by far the most expensive payload.

## ⚠️ Not verified on hardware

This was built against the SDK's types and documentation without a G2 to test
on. Two things need confirming on a real device:

1. **Image byte format.** `RASTER_FORMAT` in `rasterize.ts` currently sends 8-bit
   grayscale, one byte per pixel, which matches the README's annotation of
   `imageData` as "grayscale bytes". But `ImageRawDataUpdateResult` includes an
   `imageToGray4Failed` case, implying the host converts an encoded image
   itself and would rather receive PNG. Both are implemented — flip the constant
   if grayscale is rejected.

2. **Text sizing.** `MAX_CHARS` in `format.ts` is a conservative guess; the host
   chooses the font, so the real character budget per container is unknown.
   Truncation is safer than letting the host clip mid-glyph, but the numbers
   deserve tuning once you can see them.

Everything that can be checked without hardware is covered by
`glasses.test.ts` — layout validity against all documented limits, text
formatting and truncation, diffing, and the grayscale conversion.
