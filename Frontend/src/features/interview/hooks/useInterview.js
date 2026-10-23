import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, deleteInterviewReport } from "../services/interview.api";
import { useContext, useEffect, useCallback } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
    const context = useContext(InterviewContext);
    const { interviewId } = useParams();

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider");
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context;

    const generateReport = useCallback(async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true);
        let response = null;
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile });
            setReport(response?.interviewReport || null);
        } catch (error) {
            console.error("Failed to generate report:", error);
            throw error;
        } finally {
            setLoading(false);
        }
        return response?.interviewReport || null;
    }, [setLoading, setReport]);

    const getReportById = useCallback(async (id) => {
        setLoading(true);
        let response = null;
        try {
            response = await getInterviewReportById(id);
            setReport(response?.interviewReport || null);
        } catch (error) {
            console.error("Failed to fetch report by id:", error);
            setReport(null);
        } finally {
            setLoading(false);
        }
        return response?.interviewReport || null;
    }, [setLoading, setReport]);

    const getReports = useCallback(async () => {
        setLoading(true);
        let response = null;
        try {
            response = await getAllInterviewReports();
            setReports(response?.interviewReports || []);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            setReports([]);
        } finally {
            setLoading(false);
        }
        return response?.interviewReports || [];
    }, [setLoading, setReports]);

    const deleteReport = useCallback(async (id) => {
        try {
            await deleteInterviewReport(id);
            setReports(prev => prev.filter(r => r._id !== id));
        } catch (error) {
            console.error("Failed to delete interview report:", error);
            alert("Failed to delete interview plan.");
        }
    }, [setReports]);

    const getResumePdf = useCallback(async (interviewReportId) => {
        setLoading(true);
        try {
            const response = await generateResumePdf({ interviewReportId });
            const blob = response instanceof Blob ? response : new Blob([response], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `resume_${interviewReportId}.pdf`;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error("Failed to download resume PDF:", error);
            alert("Failed to generate resume PDF. Please check server logs.");
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId);
        } else {
            getReports();
        }
    }, [interviewId, getReportById, getReports]);

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf, deleteReport };
};