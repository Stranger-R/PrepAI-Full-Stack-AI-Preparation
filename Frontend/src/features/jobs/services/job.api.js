import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("prepai_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Service to match jobs based on uploaded resume or filter criteria
 */
export const findMatchingJobs = async ({ resumeFile, query, experienceLevel, workMode }) => {
    const formData = new FormData();
    if (resumeFile) {
        formData.append("resume", resumeFile);
    }
    if (query) formData.append("query", query);
    if (experienceLevel) formData.append("experienceLevel", experienceLevel);
    if (workMode) formData.append("workMode", workMode);

    const response = await api.post("/api/jobs/match", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });

    return response.data;
};

/**
 * Service to fetch general available market jobs
 */
export const getAvailableJobs = async ({ query, experienceLevel, workMode } = {}) => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (experienceLevel) params.append("experienceLevel", experienceLevel);
    if (workMode) params.append("workMode", workMode);

    const response = await api.get(`/api/jobs/available?${params.toString()}`);
    return response.data;
};

/**
 * Service to draft AI cold application email
 */
export const generateColdEmail = async ({ jobTitle, company, jobDescription, resumeText }) => {
    const response = await api.post("/api/jobs/generate-email", {
        jobTitle,
        company,
        jobDescription,
        resumeText
    });
    return response.data;
};

/**
 * Service to send cold application email
 */
export const sendColdEmail = async ({ recipientEmail, subject, emailContent }) => {
    const response = await api.post("/api/jobs/send-email", {
        recipientEmail,
        subject,
        emailContent
    });
    return response.data;
};

