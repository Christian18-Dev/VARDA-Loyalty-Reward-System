import express from 'express';
import { claimCode } from '../controllers/codeController.js';

const router = express.Router();

router.post('/claim-code', claimCode); // POST /api/code/claim-code

export default router;
