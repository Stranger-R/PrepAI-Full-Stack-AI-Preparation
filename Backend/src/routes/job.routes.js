const express = require("express");
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/file.middleware');
const jobController = require('../controller/job.controller');

const jobRouter = express.Router();

/**
 * @route   POST /api/jobs/match
 * @desc    Find matching market jobs based on resume upload, profile, or search filters
 * @access  Private
 */
jobRouter.post("/match", authMiddleware.authMiddleware, upload.single('resume'), jobController.findMatchingJobsController);

/**
 * @route   GET /api/jobs/available
 * @desc    Fetch general market jobs with optional search/filter query params
 * @access  Private
 */
jobRouter.get("/available", authMiddleware.authMiddleware, jobController.getAvailableJobsController);

/**
 * @route   POST /api/jobs/generate-email
 * @desc    Draft an AI cold email tailored to a job opening
 * @access  Private
 */
jobRouter.post("/generate-email", authMiddleware.authMiddleware, jobController.generateColdEmailController);

/**
 * @route   POST /api/jobs/send-email
 * @desc    Send application email to recruiter/company
 * @access  Private
 */
jobRouter.post("/send-email", authMiddleware.authMiddleware, jobController.sendColdEmailController);

module.exports = jobRouter;

