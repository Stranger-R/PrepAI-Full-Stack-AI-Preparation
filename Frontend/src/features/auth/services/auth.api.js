import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("prepai_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export async function register({ username, email, password }) {
    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        });
        return response.data;
    } catch (err) {
        console.error("Register API error:", err);
        throw err;
    }
}

export async function login({ email, password }) {
    try {
        const response = await api.post("/api/auth/login", {
            email, password
        });
        if (response.data?.token) {
            localStorage.setItem("prepai_token", response.data.token);
        }
        return response.data;
    } catch (err) {
        console.error("Login API error:", err);
        throw err;
    }
}

export async function logout() {
    try {
        const response = await api.get("/api/auth/logout");
        localStorage.removeItem("prepai_token");
        return response.data;
    } catch (err) {
        localStorage.removeItem("prepai_token");
        console.error("Logout API error:", err);
        throw err;
    }
}

export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me");
        return response.data;
    } catch (err) {
        if (err.response?.status === 401) {
            localStorage.removeItem("prepai_token");
        }
        throw err;
    }
}

export async function verifyEmail({ email, otp }) {
    try {
        const response = await api.post("/api/auth/verify-email", { email, otp });
        if (response.data?.token) {
            localStorage.setItem("prepai_token", response.data.token);
        }
        return response.data;
    } catch (err) {
        console.error("Verify Email API error:", err);
        throw err;
    }
}