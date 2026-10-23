import React, { useState, useEffect, useRef } from 'react';
import '../style/marketJobs.scss';
import { findMatchingJobs, getAvailableJobs, generateColdEmail, sendColdEmail } from '../services/job.api';
import { useAuth } from '../../auth/hooks/useAuth';
import { useNavigate } from 'react-router';

const MarketJobs = () => {
    const { user, handleLogout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('matching'); // 'matching' | 'available'
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isLive, setIsLive] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('All');
    const [workMode, setWorkMode] = useState('All');
    const [minMatchScore, setMinMatchScore] = useState(0);

    // Resume Upload state for job matcher
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedJobModal, setSelectedJobModal] = useState(null);
    const resumeInputRef = useRef(null);

    // Cold Email modal state
    const [emailModalJob, setEmailModalJob] = useState(null);
    const [isDraftingEmail, setIsDraftingEmail] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailDraft, setEmailDraft] = useState({ recipientEmail: '', subject: '', body: '' });

    // Initial load available jobs
    useEffect(() => {
        loadJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            if (activeTab === 'available') {
                const data = await getAvailableJobs({
                    query: searchQuery,
                    experienceLevel: experienceLevel !== 'All' ? experienceLevel : '',
                    workMode: workMode !== 'All' ? workMode : ''
                });
                setJobs(data.jobs || []);
                setIsLive(data.isLive || false);
            } else {
                const data = await findMatchingJobs({
                    resumeFile: selectedFile,
                    query: searchQuery,
                    experienceLevel: experienceLevel !== 'All' ? experienceLevel : '',
                    workMode: workMode !== 'All' ? workMode : ''
                });
                setJobs(data.jobs || []);
                setIsLive(data.isLive || false);
            }
        } catch (error) {
            console.error("Failed to load market jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadJobs();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setExperienceLevel('All');
        setWorkMode('All');
        setMinMatchScore(0);
        setSelectedFile(null);
    };

    // Filter jobs client-side based on minMatchScore
    const filteredJobs = jobs.filter(job => {
        if (minMatchScore > 0 && job.matchScore < minMatchScore) return false;
        if (experienceLevel !== 'All' && job.experienceLevel !== experienceLevel) return false;
        if (workMode !== 'All' && job.workMode !== workMode) return false;
        return true;
    });

    const handlePrepareForJob = (job) => {
        const fullJobDesc = `Target Role: ${job.title} at ${job.company}\nLocation: ${job.location} (${job.workMode})\nExperience Level: ${job.experienceLevel}\nSalary Range: ${job.salaryRange}\n\nJob Description & Responsibilities:\n${job.description}\n\nKey Skills Required:\n${(job.matchingSkills || []).concat(job.skillGaps || []).join(', ')}`;
        navigate('/', {
            state: {
                prefilledJobDesc: fullJobDesc,
                resumeFile: selectedFile,
                resumeAutoDetected: Boolean(selectedFile)
            }
        });
    };

    const handleOpenColdEmail = async (job, e) => {
        if (e) e.stopPropagation();
        setEmailModalJob(job);
        setIsDraftingEmail(true);
        try {
            const res = await generateColdEmail({
                jobTitle: job.title,
                company: job.company,
                jobDescription: job.description
            });

            const draft = res.emailDraft || {};
            setEmailDraft({
                recipientEmail: draft.hrEmail || job.hrEmail || `careers@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                subject: draft.subject || `Application for ${job.title} - ${user?.username || 'Candidate'}`,
                body: draft.body || `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${job.title} position at ${job.company}.\n\nBest regards,\n${user?.username || user?.email}`
            });
        } catch (err) {
            console.error("Failed to draft cold email:", err);
            setEmailDraft({
                recipientEmail: job.hrEmail || `careers@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                subject: `Application for ${job.title} position`,
                body: `Dear Hiring Team,\n\nI am interested in applying for the ${job.title} position at ${job.company}.`
            });
        } finally {
            setIsDraftingEmail(false);
        }
    };

    const handleSendColdEmailSubmit = async (e) => {
        e.preventDefault();
        setIsSendingEmail(true);
        try {
            await sendColdEmail({
                recipientEmail: emailDraft.recipientEmail,
                subject: emailDraft.subject,
                emailContent: emailDraft.body
            });
            alert(`Application email sent successfully to ${emailDraft.recipientEmail}!`);
            setEmailModalJob(null);
        } catch (err) {
            console.error("Failed to send email:", err);
            alert("Failed to send email. You can copy the message or use your local mail app.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className='jobs-page'>
            {/* Top Navigation Bar */}
            <nav className='top-nav'>
                <div className='top-nav__logo' onClick={() => navigate('/')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
                    <span>PrepAI</span>
                </div>

                <div className='top-nav__links'>
                    <span className='top-nav__link' onClick={() => navigate('/')}>Interview Plans</span>
                    <span className='top-nav__link top-nav__link--active' onClick={() => navigate('/jobs')}>Market Jobs</span>
                </div>

                <div className='top-nav__actions'>
                    {user && <span className='top-nav__user'>Welcome, {user.username || user.email}</span>}
                    <button onClick={handleLogout} className='logout-btn'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Log Out
                    </button>
                </div>
            </nav>

            {/* Page Header */}
            <header className='jobs-header'>
                <h1>Find Real-Time <span className='highlight'>Matching Market Jobs</span></h1>
                <p>Upload your resume or search keywords to discover active job opportunities scored against your skills and candidate profile.</p>
                {isLive && (
                    <div className='live-badge'>
                        <span className='live-dot' />
                        Live Jobs — Real-Time Data
                    </div>
                )}
            </header>

            {/* Search & Upload Container */}
            <div className='jobs-search-card'>
                <form className='jobs-search-card__top' onSubmit={handleSearchSubmit}>
                    <div className='search-input-wrap'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            placeholder="Find Market Jobs by title, technology, or company (e.g. React Developer, Google)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className='resume-upload-mini' onClick={() => resumeInputRef.current?.click()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d78" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        <div>
                            <div className='resume-upload-mini__text'>
                                {selectedFile ? selectedFile.name : "Match With Resume PDF"}
                            </div>
                            <div className='resume-upload-mini__sub'>
                                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB uploaded` : "Auto ATS Skill Match"}
                            </div>
                        </div>
                        <input
                            ref={resumeInputRef}
                            type="file"
                            hidden
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                        />
                    </div>

                    <button type="submit" className='btn-find-jobs' disabled={loading}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        Search Market Jobs
                    </button>
                </form>

                {/* Filters Bar */}
                <div className='filters-bar'>
                    <div className='filter-group'>
                        <label>Experience:</label>
                        <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                            <option value="All">All Levels</option>
                            <option value="Entry-Level">Entry-Level / Intern</option>
                            <option value="Mid-Level">Mid-Level</option>
                            <option value="Senior">Senior</option>
                            <option value="Lead">Lead / Manager</option>
                        </select>
                    </div>

                    <div className='filter-group'>
                        <label>Work Mode:</label>
                        <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
                            <option value="All">All Modes</option>
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Onsite">Onsite</option>
                        </select>
                    </div>

                    <div className='filter-group'>
                        <label>Min Match Score:</label>
                        <select value={minMatchScore} onChange={(e) => setMinMatchScore(Number(e.target.value))}>
                            <option value={0}>All Matches</option>
                            <option value={80}>High Match (&gt;80%)</option>
                            <option value={60}>Mid Match (&gt;60%)</option>
                        </select>
                    </div>

                    <button type="button" className='reset-btn' onClick={resetFilters}>Reset Filters</button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className='jobs-tabs'>
                <button
                    className={`tab-btn ${activeTab === 'matching' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('matching')}
                >
                    🎯 Matching Market Jobs
                    <span className='count-badge'>{filteredJobs.length}</span>
                </button>

                <button
                    className={`tab-btn ${activeTab === 'available' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('available')}
                >
                    💼 Available Jobs
                </button>
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div style={{ padding: '3rem 0', width: '100%', textAlign: 'center' }}>
                    <div className='loading-spinner' />
                    <p style={{ color: '#7d8590', marginTop: '1rem' }}>
                        🔍 Fetching real-time job listings &amp; computing ATS match score...
                    </p>
                </div>
            ) : (
                <div className='jobs-grid'>
                    {filteredJobs.length > 0 ? (
                        filteredJobs.map((job) => (
                            <article
                                key={job.id}
                                className='job-card'
                                role='button'
                                tabIndex={0}
                                aria-label={`View details for ${job.title} at ${job.company}`}
                                onClick={() => setSelectedJobModal(job)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedJobModal(job);
                                    }
                                }}
                            >
                                <div className='job-card__main'>
                                    <div className='job-card__header'>
                                        <div className='job-card__identity'>
                                            <div className='job-card__logo'>
                                                {job._logoUrl ? (
                                                    <img
                                                        src={job._logoUrl}
                                                        alt={`${job.company} logo`}
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <span>{(job.company || 'C').charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className='job-card__heading'>
                                                <h2 className='job-card__title'>{job.title || 'Role not specified'}</h2>
                                                <p className='job-card__company'>{job.company || 'Company not specified'}</p>
                                            </div>
                                        </div>

                                        <div className={`match-badge ${job.matchScore >= 80 ? 'match-badge--high' : job.matchScore >= 60 ? 'match-badge--mid' : 'match-badge--low'}`}>
                                            {job.matchScore ?? 0}%
                                            <span>Match</span>
                                        </div>
                                    </div>

                                    <div className='ats-meter-container'>
                                        <div className='ats-meter-label'>
                                            <span>Resume match</span>
                                            <span>{job.matchScore ?? 0}%</span>
                                        </div>
                                        <div className='ats-meter-bar'>
                                            <div
                                                className={`ats-meter-fill ${job.matchScore >= 80 ? 'ats-meter-fill--high' : job.matchScore >= 60 ? 'ats-meter-fill--mid' : 'ats-meter-fill--low'}`}
                                                style={{ width: `${Math.min(100, Math.max(0, job.matchScore || 0))}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className='job-card__facts'>
                                        <div className='job-card__fact'>
                                            <span className='job-card__fact-label'>Location</span>
                                            <span className='job-card__fact-value'>{job.location || 'Not specified'}</span>
                                        </div>
                                        <div className='job-card__fact'>
                                            <span className='job-card__fact-label'>Work mode</span>
                                            <span className='job-card__fact-value'>{job.workMode || 'Not specified'}</span>
                                        </div>
                                        <div className='job-card__fact'>
                                            <span className='job-card__fact-label'>Experience</span>
                                            <span className='job-card__fact-value'>{job.experienceLevel || 'Not specified'}</span>
                                        </div>
                                        <div className='job-card__fact job-card__fact--salary'>
                                            <span className='job-card__fact-label'>Salary</span>
                                            <span className='job-card__fact-value'>{job.salaryRange || 'Not listed'}</span>
                                        </div>
                                    </div>

                                    <div className='job-card__overview'>
                                        <h3>Role overview</h3>
                                        <p className='job-card__description'>
                                            {job.description || 'No role description is available. Open the job details for more information.'}
                                        </p>
                                    </div>

                                    {job.matchingSkills && job.matchingSkills.length > 0 && (
                                        <div className='job-card__skills'>
                                            <span className='skills-title'>Your matching skills</span>
                                            <div className='skills-list'>
                                                {job.matchingSkills.slice(0, 4).map((skill, idx) => (
                                                    <span key={idx} className='skill-chip skill-chip--match'>{skill}</span>
                                                ))}
                                                {job.matchingSkills.length > 4 && (
                                                    <span className='skill-chip skill-chip--more'>+{job.matchingSkills.length - 4} more</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {job.postedDate && (
                                        <div className='job-card__posted'>
                                            {job._isLive && <span className='job-card__live'><span /> Live</span>}
                                            <span>{job.postedDate}</span>
                                        </div>
                                    )}
                                </div>

                                <div className='job-card__actions'>
                                    <div className='job-card__footer'>
                                        <a
                                            href={job.applyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className='btn-apply-link'
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Apply now <span aria-hidden='true'>↗</span>
                                        </a>

                                        <button className='btn-email-hr' onClick={(e) => handleOpenColdEmail(job, e)}>
                                            Email HR
                                        </button>

                                        <button className='btn-prep' onClick={(e) => { e.stopPropagation(); handlePrepareForJob(job); }}>
                                            Prep strategy
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className='empty-state'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            <h3>No Market Jobs Found</h3>
                            <p>Try clearing or broadening your filters, or upload your resume PDF to match open market positions.</p>
                            <button className='btn-find-jobs' onClick={resetFilters}>Reset All Filters</button>
                        </div>
                    )}
                </div>
            )}

            {/* Deep Detailed Job Specification Modal */}
            {selectedJobModal && (
                <div className='job-modal-backdrop' onClick={() => setSelectedJobModal(null)}>
                    <div className='job-modal-content' onClick={(e) => e.stopPropagation()}>
                        <button className='job-modal-close' onClick={() => setSelectedJobModal(null)}>✕</button>

                        <div className='job-modal-header'>
                            <div>
                                <h2 className='job-modal-title'>{selectedJobModal.title}</h2>
                                <h3 className='job-modal-company'>{selectedJobModal.company}</h3>
                            </div>
                            <div className={`match-badge ${selectedJobModal.matchScore >= 80 ? 'match-badge--high' : selectedJobModal.matchScore >= 60 ? 'match-badge--mid' : 'match-badge--low'}`}>
                                {selectedJobModal.matchScore}%
                                <span>ATS Match</span>
                            </div>
                        </div>

                        {/* Complete Structured Specification Matrix Table */}
                        <table className='job-spec-table' style={{ margin: '1rem 0' }}>
                            <tbody>
                                <tr>
                                    <th>Target Position</th>
                                    <td>{selectedJobModal.title}</td>
                                </tr>
                                <tr>
                                    <th>Company</th>
                                    <td>{selectedJobModal.company}</td>
                                </tr>
                                <tr>
                                    <th>Location &amp; Work Mode</th>
                                    <td>📍 {selectedJobModal.location} ({selectedJobModal.workMode})</td>
                                </tr>
                                <tr>
                                    <th>Experience Level</th>
                                    <td>🎯 {selectedJobModal.experienceLevel}</td>
                                </tr>
                                <tr>
                                    <th>Salary Compensation</th>
                                    <td style={{ color: '#4ade80', fontWeight: 700 }}>💰 {selectedJobModal.salaryRange}</td>
                                </tr>
                                <tr>
                                    <th>Estimated Recruiter Email</th>
                                    <td style={{ color: '#c084fc' }}>✉️ {selectedJobModal.hrEmail || `careers@${selectedJobModal.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className='job-modal-body'>
                            <h4>Detailed Responsibilities &amp; Role Overview</h4>
                            <p className='job-modal-desc'>{selectedJobModal.description}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                                {selectedJobModal.matchingSkills && selectedJobModal.matchingSkills.length > 0 && (
                                    <div>
                                        <h4 style={{ color: '#38bdf8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>✓ Matched Resume Skills</h4>
                                        <div className='skills-list'>
                                            {selectedJobModal.matchingSkills.map((skill, idx) => (
                                                <span key={idx} className='skill-chip skill-chip--match'>✓ {skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedJobModal.skillGaps && selectedJobModal.skillGaps.length > 0 && (
                                    <div>
                                        <h4 style={{ color: '#ff6b9d', marginBottom: '0.5rem', fontSize: '0.875rem' }}>+ Recommended Target Skills</h4>
                                        <div className='skills-list'>
                                            {selectedJobModal.skillGaps.map((skill, idx) => (
                                                <span key={idx} className='skill-chip skill-chip--gap'>+ {skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='job-modal-footer'>
                            <a
                                href={selectedJobModal.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className='btn-apply-link'
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justify: 'center',
                                    padding: '0.75rem 1.25rem',
                                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid #38bdf8',
                                    color: '#38bdf8',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    textDecoration: 'none'
                                }}
                            >
                                Apply Official Portal ↗
                            </a>

                            <button
                                className='btn-email-hr'
                                style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}
                                onClick={() => {
                                    const j = selectedJobModal;
                                    setSelectedJobModal(null);
                                    handleOpenColdEmail(j);
                                }}
                            >
                                📧 Send Cold Application Email
                            </button>

                            <button
                                className='btn-find-jobs'
                                style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}
                                onClick={() => {
                                    const jobToPrep = selectedJobModal;
                                    setSelectedJobModal(null);
                                    handlePrepareForJob(jobToPrep);
                                }}
                            >
                                ⚡ Prepare Strategy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Cold Email Dispatcher Modal */}
            {emailModalJob && (
                <div className='job-modal-backdrop' onClick={() => setEmailModalJob(null)}>
                    <div className='email-modal-content' onClick={(e) => e.stopPropagation()}>
                        <button className='job-modal-close' onClick={() => setEmailModalJob(null)}>✕</button>

                        <div className='job-modal-header'>
                            <div>
                                <h2 className='job-modal-title' style={{ fontSize: '1.25rem' }}>
                                    📧 AI Cold Application Email
                                </h2>
                                <p style={{ color: '#7d8590', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                    Crafted for <strong>{emailModalJob.title}</strong> at <strong>{emailModalJob.company}</strong>
                                </p>
                            </div>
                        </div>

                        {isDraftingEmail ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#7d8590' }}>
                                <p>Writing personalized cold application email using Groq AI...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendColdEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className='form-field'>
                                    <label>Recipient Company/HR Email:</label>
                                    <input
                                        type="email"
                                        required
                                        value={emailDraft.recipientEmail}
                                        onChange={(e) => setEmailDraft({ ...emailDraft, recipientEmail: e.target.value })}
                                        placeholder="e.g. careers@company.com"
                                    />
                                </div>

                                <div className='form-field'>
                                    <label>Email Subject:</label>
                                    <input
                                        type="text"
                                        required
                                        value={emailDraft.subject}
                                        onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                                    />
                                </div>

                                <div className='form-field'>
                                    <label>Application Cover Letter Body:</label>
                                    <textarea
                                        rows={10}
                                        required
                                        value={emailDraft.body}
                                        onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <a
                                        href={`mailto:${emailDraft.recipientEmail}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`}
                                        className='btn-apply-link'
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justify: 'center',
                                            padding: '0.75rem 1rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid #2a3348',
                                            color: '#e6edf3',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.875rem',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        Open in Mail App ↗
                                    </a>

                                    <button
                                        type="submit"
                                        className='btn-find-jobs'
                                        disabled={isSendingEmail}
                                        style={{ background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', flex: 1 }}
                                    >
                                        {isSendingEmail ? 'Dispatching Email...' : 'Send Application Email Direct'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketJobs;
