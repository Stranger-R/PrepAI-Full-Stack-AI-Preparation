const { PDFParse } = require('pdf-parse');
const {generateInterviewReport, generateResumePdf} = require('../Services/ai.service');
const InterviewReportModel = require('../models/interviewReport.model');

async function generateInterviewReportController(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: 'Resume file is required' });
    }

    let resumeText = '';
    const parser = new PDFParse({ data: req.file.buffer });
    try {
        const resumeData = await parser.getText();
        resumeText = resumeData.text;
    } catch (parseError) {
        console.error("PDF Parse Error:", parseError);
        return res.status(400).json({ message: 'Failed to parse resume PDF file' });
    } finally {
        await parser.destroy();
    }

    const { selfDescription, jobDescription } = req.body;

    try {
        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription,
            
        });

        const interviewReport = await InterviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interViewReportByAi,
        });

        return res.status(201).json({
            message : "Interview report generated successfully",
            interviewReport
        });
    } catch (error) {
        console.error("AI Generation or Database Error:", error);
        return res.status(500).json({
            message: "Failed to generate interview strategy. Please check server logs.",
            error: error.message
        });
    }
}


/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await InterviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await InterviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillsGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await InterviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}


module.exports = { 
    generateInterviewReportController,
    getInterviewReportByIdController, 
    getAllInterviewReportsController, 
    generateResumePdfController
 };