const Groq = require("groq-sdk");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require('puppeteer');

const groq = new Groq({
  apiKey: process.env.GROQ_GENAI_API_KEY,
});

async function invokeGroqAi() {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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

Output only a valid JSON object matching these keys. Do not include markdown code block formatting (like \`\`\`json), explanations, or thoughts.`;


  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that outputs only valid JSON matching the user's requested schema. Do not output any markdown formatting, preamble, or thoughts.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
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

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that outputs only valid JSON matching the user's requested schema. Do not output any markdown formatting, preamble, or thoughts.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  const jsonContent = JSON.parse(chatCompletion.choices[0].message.content);

  const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

  return pdfBuffer;
}

module.exports = {
                  generateInterviewReport,
                  generateResumePdf

                };