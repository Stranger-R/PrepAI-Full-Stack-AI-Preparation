import React, { useState, useEffect } from 'react'

const LOADING_STEPS = [
    { id: 0, label: "Analyzing job description details", range: [0, 20] },
    { id: 1, label: "Scanning profile & extracting core skills", range: [20, 45] },
    { id: 2, label: "Evaluating skill gaps & alignment match", range: [45, 70] },
    { id: 3, label: "Synthesizing custom mock questions", range: [70, 88] },
    { id: 4, label: "Structuring personalized day-by-day roadmap", range: [88, 95] }
]

const LoadingScreen = ({ isGenerating = false }) => {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (!isGenerating) return

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) {
                    clearInterval(timer)
                    return 95;
                }
                // Random incremental step to simulate realistic AI processing
                const increment = Math.random() * 1.5 + 0.5
                return Math.min(95, prev + increment)
            })
        }, 300)

        return () => clearInterval(timer)
    }, [isGenerating])

    const getStepStatus = (range) => {
        if (!isGenerating) return 'pending'
        if (progress > range[1]) return 'completed'
        if (progress >= range[0] && progress <= range[1]) return 'active'
        return 'pending'
    }

    return (
        <main className="loading-screen-container">
            {/* Ambient Background Glowing Blobs */}
            <div className="bg-glow bg-glow--accent"></div>
            <div className="bg-glow bg-glow--cyan"></div>

            <div className="loading-card">
                {/* Header Section */}
                <div className="loading-card__header">
                    <div className="logo-spinner">
                        <div className="spinner-outer"></div>
                        <div className="spinner-inner"></div>
                        <div className="spinner-core">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="logo-spark">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="loading-title">
                        {isGenerating ? "Crafting Your Interview Strategy" : "Fetching Your Strategy"}
                    </h1>
                    <p className="loading-subtitle">
                        {isGenerating 
                            ? "PrepAI is customizing a target roadmap, sample questions, and skill feedback." 
                            : "Connecting to secure servers to pull your preparation dashboard."
                        }
                    </p>
                </div>

                {isGenerating ? (
                    <>
                        {/* Progressive Checklist */}
                        <div className="loading-steps">
                            {LOADING_STEPS.map((step) => {
                                const status = getStepStatus(step.range)
                                return (
                                    <div key={step.id} className={`loading-step loading-step--${status}`}>
                                        <div className="loading-step__indicator">
                                            {status === 'completed' && (
                                                <svg className="step-check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                            {status === 'active' && (
                                                <div className="step-pulse-dot"></div>
                                            )}
                                            {status === 'pending' && (
                                                <div className="step-empty-dot"></div>
                                            )}
                                        </div>
                                        <span className="loading-step__label">{step.label}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Progress Bar & Percentage */}
                        <div className="progress-section">
                            <div className="progress-bar-wrapper">
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="progress-meta">
                                <span className="progress-status">
                                    {progress < 20 && "Initializing engines..."}
                                    {progress >= 20 && progress < 45 && "Analyzing resume contents..."}
                                    {progress >= 45 && progress < 70 && "Mapping skills profile..."}
                                    {progress >= 70 && progress < 88 && "Generating tailored questions..."}
                                    {progress >= 88 && "Assembling roadmap details..."}
                                </span>
                                <span className="progress-percentage">{Math.round(progress)}%</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="simple-loader-wrapper">
                        <div className="simple-loader-dots">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                        </div>
                        <p className="simple-loader-text">Loading dashboard details...</p>
                    </div>
                )}
            </div>
        </main>
    )
}

export default LoadingScreen
