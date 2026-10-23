const Groq = require("groq-sdk");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require('puppeteer');

function getGroqClient() {
  return new Groq({
    apiKey: process.env.GROQ_GENAI_API_KEY,
  });
}

async function callGroqWithFallback(options) {
  const groq = getGroqClient();
  const candidateModels = [
    ...(process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : []),
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ];
  const modelsToTry = [...new Set(candidateModels)];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Sending request to Groq using model: ${model}`);
      const completion = await groq.chat.completions.create({
        ...options,
        model,
      });
      return completion;
    } catch (error) {
      lastError = error;
      const isRetriable =
        error?.status === 429 ||
        error?.status === 400 ||
        error?.status === 404 ||
        error?.code === "rate_limit_exceeded" ||
        error?.code === "json_validate_failed" ||
        error?.code === "model_not_found" ||
        (error?.message && (
          error.message.includes("Rate limit") ||
          error.message.includes("Failed to generate JSON") ||
          error.message.includes("json_validate_failed") ||
          error.message.includes("does not exist") ||
          error.message.includes("model")
        ));

      if (isRetriable) {
        console.warn(`[Groq Warning] Request issue (${error?.code || error?.status || 'error'}) with model "${model}": ${error?.message}. Trying next fallback model...`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function invokeGroqAi() {
  try {
    const response = await callGroqWithFallback({
      messages: [
        { role: "user", content: "Hello Groq! Explain what is interview?" }
      ]
    });

    console.log(response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Groq Error:", error);
  }
}

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillsGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
});

async function generateInterviewReport({resume, selfDescription, jobDescription}) { 
  const prompt = `You are a professional technical interviewer and recruiter. You analyze candidate profiles and generate comprehensive interview reports.
Generate an interview report for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

You must return a JSON object that contains exactly the following keys:
1. "matchScore": A number between 0 and 100 indicating how well the candidate's profile matches the job description.
2. "technicalQuestions": An array of objects. The number of questions should be dynamic (typically 2 to 5 questions depending on the candidate's profile and job requirements, e.g., sometimes 2-3, sometimes 4-5). Each object contains:
   - "question": string
   - "intention": string
   - "answer": string
3. "behavioralQuestions": An array of objects. The number of questions should be dynamic (typically 2 to 5 questions depending on the candidate's profile and job requirements, e.g., sometimes 2-3, sometimes 4-5). Each object contains:
   - "question": string
   - "intention": string
   - "answer": string
4. "skillsGaps": An array of objects. The number of skills should be dynamic (typically 2 to 5 skills based on the candidate's profile and job requirements, e.g., sometimes 2-3, sometimes 4-5). Each object contains:
   - "skill": string
   - "severity": "low" | "medium" | "high"
5. "preparationPlan": An array of objects. The number of days/entries should be dynamic (typically 3 to 8 days depending on the preparation required, e.g., sometimes 3-4 days, sometimes 7-8 days). Each object contains:
   - "day": number
   - "focus": string
   - "tasks": array of strings
6. "title": string (the job title)

The length of the arrays for "technicalQuestions", "behavioralQuestions", and "skillsGaps" must be dynamic (typically 2 to 5 items) based on the input context. The "preparationPlan" array length should be dynamic, typically covering 3 to 8 days (e.g., sometimes 3-4 days, sometimes 7-8 days). Do not default to a fixed size of 2 for all arrays. Depending on the depth of the resume and complexity of the job description, adjust the quantity dynamically.

Output strictly valid JSON. Double check all brackets, braces, commas, and double quotes to ensure valid JSON output without any syntax errors.`;


  const chatCompletion = await callGroqWithFallback({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that outputs strictly valid JSON matching the requested schema. Ensure all JSON syntax (brackets, braces, commas) is perfectly formatted and valid.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(chatCompletion.choices[0].message.content);
}


async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

  const prompt = `Generate resume for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

You must return a JSON object that contains exactly the following key:
1. "html": string (The HTML content of the resume which can be converted to PDF using any library like puppeteer)

The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
You can highlight the content using some colors or different font styles but the overall design should be simple and professional.
The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.

Output only a valid JSON object matching this key. Do not include markdown code block formatting (like \`\`\`json), explanations, or thoughts.`;

  const chatCompletion = await callGroqWithFallback({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that outputs strictly valid JSON matching the requested schema. Ensure all JSON syntax is perfectly formatted and valid.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  const jsonContent = JSON.parse(chatCompletion.choices[0].message.content);

  const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

  return pdfBuffer;
}

async function generateMatchingMarketJobs({ resumeText, query, experienceLevel, workMode }) {
  const prompt = `You are an expert career consultant and market intelligence analyst.
Analyze the candidate's resume and current job profile details below to find and curate 5 to 8 realistic, active job opportunities currently in the market.

Candidate Resume / Profile:
${resumeText || "No resume text provided. User query: " + (query || "Software Engineer / Tech jobs")}

User Search Keyword / Preferred Role: ${query || "Any suitable roles matching profile"}
Requested Experience Level Filter: ${experienceLevel || "Any"}
Requested Work Mode Filter: ${workMode || "Any"}

CRITICAL EXPERIENCE LEVEL MATCHING RULES:
1. FIRST, analyze the Candidate Resume / Profile to determine their true experience level:
   - Is the candidate a Fresher, Student, Intern, Recent Graduate, or Junior (< 2 years exp)?
   - Or is the candidate Mid-Level (2-5 years exp) or Senior / Lead (5+ years exp)?
2. IF the candidate is a Student, Intern, Fresher, or Recent Graduate:
   - STRICT RULE: DO NOT generate or output "Senior", "Lead", "Staff", or "Principal" job roles. Matching a fresher to a Senior role is an ERROR.
   - MUST output entry-appropriate roles such as "Software Engineering Intern", "Junior Frontend Developer", "Graduate Engineer Trainee", "Associate Software Engineer", "Junior Fullstack Developer".
3. IF a specific "Requested Experience Level Filter" is provided (e.g. "Entry-Level", "Mid-Level", "Senior", "Lead"), ALL returned jobs MUST strictly match that requested experience level.

Return a JSON object containing an array of objects under the key "jobs".
Each job object in the array must contain:
1. "id": string (unique identifier like "job-1", "job-2")
2. "title": string (exact job title, e.g. "Associate Software Engineer")
3. "company": string (reputable company name hiring for this role, e.g. "Stripe", "Atlassian", "Amazon", "Shopify", "Datadog")
4. "location": string (city/country or Remote, e.g. "San Francisco, CA", "Bengaluru, India", "Remote")
5. "workMode": string ("Remote", "Hybrid", or "Onsite")
6. "experienceLevel": string ("Entry-Level", "Mid-Level", "Senior", or "Lead")
7. "salaryRange": string (estimated yearly compensation range, e.g. "$80,000 - $105,000 / yr" or "₹8 - ₹14 LPA")
8. "matchScore": number (calculated ATS profile match percentage between 50 and 98 based on candidate resume and job requirements)
9. "matchingSkills": array of strings (top 3 to 5 skills candidate has that match this job)
10. "skillGaps": array of strings (top 2 to 3 missing or recommended skills to learn for this role)
11. "description": string (detailed 2-3 sentence overview of job responsibilities and impact)
12. "postedDate": string (e.g. "2 days ago", "Just posted", "1 week ago")
13. "applyUrl": string (direct URL link or search portal link to apply for this job, e.g. "https://www.linkedin.com/jobs/search/?keywords=Junior+Software+Engineer" or Google search link)
14. "hrEmail": string (predicted HR or careers email for this company, e.g. "careers@stripe.com" or "recruiting@atlassian.com")

Return strictly a valid JSON object matching key "jobs". No markdown formatting or extra text.`;

  const chatCompletion = await callGroqWithFallback({
    messages: [
      {
        role: "system",
        content: "You are a professional AI recruiter. Strictly match candidate experience levels (e.g. Freshers/Interns get Entry-Level/Intern jobs, never Senior/Lead roles) and output valid JSON with a 'jobs' array.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });


  const parsed = JSON.parse(chatCompletion.choices[0].message.content);
  const jobs = parsed.jobs || [];

  return jobs.map((job) => {
    if (!job.applyUrl) {
      const queryStr = encodeURIComponent(`${job.title} ${job.company} jobs`);
      job.applyUrl = `https://www.google.com/search?q=${queryStr}`;
    }
    if (!job.hrEmail) {
      const cleanCompany = (job.company || "company").toLowerCase().replace(/[^a-z0-9]/g, "");
      job.hrEmail = `careers@${cleanCompany}.com`;
    }
    return job;
  });
}

async function generateColdEmail({ jobTitle, company, jobDescription, resumeText, userName, userEmail }) {
  const prompt = `You are an expert executive resume writer and career coach.
Write a highly compelling, professional, personalized cold application email for the candidate applying for the position of "${jobTitle}" at "${company}".

Candidate Details:
Name: ${userName || "Candidate"}
Email: ${userEmail || "candidate@email.com"}
Resume / Background:
${resumeText || "Enthusiastic candidate with relevant skills"}

Target Job Description:
${jobDescription || jobTitle + " at " + company}

Return a JSON object containing exactly:
1. "subject": string (Engaging, professional subject line, e.g. "Application for ${jobTitle} - ${userName || "Candidate"}")
2. "body": string (The complete body text of the cold email, formatted professionally with line breaks. Highlighting top matching skills, enthusiasm for the company, and call to action for an interview).
3. "hrEmail": string (Predicted recruiter or careers email, e.g. "careers@${(company || "company").toLowerCase().replace(/[^a-z0-9]/g, "")}.com")

Output strictly valid JSON without markdown formatting.`;

  const chatCompletion = await callGroqWithFallback({
    messages: [
      {
        role: "system",
        content: "You are a career consultant generating JSON formatted cold outreach emails for job applications.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(chatCompletion.choices[0].message.content);
}

async function scoreJobsAgainstResume({ jobs, resumeText }) {
  if (!jobs || jobs.length === 0) return [];
  if (!resumeText) {
    // No resume — return jobs with default 50% match score
    return jobs.map(job => ({ ...job, matchScore: 50, matchingSkills: job.matchingSkills || [], skillGaps: job.skillGaps || [] }));
  }

  const jobSummaries = jobs.map((job, i) =>
    `Job ${i + 1}: "${job.title}" at "${job.company}"
     Requirements: ${job._qualifications || job.description.substring(0, 200)}`
  ).join('\n\n');

  const prompt = `You are an expert ATS (Applicant Tracking System) analyzer.
Given this candidate resume and a list of real job listings, compute an ATS match score for each job.

CANDIDATE RESUME:
${resumeText.substring(0, 2000)}

JOB LISTINGS:
${jobSummaries}

For each job, return:
- "index": number (0-based index matching the job list above)
- "matchScore": number between 40 and 98 (ATS match percentage)  
- "matchingSkills": array of 2-4 skills the candidate has that match this job
- "skillGaps": array of 1-3 skills the candidate lacks for this job

Return a JSON object with key "scores" containing an array of these objects.
Output strictly valid JSON only.`;

  try {
    const chatCompletion = await callGroqWithFallback({
      messages: [
        { role: 'system', content: 'You are an ATS system that outputs strictly valid JSON with a "scores" array.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(chatCompletion.choices[0].message.content);
    const scores = parsed.scores || [];

    return jobs.map((job, i) => {
      const scoreData = scores.find(s => s.index === i) || {};
      return {
        ...job,
        matchScore: scoreData.matchScore || 55,
        matchingSkills: scoreData.matchingSkills || job.matchingSkills || [],
        skillGaps: scoreData.skillGaps || [],
      };
    });
  } catch (err) {
    console.error('[AI Scoring] Failed to score jobs:', err.message);
    return jobs.map(job => ({
      ...job,
      matchScore: Math.floor(Math.random() * 30) + 50, // fallback random 50-80
    }));
  }
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
  generateMatchingMarketJobs,
  generateColdEmail,
  scoreJobsAgainstResume
};