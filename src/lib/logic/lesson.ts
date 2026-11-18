/** The standard lesson-note template used in Nigerian schools: header details, then objectives, materials, steps, evaluation, summary and assignment. */
export const DETAIL_FIELDS = ["subtopic", "duration", "period", "averageAge", "classSize", "sex"] as const;
export const TEXT_FIELDS = [
  "previousKnowledge", "objectives", "materials", "references", "introduction", "presentation",
  "teacherActivities", "studentActivities", "evaluation", "summary", "conclusion", "assignment",
] as const;
export const LESSON_FIELDS = [...DETAIL_FIELDS, ...TEXT_FIELDS] as const;
export type LessonField = (typeof LESSON_FIELDS)[number];

export const LESSON_LABELS: Record<LessonField, string> = {
  subtopic: "Sub-topic",
  duration: "Duration",
  period: "Period / time",
  averageAge: "Average age of learners",
  classSize: "Number of learners",
  sex: "Sex",
  previousKnowledge: "Previous knowledge (entry behaviour)",
  objectives: "Behavioural objectives",
  materials: "Instructional materials",
  references: "Reference materials",
  introduction: "Introduction / set induction",
  presentation: "Presentation (Step 1, Step 2, Step 3 ...)",
  teacherActivities: "Teacher's activities",
  studentActivities: "Learners' activities",
  evaluation: "Evaluation",
  summary: "Summary",
  conclusion: "Conclusion",
  assignment: "Assignment",
};
export const LESSON_HINTS: Partial<Record<LessonField, string>> = {
  objectives: "Start each with a measurable verb: define, list, solve, draw, explain.",
  presentation: "Write each step on its own line with the teaching point.",
  evaluation: "Questions you will ask to check that learners understood.",
};
