import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const VerifyEmail = () => {
    const navigate = useNavigate()
    const location = useLocation()
    
    // Attempt to pre-populate email from route state if redirecting from login/register
    const initialEmail = location.state?.email || ""
    
    const [email, setEmail] = useState(initialEmail)
    const [otp, setOtp] = useState("")
    const [error, setError] = useState("")
    const [successMsg, setSuccessMsg] = useState("")
    
    const { loading, handleVerifyEmail } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccessMsg("")
        
        if (!email) {
            setError("Email address is required")
            return
        }
        if (!otp || otp.length !== 6) {
            setError("OTP must be 6 digits")
            return
        }

        const res = await handleVerifyEmail({ email, otp })
        if (res?.success) {
            setSuccessMsg("Email verified successfully! Redirecting...")
            setTimeout(() => {
                navigate("/")
            }, 1500)
        } else {
            setError(res?.error || "Verification failed")
        }
    }

    if (loading) {
        return (
            <div className="auth-container">
                <div className="glow-orb orb-pink"></div>
                <div className="glow-orb orb-blue"></div>
                <div className="glow-orb orb-purple"></div>
                <div className="auth-card">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Verifying your email...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container">
            <div className="glow-orb orb-pink"></div>
            <div className="glow-orb orb-blue"></div>
            <div className="glow-orb orb-purple"></div>
            
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Verify Email</h1>
                    <p>Enter the 6-digit verification code sent to your email</p>
                </div>

                {location.state?.devOtp && (
                    <div style={{
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        color: "#60a5fa",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "0.5rem",
                        marginBottom: "1rem",
                        fontSize: "0.85rem",
                        textAlign: "center"
                    }}>
                        <span>Dev OTP: <strong>{location.state.devOtp}</strong></span>
                        <button
                            type="button"
                            onClick={() => setOtp(location.state.devOtp)}
                            style={{
                                marginLeft: "10px",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                cursor: "pointer",
                                fontSize: "0.8rem"
                            }}
                        >
                            Auto-fill
                        </button>
                    </div>
                )}

                {error && <div className="error-container">{error}</div>}
                {successMsg && <div className="success-container" style={{
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#10b981",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem",
                    fontSize: "0.9rem",
                    textAlign: "center"
                }}>{successMsg}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            id="email"
                            placeholder="Enter email address"
                            required
                        />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="otp">Verification Code (OTP)</label>
                        <input
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            type="text"
                            id="otp"
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            required
                            style={{
                                letterSpacing: otp ? "4px" : "normal",
                                textAlign: otp ? "center" : "left",
                                fontSize: otp ? "1.2rem" : "inherit",
                                fontWeight: otp ? "bold" : "normal"
                            }}
                        />
                    </div>

                    <button className="button primary-button" type="submit">Verify & Login</button>
                </form>

                <div className="auth-footer">
                    <p>Need to try another account? <Link to="/login">Login</Link></p>
                </div>
            </div>
        </div>
    )
}

export default VerifyEmail
