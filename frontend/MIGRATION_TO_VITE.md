# Migration from Create React App to Vite

## What Changed

1. **Build Tool**: Switched from `react-scripts` (webpack) to `vite`
2. **Entry Point**: `src/index.js` → `src/index.jsx`
3. **HTML**: Moved `public/index.html` → `index.html` (root)
4. **Configuration**: Added `vite.config.js` with WASM and Buffer support
5. **Polyfills**: Added `src/polyfills.js` for Buffer support

## Next Steps

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Remove Old Files** (optional, after confirming everything works):
   - `src/index.js` (replaced by `src/index.jsx`)
   - `public/index.html` (moved to root)

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   (Instead of `npm start`)

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Benefits

- ✅ Native WASM support (should fix your Cardano library issues!)
- ✅ Much faster dev server and HMR
- ✅ Better handling of modern libraries
- ✅ Simpler configuration

## Notes

- The dev server now runs on port 3000 (same as before)
- API proxy is configured in `vite.config.js`
- Buffer polyfill is automatically loaded
- WASM modules should work without additional configuration

