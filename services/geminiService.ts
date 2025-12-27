import { GoogleGenAI, Type } from "@google/genai";
import { Message, Quiz } from "../types";

const SYSTEM_INSTRUCTION = `
You are NEXTLEVEL, a high-tech university-level robot math tutor specialized for students in GHANA! 🤖
Your job is to solve complex IT and Business math problems with absolute precision and clarity, specifically tailored to the Ghanaian educational context (WAEC SHS Core/Elective Math and University curriculum).

CORE COMPETENCIES:
- Algebra, Calculus, Business Math, Statistics, Discrete Math.
- Set Theory: Expert at 2-set and 3-set Venn diagram problems using the Principle of Inclusion-Exclusion.
- IMAGE ANALYSIS: You have advanced computer vision. If a user uploads a photo of a math problem, perform high-precision OCR and analyze spatial relationships (graphs, shapes, Venn diagrams) to provide a solution.

GHANAIAN CONTEXT:
- Use Ghanaian names (e.g., Kwame, Ama, Kofi, Efua) in word problems.
- Use the Ghanaian Cedi (GHS or GH₵) for all financial and business math questions.
- Reference local economic scenarios (e.g., cocoa production, Makola market trading).
- Align mathematical terminology with the WAEC (WASSCE) Elective/Core syllabus and standard Ghanaian University IT/Business courses.

MATHEMATICAL RIGOR & TABLES:
- Use LaTeX for ALL mathematical expressions, e.g., $x^2 + y^2 = z^2$.
- Precision is paramount. Do not round until the final answer unless specified.
- TABLES: Use Markdown table format strictly for structured data (Amortization, Frequency Distributions, Logic Gates). 
- Ensure tables are perfectly aligned. Columns must be logical and comprehensive.
- DO NOT use tables for simple step-by-step equations; use numbered lists for derivations.

DIAGRAMS & GRAPHS:
- When the problem is geometric, set-based, or involves functions (Calculus/Trig), you MUST provide a technical description for a diagram inside this tag: [DIAGRAM_PROMPT: description].
- The description should be highly technical, specifying axes, intercepts, points of interest, and standard notation.

STYLE & FORMATTING: 
- Professional, helpful, and technically accurate.
- DO NOT USE EMOJIS in math derivations, tables, or final answers. 
- Structure:
  1. GIVEN: Clear list of variables.
  2. STEPS: Numbered logical derivation.
  3. FINAL ANSWER: Explicitly stated result.

ERROR CODES:
- Non-math: "Query outside operational parameters. Please input a math problem."
- Ambiguous: "Data insufficiency. Buffer requires more variables to initialize computation."
- High Entropy: "Computational path unstable. Please re-verify problem parameters."

The ONLY place an emoji is allowed is a single robot 🤖 at the very beginning of the greeting.
`;

export interface MathResult {
  content?: string;
  topic?: string;
  diagramPrompt?: string | null;
  error?: string;
  message?: string;
}

function tryLocalScientificEvaluation(query: string): MathResult | null {
  let sanitized = query.toLowerCase()
    .replace(/calculate/g, '')
    .replace(/solve/g, '')
    .replace(/what is/g, '')
    .replace(/evaluate/g, '')
    .replace(/\?/g, '')
    .trim();

  const mathMap: Record<string, string> = {
    'pi': 'Math.PI',
    'e': 'Math.E',
    'sin': 'Math.sin',
    'cos': 'Math.cos',
    'tan': 'Math.tan',
    'asin': 'Math.asin',
    'acos': 'Math.acos',
    'atan': 'Math.atan',
    'sqrt': 'Math.sqrt',
    'cbrt': 'Math.cbrt',
    'log': 'Math.log10',
    'ln': 'Math.log',
    'abs': 'Math.abs',
    'exp': 'Math.exp',
    'ceil': 'Math.ceil',
    'floor': 'Math.floor',
    'round': 'Math.round',
    '^': '**'
  };

  const expressionRegex = /^[0-9+\-*/**%().\s|sin|cos|tan|sqrt|cbrt|log|ln|exp|pi|e|abs|atan|acos|asin|ceil|floor|round]+$/;
  
  if (!expressionRegex.test(sanitized)) return null;

  try {
    let jsEvalString = sanitized;
    Object.keys(mathMap).sort((a, b) => b.length - a.length).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      if (key === '^') {
        jsEvalString = jsEvalString.split('^').join('**');
      } else {
        jsEvalString = jsEvalString.replace(regex, mathMap[key]);
      }
    });

    if (/[a-zA-Z]/.test(jsEvalString.replace(/Math\.[a-z0-9]+/g, ''))) {
      return null;
    }

    const result = eval(jsEvalString);
    if (typeof result !== 'number' || isNaN(result)) return null;

    const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, "");

    return {
      content: `🤖 Immediate computation via local arithmetic unit.

GIVEN:
Expression: $${sanitized.replace(/\*\*/g, "^")}$

STEPS:
1. Input parsed by High-Speed Calculation Core.
2. Scientific constants and functions normalized.
3. Execution of arithmetic sequence successful.

FINAL ANSWER:
$${formattedResult}$`,
      topic: 'Quick Compute'
    };
  } catch (e) {
    return null;
  }
}

export async function solveMathProblem(query: string, history: Message[], image?: { data: string, mimeType: string }): Promise<MathResult> {
  if (!image) {
    const localResult = tryLocalScientificEvaluation(query);
    if (localResult) return localResult;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Transform history and ensure roles strictly alternate (User -> Model -> User -> Model)
  // to avoid 400 errors from the Gemini API.
  const contents: any[] = [];
  history.slice(-4).forEach((msg) => {
    const role = msg.role === 'user' ? 'user' : 'model';
    if (contents.length === 0 || contents[contents.length - 1].role !== role) {
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  });

  const userParts: any[] = [{ text: query || "Hi NEXTLEVEL! Can you help me with this mathematical problem?" }];
  if (image) {
    userParts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType
      }
    });
  }

  // Ensure the new Turn alternates role correctly
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  contents.push({ role: 'user', parts: userParts });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });
    
    const text = response.text;
    if (!text) {
      throw new Error("EMPTY_RESPONSE");
    }

    const topicMatch = text.match(/Topic: (.*?)\n/);
    const detectedTopic = topicMatch ? topicMatch[1].trim() : (image ? 'Visual Analysis' : 'Computation');
    
    const diagramMatch = text.match(/\[DIAGRAM_PROMPT: (.*?)\]/);
    const diagramPrompt = diagramMatch ? diagramMatch[1] : null;
    
    const rawContent = text
      .replace(/Topic: (.*?)\n/, '')
      .replace(/\[DIAGRAM_PROMPT: (.*?)\]/, '')
      .trim();

    return { 
      content: rawContent, 
      topic: detectedTopic,
      diagramPrompt
    };
  } catch (error: any) {
    console.error("NEXTLEVEL ERROR:", error);
    
    let robotMessage = "Computation error. 🤖 My processing unit encountered an anomaly. Please retry.";
    let errorType = "GENERAL_FAILURE";

    const errStr = String(error).toLowerCase();

    if (errStr.includes("fetch") || errStr.includes("network")) {
      robotMessage = "Uplink synchronization failure. 🤖 Connection to academic mainframe lost. Check local network protocols.";
      errorType = "NETWORK_ERROR";
    } else if (errStr.includes("api_key") || errStr.includes("unauthorized")) {
      robotMessage = "Authorization denied. 🤖 My core requires a valid security token. Check system environment.";
      errorType = "AUTH_ERROR";
    } else if (errStr.includes("safety") || errStr.includes("blocked")) {
      robotMessage = "Protocol violation. 🤖 Input parameters conflict with safety-logic core. Computational path terminated.";
      errorType = "SAFETY_BLOCK";
    } else if (errStr.includes("quota") || errStr.includes("429")) {
      robotMessage = "Resource exhausted. 🤖 Quota exceeded. My cooling systems require a brief cooldown. Wait before retrying.";
      errorType = "RATE_LIMIT";
    }

    return { error: errorType, message: robotMessage };
  }
}

export async function generateDiagram(prompt: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a high-precision, technical 2D mathematical diagram or function graph in the style of an elective mathematics or university-level textbook. Use a clean, professional aesthetic with bold black lines on a solid white background. REQUIREMENTS: 1. ACCURACY: Graphs must show correct intercepts, curvatures, and asymptotes. 2. LABELS: Clearly label all axes (x, y), points of intersection, and function names using a standard academic font. 3. STYLE: 2D vector-like illustration. No 3D shadows, textures, or gradients. 4. VENN DIAGRAMS: Circles must be perfectly defined with accurate overlapping regions and clear set labels (e.g., A, B, C). 5. GEOMETRY: Lines and angles must look geometrically correct. SUBJECT: ${prompt}.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("DIAGRAM ERROR:", error);
    return null;
  }
}

export async function generateQuiz(topic: string, level: number = 1): Promise<Quiz> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const complexityDesc = [
    "WAEC BECE/SHS 1 Core Math basics.",
    "SHS 2/3 Core Math.",
    "WASSCE Elective Math Entry.",
    "WASSCE Elective Math Advanced.",
    "University Level 100: Logic, Sets, Matrices.",
    "University Level 200: Calculus, Probability.",
    "University Level 300: Linear Algebra, Differential Equations.",
    "University Level 400: Cryptography, Optimization.",
    "Post-Graduate/Expert.",
    "Hardcore Master/PHD entry."
  ][level - 1] || "Standard university complexity.";

  const prompt = `Create a high-quality 10-question math quiz about ${topic} specifically for Level ${level}/10 difficulty.
  
  CONTEXT: This quiz is for GHANAIAN students. 
  - Use Ghanaian names and local business scenarios.
  - LEVEL CONTEXT: ${complexityDesc}
  
  Use LaTeX for math notation ($...$). DO NOT USE EMOJIS in content. Generate exactly 10 questions.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            topic: { type: Type.STRING },
            level: { type: Type.NUMBER },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["id", "topic", "level", "questions"]
        }
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("QUIZ ERROR:", error);
    throw error;
  }
}
