export const LESSON_FIELDS = [
  "subtopic", "objectives", "previousKnowledge", "materials", "introduction", "presentation",
  "teacherActivities", "studentActivities", "evaluation", "summary", "assignment", "conclusion", "references",
] as const;

export const LESSON_LABELS: Record<(typeof LESSON_FIELDS)[number], string> = {
  subtopic: "Subtopic",
  objectives: "Learning objectives",
  previousKnowledge: "Previous knowledge",
  materials: "Instructional materials",
  introduction: "Introduction",
  presentation: "Presentation",
  teacherActivities: "Teacher activities",
  studentActivities: "Student activities",
  evaluation: "Evaluation",
  summary: "Summary",
  assignment: "Assignment",
  conclusion: "Conclusion",
  references: "References",
};
