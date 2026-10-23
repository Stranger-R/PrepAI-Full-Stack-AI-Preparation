const { PDFParse } = require('pdf-parse');
const { generateMatchingMarketJobs, generateColdEmail, scoreJobsAgainstResume } = require('../Services/ai.service');
const { fetchLiveJobsFromJSearch } = require('../Services/jobs.service');
const { sendEmail } = require('../Services/email.service');
const InterviewReportModel = require('../models/interviewReport.model');
const userModel = require('../models/user.model');

/**
 * Helper: Extract resume text from uploaded PDF file
 */
async function extractResumeText(file) {
    if (!file) return '';
    const parser = new PDFParse({ data: file.buffer });
    try {
        const resumeData = await parser.getText();
        return resumeData.text || '';
    } catch (parseError) {
        console.error('[Job Controller] PDF Parse Error:', parseError.message);
        return '';
    } finally {
        await parser.destroy();
    }
}

/**
 * Controller to search and score matching market jobs based on resume PDF or profile text
 * Fetches REAL LIVE JOBS from JSearch RapidAPI, then scores them with Groq AI
 */
async function findMatchingJobsController(req, res) {
    try {
        let resumeText = '';

        // Step 1: Extract resume text
        if (req.file) {
            resumeText = await extractResumeText(req.file);
            if (!resumeText) {
                return res.status(400).json({ message: 'Failed to parse uploaded resume PDF.' });
            }
        }

        const { interviewReportId, query, experienceLevel, workMode } = req.body;

        // Fallback: load resume from interview report if no file uploaded
        if (!resumeText && interviewReportId) {
            const report = await InterviewReportModel.findOne({ _id: interviewReportId, user: req.user.id });
            if (report && report.resume) {
                resumeText = report.resume;
            }
        }

        // Step 2: Fetch REAL LIVE JOBS from JSearch RapidAPI
        let liveJobs = await fetchLiveJobsFromJSearch({
            query: query || 'Software Developer',
            experienceLevel,
            workMode,
            page: 1
        });

        console.log(`[findMatchingJobs] Fetched ${liveJobs.length} live jobs from JSearch`);

        // Step 3: If we got live jobs, score them with Groq AI against resume
        let jobs = [];
        if (liveJobs.length > 0) {
            jobs = await scoreJobsAgainstResume({ jobs: liveJobs, resumeText });
            // Sort by match score (highest first)
            jobs.sort((a, b) => b.matchScore - a.matchScore);
        } else {
            // FALLBACK: JSearch API failed — use Groq AI generated jobs
            console.warn('[findMatchingJobs] JSearch returned no jobs, falling back to AI-generated jobs');
            jobs = await generateMatchingMarketJobs({ resumeText, query, experienceLevel, workMode });
        }

        return res.status(200).json({
            message: 'Matching market jobs retrieved successfully.',
            count: jobs.length,
            isLive: liveJobs.length > 0,
            jobs
        });
    } catch (error) {
        console.error('[findMatchingJobs] Error:', error);
        return res.status(500).json({
            message: 'Failed to fetch market jobs matching your profile.',
            error: error.message
        });
    }
}

/**
 * Controller to fetch available general market jobs with filters
 * Uses REAL LIVE JSearch API jobs, falls back to AI-generated if API fails
 */
async function getAvailableJobsController(req, res) {
    try {
        const { query, experienceLevel, workMode } = req.query;

        // Fetch REAL LIVE JOBS from JSearch
        let liveJobs = await fetchLiveJobsFromJSearch({
            query: query || 'Software Developer Engineer',
            experienceLevel,
            workMode,
            page: 1
        });

        console.log(`[getAvailableJobs] Fetched ${liveJobs.length} live jobs from JSearch`);

        let jobs = [];
        if (liveJobs.length > 0) {
            // No resume scoring needed for "available" tab — set default match scores
            jobs = liveJobs.map(job => ({
                ...job,
                matchScore: Math.floor(Math.random() * 25) + 60 // default 60-85%
            }));
        } else {
            // FALLBACK: AI-generated jobs
            console.warn('[getAvailableJobs] JSearch returned no jobs, falling back to AI-generated jobs');
            jobs = await generateMatchingMarketJobs({
                resumeText: '',
                query: query || 'Software Developer Frontend Backend Fullstack Data Engineer System Design',
                experienceLevel: experienceLevel || 'Any',
                workMode: workMode || 'Any'
            });
        }

        return res.status(200).json({
            message: 'Available market jobs fetched successfully.',
            count: jobs.length,
            isLive: liveJobs.length > 0,
            jobs
        });
    } catch (error) {
        console.error('[getAvailableJobs] Error:', error);
        return res.status(500).json({
            message: 'Failed to fetch available market jobs.',
            error: error.message
        });
    }
}

/**
 * Controller to draft a personalized AI cold email for a job opening
 */
async function generateColdEmailController(req, res) {
    try {
        const { jobTitle, company, jobDescription, resumeText } = req.body;
        const user = await userModel.findById(req.user.id);

        const emailDraft = await generateColdEmail({
            jobTitle,
            company,
            jobDescription,
            resumeText,
            userName: user?.username || user?.email,
            userEmail: user?.email
        });

        return res.status(200).json({
            message: 'Cold application email drafted successfully.',
            emailDraft
        });
    } catch (error) {
        console.error('[generateColdEmail] Error:', error);
        return res.status(500).json({
            message: 'Failed to draft application email.',
            error: error.message
        });
    }
}

/**
 * Controller to send the application email to company HR/Recruiter
 */
async function sendColdEmailController(req, res) {
    try {
        const { recipientEmail, subject, emailContent } = req.body;

        if (!recipientEmail || !subject || !emailContent) {
            return res.status(400).json({ message: 'Recipient email, subject, and body content are required.' });
        }

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
                ${emailContent.replace(/\n/g, '<br/>')}
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 0.85em; color: #888; text-align: center;">Sent via PrepAI Application Portal</p>
            </div>
        `;

        await sendEmail({
            to: recipientEmail,
            subject,
            html: htmlBody,
            text: emailContent
        });

        return res.status(200).json({
            message: `Application email dispatched successfully to ${recipientEmail}!`
        });
    } catch (error) {
        console.error('[sendColdEmail] Error:', error);
        return res.status(500).json({
            message: 'Failed to send email.',
            error: error.message
        });
    }
}

module.exports = {
    findMatchingJobsController,
    getAvailableJobsController,
    generateColdEmailController,
    sendColdEmailController
};
