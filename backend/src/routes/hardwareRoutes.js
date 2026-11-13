import { Router } from 'express';
import hardwareController from '../controllers/hardwareController.js';

const router = Router();

router.post('/scan', hardwareController.handleScan);
router.post('/served', hardwareController.handleServed);
router.get('/status', hardwareController.getStatus);
router.post('/status', hardwareController.updateStatus);
router.get('/recent', hardwareController.getRecentDistributions);

export default router;
