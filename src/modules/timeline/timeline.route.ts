import { Router } from 'express';
import { timelineController } from './timeline.ctrl.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { getTimelineSchema } from '../../schema/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/:ticketId',
  validateRequest(getTimelineSchema),
  // ✅ Safely wrapped! No more unhandled promise crashes.
  asyncHandler(timelineController.getTimeline) 
);

export { router as timelineRoutes };