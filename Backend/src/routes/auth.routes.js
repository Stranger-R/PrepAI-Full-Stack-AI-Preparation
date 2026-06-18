const express = require("express");
const authController = require("../controller/auth.controller");
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 *
 * Body:
 * {
 *   "username": "john123",
 *   "email": "john@example.com",
 *   "password": "123456"
 * }
 */
router.post("/register", authController.userRegisterController);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 *
 * Body:
 * {
 *   "email": "john@example.com",
 *   "password": "123456"
 * }
 */
router.post("/login", authController.userLoginController);

/**
 * @route   GET /api/auth/logout
 * @desc    Logout user
 * @access  public
 */
router.get("/logout", authController.userLogoutController);

/**
 * @route   GET /api/auth/get-me
 * @desc    Get current logged-in user details
 * @access  Private (requires authentication)
 */

router.get("/get-me", authMiddleware.authMiddleware, authController.GetMeController);

router.post("/verify-email", authController.verifyEmail);

module.exports = router;