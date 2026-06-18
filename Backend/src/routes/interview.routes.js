const express = require("express");
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/file.middleware');
const interviewController = require('../controller/interview.controller');

const interviewRouter = express.Router();


/**
 * @route   POST /api/interview/
 * @desc    generate new interview report on the basis of user self description, resume pdf and job descriptio
 * @access  private
 *
 */

interviewRouter.post("/", authMiddleware.authMiddleware, upload.single('resume'), interviewController.generateInterviewReportController);

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authMiddleware, interviewController.getInterviewReportByIdController)


/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access private
 */
interviewRouter.get("/", authMiddleware.authMiddleware, interviewController.getAllInterviewReportsController)


/**
 * @route GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authMiddleware, interviewController.generateResumePdfController)




module.exports = interviewRouter;