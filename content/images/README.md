# Reference photos

One optional photo per entry, referenced from the entry's `image` field:

```json
"image": {
  "file": "pirates-exit-bells-mickey.jpg",
  "alt": "Three small brass bells near the ceiling forming the classic shape",
  "credit": "Nick S."
}
```

Rules, enforced by `npm run content:build`:

- The file lives in this folder and its name matches the `file` value.
- Lowercase kebab-case name, ending in `.jpg`, `.jpeg`, `.png`, or `.webp`.
- At most 300 KB. Aim for about 1200 px on the long side as a JPEG; every
  photo ships inside the app, so size adds up fast.
- `alt` is required. Say what the photo shows, for screen readers and for
  when the image can't load.
- `credit` is optional and appears under the photo.

Keep them yours and keep them tight: your own photo, cropped to the detail
itself rather than the attraction around it. No character art, logos, or
anything lifted from a park map or website. A photo that gives away the find
is the point, which is why the app blurs it until the guest asks to see it
while hints are on.
