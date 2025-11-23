// Polyfills for Node.js built-ins in browser
import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

// Export for use in modules
export { Buffer };

