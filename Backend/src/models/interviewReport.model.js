const mongoose = require('mongoose');


/**
 * - job description schema : String
 * - resume text : String
 * - Self description : String
 * 
 * - matchScore : Number
 * 
 * - Technical questions : 
 *          [{
 *              question : "",
 *              intention : "",
 *              answer : ""
 *          }]
 * 
 * - Behavioral questions : 
 *          [{
 *              question : "",
 *              intention : "",
 *              answer : ""
 *          }]
 * 
 * - Skills gaps : 
 *          [{
 *              skill : "",
 *              severity : {
 *                  type : String
 *                  enum : ["low", "medium", "high"]
 *              }         
 * }]
 * - Preparation plan : 
 *          [{
 *              day : Number,
 *              Focus : String,
 *              tasks : [String]
 *          }]
 *  
 */


const technicalQuestionsSchema = new mongoose.Schema({

  question: {
    type: String,
    required: [true, "Technical questions is required"],
  },

  intention: {
    type: String,
    required: [true, "intention is required"],
  },

  answer: {
    type: String,
    required: [true, "answer is required"],

  },
}, {
    _id : false
});


const behavioralQuestionsSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, "Behavioral question is required"],
  },

  intention: {
    type: String,
    required: [true, "Intention is required"],
  },

  answer: {
    type: String,
    required: [true, "Answer is required"],
  },
}, {
    _id : false
});



const skillsGapsSchema = new mongoose.Schema({
  skill: {
    type: String,
    required: [true, "Skill is required"],
  },

  severity: {
    type: String,
    enum: {
      values: ["low", "medium", "high"],
    },
    required: [true, "Severity is required"],
  },
},{
    _id : false
});


const preparationPlanSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: [true, "Day is required"],
  },

  focus: {
    type: String,
    required: [true, "Focus is required"],
  },

  tasks: {
    type: [String],
    required: [true, "Tasks are required"],    
  },

});



const InterviewReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Untitled Position",
    },

    jobDescription: {
      type: String,
      required: [true, "Job description is required"],
    },

    resume: {
      type: String,
      required: [true, "Resume is required"],
    },

    selfDescription: {
      type: String,
    },

    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      required: [true, "Match score is required"],
    },

    technicalQuestions: [technicalQuestionsSchema],

    behavioralQuestions: [behavioralQuestionsSchema],

    skillsGaps: [skillsGapsSchema],

    preparationPlan: [preparationPlanSchema],

    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "users"
    }
  },
  {
    timestamps: true,
  }
);


const InterviewReportModel = mongoose.model( "InterviewReport", InterviewReportSchema );



module.exports = InterviewReportModel;