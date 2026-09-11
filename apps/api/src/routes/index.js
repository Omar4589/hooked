import { Router } from 'express';

// Everything mounts under /api (app.js). Phase 7 adds /auth, /me, /wallet, /codes,
// /attempts, /config, /webhooks/revenuecat and /admin/* (DESIGN.md §11 Backend).
const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'hooked-api', time: new Date().toISOString() });
});

export default router;
