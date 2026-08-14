'use strict';

/**
 * Firebase Cloud Functions entry point.
 *
 * The compiled Express API (`server.cjs`) is generated from the project root
 * with:  npm run build:functions
 *
 * Configuration is provided as plain environment variables on the function
 * (set them in the Firebase console -> Build -> Functions -> "api" -> Edit ->
 * Environment variables, or via the params prompt on your first deploy):
 *
 *   GOOGLE_APPS_SCRIPT_URL      - your Apps Script Web App URL
 *   GOOGLE_APPS_SCRIPT_SECRET   - must match SECRET_TOKEN in Code.gs
 *   JWT_SECRET                  - any long random string
 *   CORS_ORIGINS                - optional, comma-separated allowed origins
 *
 * The existing server/db code already reads these from process.env, so they
 * are picked up automatically. Keep this entry point free of legacy
 * functions.config() (that API is deprecated).
 */

process.env.FIREBASE_FUNCTIONS = 'true';

const { defineString } = require('firebase-functions/params');

defineString('GOOGLE_APPS_SCRIPT_URL', { required: true });
defineString('GOOGLE_APPS_SCRIPT_SECRET', { required: true });
defineString('JWT_SECRET', { required: true });
defineString('CORS_ORIGINS', { default: '' });

const { onRequest } = require('firebase-functions/v2/https');
const { getApp } = require('./server.cjs');

exports.api = onRequest(
  {
    region: 'asia-southeast1',
    maxInstances: 1,
    timeoutSeconds: 120,
  },
  async (req, res) => {
    try {
      const app = await getApp();
      return app(req, res);
    } catch (err) {
      console.error('[Firebase] Backend failed to initialize:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Backend failed to initialize: ' + (err && err.message) });
      }
    }
  }
);
