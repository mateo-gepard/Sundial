# Armreif Sundial Converter - Setup Instructions

## Quick Start

1. Place your `Armreif.png` image in the same folder as the HTML files
2. Open `index.html` in a modern web browser (Chrome, Safari, Firefox, Edge)
3. The app will run immediately - no build process required

## Configuration

To adjust the app for your specific location and bracelet calibration, edit the `CONFIG` object in `app.tsx`:

### Location Settings
```javascript
latitude: 48.1351,        // Your latitude in degrees
longitude: 11.5820,       // Your longitude in degrees
timezoneOffset: 1,        // Your timezone offset from UTC (CET = 1, CEST = 2)
```

### Reference Date
```javascript
referenceDate: new Date('2025-06-21'), // The date your bracelet was calibrated
```

### Bracelet Image Coordinates
If your bracelet image has different dimensions or number positions:

```javascript
imageNaturalWidth: 2880,  // Actual pixel width of Armreif.png
imageNaturalHeight: 1200, // Actual pixel height of Armreif.png

braceletCoords: {
    14: { x: 908, y: 600 },   // X,Y coordinates of number 14
    15: { x: 747, y: 600 },   // X,Y coordinates of number 15
    16: { x: 573, y: 600 },   // etc...
    17: { x: 405, y: 600 },
    21: { x: 2266, y: 600 },
    22: { x: 2112, y: 600 },
}
```

To find these coordinates:
1. Open Armreif.png in an image editor
2. Hover over each engraved number to read its X,Y pixel coordinates
3. Update the values in the config

## File Structure
```
Armreif/
├── index.html      (Main HTML structure)
├── styles.css      (Neumorphic design system)
├── app.tsx         (React app logic)
├── Armreif.png     (Your bracelet image - ADD THIS)
└── README.md       (This file)
```

## Browser Compatibility
- ✅ Chrome/Edge (recommended)
- ✅ Safari (iOS and macOS)
- ✅ Firefox
- ✅ Mobile browsers

## Customization Tips

### Colors
Edit the `:root` variables in `styles.css`:
```css
--surface: #e8ecf1;           /* Main background color */
--text-primary: #2d3748;      /* Primary text */
--text-secondary: #718096;    /* Secondary text */
```

### Shadows
Adjust the neumorphic shadow intensity:
```css
--shadow-raised: 8px 8px 16px rgba(...);
--shadow-pressed: inset 4px 4px 8px rgba(...);
```

### Typography
Change the font in `styles.css`:
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

## Deployment

For production deployment:
1. Use a proper build system (Vite, Create React App, etc.) with TypeScript support
2. Replace the CDN React libraries with npm packages
3. Optimize the bracelet image (compress, use WebP format)
4. Add a service worker for offline functionality

## Troubleshooting

**Image not showing:**
- Ensure `Armreif.png` is in the same folder as `index.html`
- Check browser console for errors
- Verify image path and filename (case-sensitive on some systems)

**Slider not working correctly:**
- Verify `imageNaturalWidth` matches your actual image width
- Check that bracelet coordinates are accurate
- Ensure coordinates are within image bounds

**Time calculations seem wrong:**
- Verify latitude/longitude are correct
- Check timezone offset (use DST-aware value if needed)
- Confirm reference date matches bracelet calibration

## Support

For questions or issues:
- Check browser console for error messages
- Verify all configuration values are correct
- Ensure Armreif.png is properly formatted and accessible

---

Designed with love for Theresa 🌞
