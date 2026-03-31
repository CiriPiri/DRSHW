import { Router, NextFunction } from 'express';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { getTimelineSchema } from '../../schema/index.js';
import { timelineController } from './timeline.ctrl.js'; 

const router = Router();

router.get(
  '/:ticketId',
  validateRequest(getTimelineSchema),
  // ✅ THE TS FIX: Bypass the Express generic type clash using 'any'
  (req: any, res: any, next: NextFunction) => timelineController.getTimeline(req, res, next)
);

export { router as timelineRoutes };