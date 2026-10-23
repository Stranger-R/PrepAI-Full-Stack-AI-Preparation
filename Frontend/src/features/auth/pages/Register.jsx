import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Register = () => {

    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const { loading, handleRegister } = useAuth()
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const res = await handleRegister({ username, email, password })
        if (res?.success) {
            navigate("/verify-email", { state: { email, devOtp: res.data?.devOtp } })
        } else {
            setError(res?.error || "Registration failed")
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
                        <p>Creating your account...</p>
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
                    <h1>Create Account</h1>
                    <p>Join us to get started with your interviews</p>
                </div>

                {error && <div className="error-container">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            onChange={(e) => { setUsername(e.target.value) }}
                            type="text" id="username" name='username' placeholder='Enter username' required />
                    </div>
                    
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

                    <button className='button primary-button'>Register</button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to={"/login"}>Login</Link></p>
                </div>
            </div>
        </div>
    )
}

export default Register