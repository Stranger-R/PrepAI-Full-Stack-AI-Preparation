const axios = require('axios');

/**
 * Fetch real live jobs from Remotive.io (free public API - remote jobs)
 * @param {object} params - { query, page }
 */
async function fetchRemotiveJobs({ query, page = 1 }) {
    try {
        const params = { limit: 20 };
        if (query) params.search = query;

        console.log(`[Remotive] Fetching remote jobs: "${query || 'any'}"`);
        const response = await axios.get('https://remotive.com/api/remote-jobs', { params, timeout: 12000 });
        const rawJobs = response.data?.jobs || [];
        console.log(`[Remotive] Got ${rawJobs.length} jobs`);
        return rawJobs.map((job, i) => normalizeRemotiveJob(job, i));
    } catch (error) {
        console.error('[Remotive] Error:', error.message);
        return [];
    }
}

/**
 * Fetch real live jobs from Arbeitnow (free public API - general jobs)
 * @param {object} params - { query, page }
 */
async function fetchArbeitnowJobs({ query, page = 1 }) {
    try {
        const params = { page };

        console.log(`[Arbeitnow] Fetching jobs page ${page}`);
        const response = await axios.get('https://www.arbeitnow.com/api/job-board-api', { params, timeout: 12000 });
        const rawJobs = response.data?.data || [];
        console.log(`[Arbeitnow] Got ${rawJobs.length} jobs`);

        // Filter by query client-side if provided
        let filtered = rawJobs;
        if (query) {
            const keywords = query.toLowerCase().split(' ').filter(k => k.length > 2);
            filtered = rawJobs.filter(job => {
                const text = [
                    job.title || '',
                    (job.tags || []).join(' '),
                    (job.description || '').substring(0, 300)
                ].join(' ').toLowerCase();
                // Match if any keyword appears in text
                return keywords.some(kw => text.includes(kw));
            });
            // Fallback: if filter is too strict, just return tech/software jobs
            if (filtered.length < 5) {
                filtered = rawJobs.filter(job => {
                    const text = (job.title + ' ' + (job.tags || []).join(' ')).toLowerCase();
                    return text.includes('software') || text.includes('developer') || text.includes('engineer') || text.includes('frontend') || text.includes('backend') || text.includes('javascript') || text.includes('react') || text.includes('python') || text.includes('data');
                });
            }
        } else {
            // No query: return tech/software jobs
            filtered = rawJobs.filter(job => {
                const text = (job.title + ' ' + (job.tags || []).join(' ')).toLowerCase();
                return text.includes('software') || text.includes('developer') || text.includes('engineer') || text.includes('fullstack') || text.includes('frontend') || text.includes('backend');
            });
        }

        return filtered.slice(0, 15).map((job, i) => normalizeArbeitnowJob(job, i));
    } catch (error) {
        console.error('[Arbeitnow] Error:', error.message);
        return [];
    }
}

/**
 * Main function: Fetch live real-time jobs by combining Remotive + Arbeitnow
 */
async function fetchLiveJobsFromJSearch({ query, experienceLevel, workMode, page = 1 }) {
    // Run both APIs in parallel for speed
    const [remotiveJobs, arbeitnowJobs] = await Promise.all([
        fetchRemotiveJobs({ query, page }),
        workMode === 'Remote' ? Promise.resolve([]) : fetchArbeitnowJobs({ query, page })
    ]);

    // Combine, deduplicate by title+company
    const allJobs = [...remotiveJobs, ...arbeitnowJobs];
    const seen = new Set();
    const deduplicated = allJobs.filter(job => {
        const key = `${job.title.toLowerCase()}_${job.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Filter by workMode if requested
    let result = deduplicated;
    if (workMode && workMode !== 'Any') {
        result = deduplicated.filter(job => job.workMode === workMode || job.workMode === 'Remote');
    }

    // Filter by experienceLevel if requested
    if (experienceLevel && experienceLevel !== 'Any') {
        const filtered = result.filter(job => job.experienceLevel === experienceLevel);
        // If filter is too strict and removes everything, relax it
        if (filtered.length >= 3) result = filtered;
    }

    console.log(`[LiveJobs] Combined: ${result.length} total unique live jobs`);
    return result.slice(0, 20); // Max 20 live jobs
}

/**
 * Normalize Remotive.io job to our app schema
 */
function normalizeRemotiveJob(raw, index) {
    const title = raw.title || 'Software Engineer';
    const company = raw.company_name || 'Unknown Company';

    // Experience level from title
    let experienceLevel = 'Mid-Level';
    const titleLower = title.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('sr.') || titleLower.includes('lead') || titleLower.includes('principal')) {
        experienceLevel = titleLower.includes('lead') || titleLower.includes('principal') ? 'Lead' : 'Senior';
    } else if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('intern') || titleLower.includes('entry') || titleLower.includes('associate') || titleLower.includes('graduate')) {
        experienceLevel = 'Entry-Level';
    }

    // Skills from tags
    const matchingSkills = (raw.tags || []).slice(0, 4);
    const skillGaps = [];

    // Description - strip HTML
    const descHtml = raw.description || '';
    const cleanDesc = descHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const description = cleanDesc.length > 400 ? cleanDesc.substring(0, 400) + '...' : cleanDesc;

    // Salary
    const salaryRange = raw.salary || 'Negotiable';

    // Posted date
    let postedDate = 'Recently posted';
    if (raw.publication_date) {
        const posted = new Date(raw.publication_date);
        const daysAgo = Math.floor((Date.now() - posted.getTime()) / 86400000);
        if (daysAgo === 0) postedDate = 'Today';
        else if (daysAgo === 1) postedDate = '1 day ago';
        else if (daysAgo < 7) postedDate = `${daysAgo} days ago`;
        else if (daysAgo < 14) postedDate = '1 week ago';
        else postedDate = `${Math.floor(daysAgo / 7)} weeks ago`;
    }

    const location = raw.candidate_required_location || 'Worldwide';
    const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');

    return {
        id: `remotive-${raw.id || index}`,
        title,
        company,
        location,
        workMode: 'Remote', // Remotive is always remote
        experienceLevel,
        salaryRange,
        matchScore: 0,
        matchingSkills,
        skillGaps,
        description,
        postedDate,
        applyUrl: raw.url || `https://remotive.com/remote-jobs`,
        hrEmail: `careers@${cleanCompany}.com`,
        _qualifications: (raw.tags || []).join(', '),
        _responsibilities: '',
        _logoUrl: raw.company_logo || null,
        _isLive: true,
    };
}

/**
 * Normalize Arbeitnow job to our app schema
 */
function normalizeArbeitnowJob(raw, index) {
    const title = raw.title || 'Software Engineer';
    const company = raw.company_name || 'Unknown Company';

    // Experience from title
    let experienceLevel = 'Mid-Level';
    const titleLower = title.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('sr.')) {
        experienceLevel = 'Senior';
    } else if (titleLower.includes('lead') || titleLower.includes('principal') || titleLower.includes('staff') || titleLower.includes('manager')) {
        experienceLevel = 'Lead';
    } else if (titleLower.includes('junior') || titleLower.includes('intern') || titleLower.includes('entry') || titleLower.includes('associate') || titleLower.includes('graduate') || titleLower.includes('trainee')) {
        experienceLevel = 'Entry-Level';
    }

    // Skills from tags
    const matchingSkills = (raw.tags || []).slice(0, 4);

    // Description - strip HTML
    const descHtml = raw.description || '';
    const cleanDesc = descHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const description = cleanDesc.length > 400 ? cleanDesc.substring(0, 400) + '...' : cleanDesc;

    // Work mode
    const workMode = raw.remote ? 'Remote' : 'Hybrid';

    // Posted date
    let postedDate = 'Recently posted';
    if (raw.created_at) {
        const posted = new Date(raw.created_at * 1000); // Unix timestamp
        const daysAgo = Math.floor((Date.now() - posted.getTime()) / 86400000);
        if (daysAgo === 0) postedDate = 'Today';
        else if (daysAgo === 1) postedDate = '1 day ago';
        else if (daysAgo < 7) postedDate = `${daysAgo} days ago`;
        else if (daysAgo < 14) postedDate = '1 week ago';
        else postedDate = `${Math.floor(daysAgo / 7)} weeks ago`;
    }

    const location = raw.location || 'Europe';
    const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');

    return {
        id: `arbeitnow-${raw.slug || index}`,
        title,
        company,
        location,
        workMode,
        experienceLevel,
        salaryRange: 'Negotiable',
        matchScore: 0,
        matchingSkills,
        skillGaps: [],
        description,
        postedDate,
        applyUrl: raw.url || `https://www.arbeitnow.com`,
        hrEmail: `careers@${cleanCompany}.com`,
        _qualifications: (raw.tags || []).join(', '),
        _responsibilities: '',
        _logoUrl: null,
        _isLive: true,
    };
}

module.exports = {
    fetchLiveJobsFromJSearch,
};
