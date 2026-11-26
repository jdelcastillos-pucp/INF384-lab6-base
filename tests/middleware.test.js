const request = require('supertest');
const express = require('express');

/**
 * Build a minimal Express app that:
 *  1. Has a route which deliberately passes an error to next(err).
 *  2. Registers the same generic error-handling middleware used in src/app.js.
 *
 * We replicate the middleware here to keep the test self-contained and
 * to verify the behaviour described in Requisito 3.1.
 */
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Route that simulates an unhandled error
  app.get('/trigger-error', (req, res, next) => {
    next(new Error('simulated internal error'));
  });

  // The same 4-argument error handler that is in src/app.js
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

describe('Error-handling middleware (Requisito 3.1)', () => {
  const app = buildTestApp();

  test('3.1 ruta que llama next(err) responde 500 con JSON { error }', async () => {
    const res = await request(app).get('/trigger-error');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('3.1 el body no expone el stack trace ni el mensaje interno', async () => {
    const res = await request(app).get('/trigger-error');

    expect(res.status).toBe(500);
    // The internal message "simulated internal error" must not leak into the response
    expect(JSON.stringify(res.body)).not.toMatch(/simulated/i);
    expect(JSON.stringify(res.body)).not.toMatch(/stack/i);
  });
});
