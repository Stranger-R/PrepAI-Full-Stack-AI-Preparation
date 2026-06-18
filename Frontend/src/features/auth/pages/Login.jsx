import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const res = await handleLogin({ email, password })
        if (res?.success) {
            navigate('/')
        } else {
            const isUnverified = res?.error && (res.error.toLowerCase().includes("verify") || res.error.toLowerCase().includes("verification"));
            if (isUnverified) {
                setError(
                    <span>
                        Email not verified. <Link to="/verify-email" state={{ email }} style={{ color: "#3b82f6", textDecoration: "underline" }}>Verify now</Link>
                    </span>
                );
            } else {
                setError(res?.error || "Login failed")
            }
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
                        <p>Securing your session...</p>
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
                    <h1>Welcome Back</h1>
                    <p>Enter your credentials to access your account</p>
                </div>
                
                {error && <div className="error-container">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id="email" name='email' placeholder='Enter email address' required />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name='password' placeholder='Enter password' required />
                    </div>
                    
                    <button className='button primary-button'>Login</button>
                </form>
                
                <div className="auth-footer">
                    <p>Don't have an account? <Link to={"/register"}>Register</Link></p>
                </div>
            </div>
        </div>
    )
}

export default Login