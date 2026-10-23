import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe, verifyEmail } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context


    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return { success: true }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Login failed"
            return { success: false, error: errMsg }
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true);
        try {
            const data = await register({ username, email, password });
            return { success: true, data };
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Registration failed";
            return { success: false, error: errMsg };
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            setUser(null);
        } catch (err) {
            console.error("Logout error:", err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async ({ email, otp }) => {
        setLoading(true);
        try {
            const data = await verifyEmail({ email, otp });
            setUser(data.user);
            return { success: true };
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Verification failed";
            return { success: false, error: errMsg };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const getAndSetUser = async () => {
            try {
                const data = await getMe();
                if (isMounted) setUser(data.user);
            } catch {
                if (isMounted) setUser(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        getAndSetUser();
        return () => {
            isMounted = false;
        };
    }, [setLoading, setUser]);

    return { user, loading, handleRegister, handleLogin, handleLogout, handleVerifyEmail }
}