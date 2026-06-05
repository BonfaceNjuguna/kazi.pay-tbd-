import { Router } from 'express';

import { success } from '@/utils/api-response.js';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  res.json(success({ ok: true, timestamp: new Date().toISOString() }));
});
