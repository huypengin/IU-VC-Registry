/**
 * DID Web Service Entry Point
 * Main entry point for the DID creation and serving system
 */

import { createDID } from './src/app.js';

// Start the DID service
createDID().catch(console.error);
