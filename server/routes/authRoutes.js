import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';  // No need to import `User` here

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
