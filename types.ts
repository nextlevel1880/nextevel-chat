
export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  topic?: string;
}

export interface SolvedProblem {
  id: string;
  query: string;
  solution: string;
  topic: string;
  savedAt: Date;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  topic: string;
  level: number; // 1 to 10
  questions: QuizQuestion[];
  score?: number;
  completedAt?: Date;
}

export interface UserStats {
  problemsSolved: number;
  quizzesTaken: number;
  averageScore: number;
  levelMastery: Record<string, number>; // Topic key -> Max level achieved (1-10)
  topicMastery: Record<string, number>; // Topic key -> Accuracy %
}

export enum MathTopic {
  PURE = 'Pure Mathematics',
  BUSINESS = 'Business Mathematics',
  ECONOMICS = 'Economics Mathematics',
  IT_COMPUTATIONAL = 'IT / Computational Mathematics',
  NON_MATH = 'Non-Mathematical'
}
