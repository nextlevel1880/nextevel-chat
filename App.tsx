import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, MathTopic, SolvedProblem, Quiz, UserStats, QuizQuestion } from './types';
import { solveMathProblem, generateQuiz, generateDiagram } from './services/geminiService';
import { Icons } from './constants';
import Robot from './components/Robot';
import GlassPanel from './components/GlassPanel';
import katex from 'katex';

interface MessageWithDiagram extends Message {
  diagramUrl?: string;
  imageUrl?: string;
  isGeneratingDiagram?: boolean;
  isError?: boolean;
}

const CHALLENGING_PURE_TOPICS = [
  "Complex Analysis (Residues & Contours)",
  "Abstract Algebra (Group Theory)",
  "Real Analysis (Convergence & Topology)",
  "Linear Algebra (Vector Spaces & Eigenvalues)",
  "Calculus (Multivariable Differentiation)",
  "Calculus (Advanced Integration Techniques)",
  "Differential Equations (Higher Order ODEs)",
  "Discrete Mathematics (Graph Theory)",
  "Number Theory (Modular Arithmetic)",
  "Mathematical Logic (First-Order Logic)"
];

const BUSINESS_TOPICS = [
  "Financial Mathematics (Interest & Annuities)",
  "Business Calculus (Optimization & Marginals)",
  "Mathematics of Finance (Amortization & Sinking Funds)",
  "Linear Programming for Business",
  "Decision Analysis & Probability",
  "Inventory Management Models",
  "Market Equilibrium Analysis",
  "Time Series Analysis for Business",
  "Operations Research (Queuing Theory)",
  "Actuarial Science Foundations"
];

const ECONOMICS_TOPICS = [
  "Mathematical Economics (Static Analysis)",
  "Econometrics (Regression Analysis)",
  "Microeconomic Theory (Consumer & Producer)",
  "Macroeconomic Modeling (Dynamic Systems)",
  "Game Theory (Strategic Behavior)",
  "General Equilibrium Analysis",
  "Welfare Economics Mathematics",
  "Stochastic Processes in Economics",
  "Input-Output Analysis",
  "Convex Optimization in Economics"
];

const IT_TOPICS = [
  "Discrete Structures (Boolean Algebra)",
  "Cryptographic Mathematics (RSA & Elliptic Curves)",
  "Graph Theory & Network Algorithms",
  "Linear Algebra for Machine Learning",
  "Numerical Methods for Computing",
  "Computational Complexity Theory",
  "Formal Languages & Automata Theory",
  "Probability & Random Processes for IT",
  "Information Theory (Entropy & Coding)",
  "Optimization Algorithms for AI"
];

const getTopicListForCategory = (category: string | null) => {
  switch (category) {
    case MathTopic.PURE: return CHALLENGING_PURE_TOPICS;
    case MathTopic.BUSINESS: return BUSINESS_TOPICS;
    case MathTopic.ECONOMICS: return ECONOMICS_TOPICS;
    case MathTopic.IT_COMPUTATIONAL: return IT_TOPICS;
    default: return [];
  }
};

const RoboticReadout: React.FC<{ text: string }> = ({ text }) => {
  const [contentBlocks, setContentBlocks] = useState<Array<{ type: 'text' | 'table', content: string | string[][] }>>([]);
  const [visibleBlockCount, setVisibleBlockCount] = useState(0);

  useEffect(() => {
    const lines = text.split('\n');
    const blocks: Array<{ type: 'text' | 'table', content: string | string[][] }> = [];
    let currentTable: string[][] = [];

    lines.forEach((line) => {
      const isTableRow = /^[\s]*\|.*\|[\s]*$/.test(line) && line.includes('|');
      if (isTableRow) {
        if (line.trim().match(/^[| \-:]+$/)) return; 
        const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
        if (cells.length > 0) currentTable.push(cells);
      } else {
        if (currentTable.length > 0) {
          blocks.push({ type: 'table', content: currentTable });
          currentTable = [];
        }
        if (line.trim() !== '') blocks.push({ type: 'text', content: line });
      }
    });

    if (currentTable.length > 0) blocks.push({ type: 'table', content: currentTable });
    setContentBlocks(blocks);
    setVisibleBlockCount(0);
  }, [text]);

  useEffect(() => {
    if (visibleBlockCount < contentBlocks.length) {
      const timer = setTimeout(() => setVisibleBlockCount(v => v + 1), 30);
      /* Fix: Replaced incorrect setTimeout with clearTimeout in the cleanup function */
      return () => clearTimeout(timer);
    }
  }, [visibleBlockCount, contentBlocks]);

  const renderTextWithMath = (line: string) => {
    if (!line) return null;
    const parts = line.split(/(\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          const html = katex.renderToString(math, { throwOnError: false, displayMode: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5" />;
        } catch (e) {
          return <span key={i} className="text-red-400">{part}</span>;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3 font-mono text-sm leading-relaxed text-left overflow-anchor-none">
      {contentBlocks.slice(0, visibleBlockCount).map((block, idx) => {
        if (block.type === 'table') {
          const tableData = block.content as string[][];
          return (
            <div key={idx} className="overflow-x-auto my-4 animate-in fade-in slide-in-from-left-2 duration-500">
              <table className="min-w-full border-collapse border border-emerald-500/20 bg-emerald-950/40 text-left rounded-xl overflow-hidden shadow-2xl">
                <thead>
                  <tr className="bg-emerald-500/15 backdrop-blur-md">
                    {tableData[0].map((cell, cIdx) => (
                      <th key={cIdx} className="p-3 text-emerald-300 font-black uppercase text-[10px] tracking-[0.2em] text-center border border-emerald-500/10">
                        {renderTextWithMath(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-emerald-500/5 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3 text-emerald-50/90 text-xs text-center border border-emerald-500/10 tabular-nums">
                          {renderTextWithMath(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const line = block.content as string;
        const isAnswer = line.includes('FINAL ANSWER:');
        const isHeader = line.includes('GIVEN:') || line.includes('STEPS:') || line.startsWith('Part');
        
        return (
          <div key={idx} className={`animate-in fade-in duration-300 pl-4 py-1.5 transition-all whitespace-pre-wrap ${
            isAnswer ? 'bg-emerald-400/10 text-emerald-200 font-black border-l-4 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] my-4 rounded-r-lg' : 
            isHeader ? 'text-emerald-400 font-black mt-6 mb-2 text-[11px] uppercase tracking-[0.25em] flex items-center gap-2' : 'text-emerald-50/70 border-l border-emerald-500/10'
          }`}>
            {isHeader && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
            {renderTextWithMath(line)}
          </div>
        );
      })}
    </div>
  );
};

type ViewMode = 'chat' | 'quizzes' | 'stats' | 'saved';
type VaultSecurity = 'locked' | 'decrypting' | 'unlocked';

const App: React.FC = () => {
  const [appIsBooting, setAppIsBooting] = useState(true);
  const [bootSequence, setBootSequence] = useState(0);
  const [bootLog, setBootLog] = useState<string>("Initializing Core Matrix...");

  const [messages, setMessages] = useState<MessageWithDiagram[]>([
    {
      id: '1',
      role: 'assistant',
      content: "hi there! i'm NEXTLEVEL, your math buddy! 🤖\nhow can i help you today? you can type a problem or share a photo!",
      timestamp: new Date(),
      topic: ''
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ file: File, preview: string, base64: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [savedProblems, setSavedProblems] = useState<SolvedProblem[]>([]);
  
  const [vaultSecurity, setVaultSecurity] = useState<VaultSecurity>('locked');
  const [decryptionProgress, setDecryptionProgress] = useState(0);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizCategory, setQuizCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  
  const [userStats, setUserStats] = useState<UserStats>({
    problemsSolved: 0,
    quizzesTaken: 0,
    averageScore: 0,
    levelMastery: {},
    topicMastery: {}
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  useEffect(() => {
    const totalDuration = 10000;
    const intervalTime = 100;
    const steps = totalDuration / intervalTime;
    
    const logMessages = [
      "Accessing Neural Pathways...",
      "Syncing with Academic Databases...",
      "Calibrating Math Logic Gates...",
      "Optimizing Computation Matrix...",
      "Loading IT & Business Modules...",
      "Connecting to Robotic Hub...",
      "Verifying Mathematical Accuracy...",
      "Almost Ready. Preparing Interface...",
      "Synchronization Complete.",
      "Welcome to NEXTLEVEL."
    ];

    const timer = setTimeout(() => {
      setAppIsBooting(false);
    }, totalDuration);

    const sequenceInterval = setInterval(() => {
      setBootSequence(prev => {
        const next = prev + (100 / steps);
        const logIndex = Math.floor((next / 100) * logMessages.length);
        if (logIndex < logMessages.length) {
          setBootLog(logMessages[logIndex]);
        }
        return next >= 100 ? 100 : next;
      });
    }, intervalTime);

    return () => {
      clearTimeout(timer);
      clearInterval(sequenceInterval);
    };
  }, []);

  useEffect(() => {
    if (!appIsBooting && viewMode === 'chat') {
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isThinking, viewMode, scrollToBottom, appIsBooting]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '44px';
      if (inputValue !== '') {
        const scrollHeight = textarea.scrollHeight;
        const finalHeight = Math.min(Math.max(scrollHeight, 44), 200);
        textarea.style.height = `${finalHeight}px`;
      }
    }
  }, [inputValue]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({ file, preview: URL.createObjectURL(file), base64: (reader.result as string).split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if ((!inputValue.trim() && !selectedImage) || isThinking) return;

    const currentImage = selectedImage;
    const currentInput = inputValue;

    const userMsg: MessageWithDiagram = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput || "Please analyze this mathematical input.",
      imageUrl: currentImage?.preview,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue(''); 
    setSelectedImage(null);
    setIsThinking(true);
    
    try {
      const result = await solveMathProblem(userMsg.content, [...messages, userMsg], currentImage ? { data: currentImage.base64, mimeType: currentImage.file.type } : undefined);
      const assistantMsg: MessageWithDiagram = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content || result.message || "Logic failure. 🤖 Data corruption in reasoning core.",
        timestamp: new Date(),
        topic: result.topic,
        isGeneratingDiagram: !!result.diagramPrompt,
        isError: !!result.error
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      if (result.diagramPrompt) {
        const url = await generateDiagram(result.diagramPrompt);
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, diagramUrl: url || undefined, isGeneratingDiagram: false } : m));
      }
      
      if (result.topic && !result.error) {
        setSavedProblems(prev => [{
          id: assistantMsg.id,
          query: currentInput,
          solution: assistantMsg.content,
          topic: result.topic!,
          savedAt: new Date()
        }, ...prev]);

        setUserStats(prev => ({
          ...prev,
          problemsSolved: prev.problemsSolved + 1,
          topicMastery: { ...prev.topicMastery, [result.topic!]: Math.min(100, (prev.topicMastery[result.topic!] || 0) + 5) }
        }));
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Protocol error. 🤖 Re-initializing logic gates.", timestamp: new Date(), isError: true }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startQuiz = async (topic: string, level: number = 1) => {
    setIsThinking(true);
    setSelectedTopic(topic);
    setIsQuizComplete(false);
    try {
      const quiz = await generateQuiz(topic, level);
      setActiveQuiz(quiz);
      setQuizAnswers(new Array(10).fill(null));
      setCurrentQuestionIndex(0);
      setViewMode('quizzes');
    } catch (error) {
      alert("Quiz generation protocol failed. 🤖 System busy.");
    } finally {
      setIsThinking(false);
    }
  };

  const calculateCurrentScore = () => {
    if (!activeQuiz) return 0;
    let correct = 0;
    quizAnswers.forEach((ans, idx) => {
      if (ans !== null && ans === activeQuiz.questions[idx].correctAnswer) correct++;
    });
    return correct;
  };

  const initiateDecryption = () => {
    setVaultSecurity('decrypting');
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 20;
      if (prog >= 100) {
        setDecryptionProgress(100);
        clearInterval(interval);
        setTimeout(() => setVaultSecurity('unlocked'), 500);
      } else setDecryptionProgress(prog);
    }, 200);
  };

  if (appIsBooting) {
    return (
      <div className="h-screen w-screen bg-[#010c08] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="scan-line"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <Robot size="lg" isThinking={true} className="mb-12" />
          <div className="text-center space-y-6">
             <h1 className="text-4xl md:text-6xl font-black text-emerald-400 uppercase tracking-tighter robotic-glow animate-pulse">WELCOME TO NEXTLEVEL</h1>
             <p className="text-emerald-500/60 font-mono text-sm uppercase tracking-[0.4em] font-bold">University Intelligence Bot</p>
             <div className="h-6 overflow-hidden">
                <p className="text-emerald-400/40 font-mono text-[10px] uppercase tracking-widest animate-in slide-in-from-bottom-2 duration-300" key={bootLog}>> {bootLog}</p>
             </div>
          </div>
          <div className="mt-16 w-full max-w-sm space-y-4 px-4">
             <div className="flex justify-between text-[10px] font-mono text-emerald-400/60 uppercase tracking-widest">
                <span>Core System Initialization</span>
                <span className="tabular-nums">{Math.floor(bootSequence)}%</span>
             </div>
             <div className="h-2 bg-emerald-950/40 rounded-full border border-emerald-500/10 overflow-hidden p-0.5">
                <div className="h-full bg-emerald-400 shadow-[0_0_15px_#10b981] transition-all duration-300 ease-out" style={{ width: `${bootSequence}%` }}></div>
             </div>
          </div>
          <div className="absolute bottom-12 text-[9px] font-mono text-emerald-500/20 uppercase tracking-[0.3em] flex flex-col items-center gap-2">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full backdrop-blur-md">
                <span className="text-emerald-400/80 font-black">DEV: OPOKU WILLIAMS</span>
                <div className="w-1 h-1 bg-emerald-500/20 rounded-full"></div>
                <span className="text-emerald-500/60">0596181222</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#010c08] text-emerald-50 flex flex-col md:flex-row selection:bg-emerald-500/20 overflow-hidden relative">
      <div className="scan-line"></div>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 gap-2 z-10 shrink-0 h-full p-3 bg-transparent">
        <GlassPanel className="p-5 flex flex-col items-center gap-3 text-center border-emerald-500/10">
          <Robot size="md" isThinking={isThinking} />
          <h1 className="font-bold text-xl tracking-tight text-emerald-400 robotic-glow">NEXTLEVEL</h1>
        </GlassPanel>

        <GlassPanel className="flex-1 p-2 flex flex-col gap-1.5 border-emerald-500/5">
          <button onClick={() => setViewMode('chat')} className={`sidebar-item ${viewMode === 'chat' ? 'active' : ''}`}><Icons.Math /> <span>solve</span></button>
          <button onClick={() => setViewMode('quizzes')} className={`sidebar-item ${viewMode === 'quizzes' ? 'active' : ''}`}><Icons.Quiz /> <span>quiz</span></button>
          <button onClick={() => setViewMode('stats')} className={`sidebar-item ${viewMode === 'stats' ? 'active' : ''}`}><Icons.Chart /> <span>stats</span></button>
          <button onClick={() => setViewMode('saved')} className={`sidebar-item ${viewMode === 'saved' ? 'active' : ''}`}><Icons.Save /> <span>vault</span></button>
          
          <div className="mt-auto p-4 border-t border-emerald-500/5">
            <div className="flex flex-col items-center gap-2 p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/10 group hover:border-emerald-400/30 transition-all">
              <span className="text-[8px] font-mono text-emerald-500/60 uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors font-bold text-center">DEVELOPER UNIT</span>
              <span className="text-[10px] font-mono text-emerald-100 uppercase tracking-widest font-black text-center">OPOKU WILLIAMS</span>
              <span className="text-[9px] font-mono text-emerald-500/40 tabular-nums">0596181222</span>
            </div>
          </div>
        </GlassPanel>
      </aside>

      <main className="flex-1 flex flex-col z-10 min-w-0 min-h-0 h-full overflow-hidden relative">
        {/* Header (Desktop + Mobile Title) */}
        <header className="px-4 py-3 border-b border-emerald-500/10 flex items-center justify-between bg-emerald-950/40 backdrop-blur-xl shrink-0">
           <div className="flex items-center gap-3">
             <div className="md:hidden w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-1 shadow-lg">
                <Robot size="sm" />
             </div>
             <h1 className="md:hidden font-black text-emerald-400 tracking-tighter text-lg robotic-glow">NEXTLEVEL</h1>
             <span className="hidden md:block text-emerald-500/30 font-mono text-[9px] uppercase tracking-widest">{viewMode} operational cycle</span>
           </div>
           <div className="flex items-center gap-4">
              {isThinking && <span className="text-[9px] font-mono text-emerald-400 animate-pulse uppercase tracking-[0.15em] hidden sm:inline">Thinking...</span>}
              <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${isThinking ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500/40'}`}></div>
           </div>
        </header>

        {/* Content Container */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col min-h-0 scroll-smooth pb-32 md:pb-8">
            {viewMode === 'chat' && (
              <div className="max-w-5xl w-full mx-auto space-y-6 md:space-y-8">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-4 md:gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="shrink-0 mt-1">
                      {msg.role === 'user' ? <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center shadow-lg"><Icons.User /></div> : <Robot size="sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className={`p-5 md:p-6 rounded-2xl md:rounded-3xl border bg-emerald-950/40 border-emerald-500/10 shadow-2xl ${msg.isError ? 'border-red-500/20 bg-red-950/10' : ''}`}>
                         {msg.topic && (
                           <div className="mb-3 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]"></div>
                             <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 font-black">{msg.topic}</span>
                           </div>
                         )}
                         {msg.imageUrl && (
                           <div className="mb-6 rounded-2xl overflow-hidden border border-emerald-500/20 max-w-[100%] sm:max-w-[400px] shadow-2xl bg-emerald-900/40">
                             <img src={msg.imageUrl} alt="uploaded" className="w-full h-auto opacity-90 block" />
                           </div>
                         )}
                         {msg.role === 'assistant' ? <RoboticReadout text={msg.content} /> : <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed opacity-80 break-words">{msg.content}</div>}
                         {msg.isGeneratingDiagram && (
                           <div className="mt-6 p-8 md:p-10 flex flex-col items-center justify-center gap-4 border border-dashed border-emerald-500/20 rounded-3xl bg-emerald-500/5 text-center">
                             <Robot size="md" isThinking={true} />
                             <span className="text-[10px] font-mono text-emerald-400/80 uppercase animate-pulse tracking-[0.3em]">Constructing high-precision visual model...</span>
                           </div>
                         )}
                         {msg.diagramUrl && (
                           <div className="mt-6 p-2 bg-white rounded-3xl border border-emerald-500/20 shadow-2xl max-w-full sm:max-w-[650px] mx-auto overflow-hidden flex items-center justify-center">
                             <img src={msg.diagramUrl} alt="math diagram" className="w-full h-auto rounded-xl animate-in zoom-in-95 duration-700 block" />
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex gap-5 items-center pl-16 py-2">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0s] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} className="h-8 shrink-0" />
              </div>
            )}
            
            {viewMode === 'quizzes' && (
              <div className="max-w-4xl mx-auto py-8 md:py-12 w-full text-center space-y-12">
                {!activeQuiz ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
                    <Robot size="lg" className="mx-auto mb-8" />
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-emerald-400 robotic-glow mb-10">PROFICIENCY EVALUATOR</h3>
                    {!quizCategory ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.values(MathTopic).filter(t => t !== 'Non-Mathematical').map(topic => (
                          <button key={topic} onClick={() => setQuizCategory(topic)} className="p-8 rounded-3xl bg-emerald-950/30 border border-emerald-500/10 hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all text-xs font-black tracking-widest text-emerald-400 uppercase shadow-xl">{topic}</button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getTopicListForCategory(quizCategory).map(topic => (
                          <button key={topic} onClick={() => startQuiz(topic, (userStats.levelMastery[topic] || 0) + 1)} className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/10 hover:border-emerald-400 transition-all text-[10px] font-black uppercase tracking-widest text-emerald-400">
                             {topic} (LVL {(userStats.levelMastery[topic] || 0) + 1})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                   <div className="text-left space-y-8 max-w-2xl mx-auto px-4">
                      <div className="flex justify-between border-b border-emerald-500/10 pb-5">
                         <div>
                            <p className="text-[10px] font-mono text-emerald-500/40 uppercase">Module: {activeQuiz.topic}</p>
                            <h4 className="text-lg font-black text-emerald-400">QUESTION {currentQuestionIndex + 1}_OF_10</h4>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-mono text-emerald-500/40 uppercase">System Score</p>
                            <p className="text-xl font-black text-emerald-50">{calculateCurrentScore()}/10</p>
                         </div>
                      </div>
                      <GlassPanel className="p-8 space-y-8 bg-emerald-950/60 shadow-2xl">
                         <p className="text-lg font-bold text-emerald-50 leading-relaxed font-mono">{activeQuiz.questions[currentQuestionIndex].question}</p>
                         <div className="grid gap-3">
                           {activeQuiz.questions[currentQuestionIndex].options.map((opt, oIdx) => (
                             <button key={oIdx} onClick={() => {
                               if (quizAnswers[currentQuestionIndex] === null) {
                                 const newAns = [...quizAnswers];
                                 newAns[currentQuestionIndex] = oIdx;
                                 setQuizAnswers(newAns);
                               }
                             }} className={`p-5 text-left rounded-2xl border transition-all text-sm font-mono ${quizAnswers[currentQuestionIndex] === oIdx ? (oIdx === activeQuiz.questions[currentQuestionIndex].correctAnswer ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_15px_#10b98144]' : 'bg-red-500/10 border-red-500/50 text-red-100') : 'bg-emerald-950/60 border-emerald-500/10 text-emerald-400/60 hover:border-emerald-400/40'}`}>
                               {opt}
                             </button>
                           ))}
                         </div>
                         {quizAnswers[currentQuestionIndex] !== null && (
                            <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 animate-in fade-in">
                               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Robotic Explanation:</p>
                               <p className="text-xs text-emerald-50/70 font-mono leading-relaxed">{activeQuiz.questions[currentQuestionIndex].explanation}</p>
                            </div>
                         )}
                      </GlassPanel>
                      <button disabled={quizAnswers[currentQuestionIndex] === null} onClick={() => {
                        if (currentQuestionIndex < 9) setCurrentQuestionIndex(v => v + 1);
                        else setIsQuizComplete(true);
                      }} className="w-full py-4 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-20 hover:bg-emerald-400/20">
                        {currentQuestionIndex === 9 ? 'Complete Analysis' : 'Next Sequence'}
                      </button>
                   </div>
                )}
              </div>
            )}

            {viewMode === 'stats' && (
               <div className="max-w-4xl w-full mx-auto py-12 space-y-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col items-center gap-4 text-center">
                     <Robot size="lg" className="mb-2" />
                     <h2 className="text-3xl font-black text-emerald-400 robotic-glow uppercase tracking-tighter">PERFORMANCE METRICS</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassPanel className="p-10 border-emerald-500/10 text-center bg-emerald-950/40 shadow-xl group hover:border-emerald-400/30 transition-all">
                      <div className="text-6xl font-black text-emerald-400 mb-2 tabular-nums group-hover:scale-110 transition-transform">{userStats.problemsSolved}</div>
                      <div className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-[0.3em]">problems_analyzed</div>
                    </GlassPanel>
                    <GlassPanel className="p-10 border-emerald-500/10 text-center bg-emerald-950/40 shadow-xl group hover:border-emerald-400/30 transition-all">
                      <div className="text-6xl font-black text-emerald-400 mb-2 tabular-nums group-hover:scale-110 transition-transform">{userStats.averageScore}%</div>
                      <div className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-[0.3em]">logic_precision_rate</div>
                    </GlassPanel>
                  </div>
               </div>
            )}

            {viewMode === 'saved' && (
               <div className="max-w-4xl w-full mx-auto py-12 px-4 space-y-8">
                  {vaultSecurity === 'locked' ? (
                    <div className="flex flex-col items-center justify-center gap-10 py-20">
                       <Robot size="lg" className="opacity-20 blur-[1px]" />
                       <h3 className="text-2xl font-black text-emerald-400 uppercase robotic-glow">ENCRYPTED VAULT</h3>
                       <button onClick={initiateDecryption} className="px-12 py-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl font-black uppercase tracking-widest robotic-glow hover:bg-emerald-500/20">ACCESS LOGS</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> SECURED ARCHIVES
                       </h3>
                       {savedProblems.length === 0 ? <p className="text-center opacity-30 font-mono py-20">EMPTY_DATA_SET</p> : savedProblems.map(p => (
                         <GlassPanel key={p.id} className="p-8 space-y-4 bg-emerald-950/50 border-emerald-500/10 shadow-xl">
                            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-500/40 uppercase tracking-widest border-b border-emerald-500/5 pb-2">
                               <span className="text-emerald-400">{p.topic}</span>
                               <span>{new Date(p.savedAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-emerald-100 text-lg font-mono">{p.query}</h4>
                            <div className="p-6 bg-emerald-950/80 rounded-2xl border border-emerald-500/5 overflow-hidden">
                               <RoboticReadout text={p.solution} />
                            </div>
                         </GlassPanel>
                       ))}
                    </div>
                  )}
               </div>
            )}
        </div>

        {/* Input Area (Sticky Footer) */}
        {!appIsBooting && viewMode === 'chat' && (
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:relative md:bg-emerald-950/30 p-4 md:p-8 backdrop-blur-2xl border-t border-emerald-500/10 z-[60] flex flex-col items-center">
            <div className="max-w-5xl w-full space-y-4">
              {selectedImage && (
                <div className="relative inline-block animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-emerald-400/50 overflow-hidden shadow-2xl bg-emerald-900/60 p-1">
                    <img src={selectedImage.preview} alt="selected" className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 p-2 bg-[#010c08] border border-emerald-400/40 rounded-full text-emerald-400 shadow-2xl hover:bg-emerald-400 hover:text-black transition-all">
                    <Icons.Close />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSend} className="flex items-end gap-3 md:gap-4 group">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="h-12 w-12 md:h-14 md:w-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 hover:text-emerald-200 transition-all flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95 hover:bg-emerald-500/20"
                >
                  <Icons.Attachment />
                </button>

                <div className="flex-1 relative">
                  <textarea 
                    ref={textareaRef} 
                    rows={1} 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder="Ask a math problem..." 
                    className="w-full bg-emerald-950/80 border border-emerald-500/10 rounded-2xl py-3 px-5 md:py-4 md:px-6 text-emerald-50 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-all font-mono text-sm shadow-inner min-h-[48px] max-h-[120px] md:max-h-[250px] leading-relaxed resize-none block placeholder:text-emerald-500/20" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={(!inputValue.trim() && !selectedImage) || isThinking} 
                  className="h-12 px-6 md:h-14 md:px-10 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 rounded-2xl transition-all font-mono font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-lg robotic-glow active:scale-95 disabled:opacity-10 shrink-0"
                >
                  {isThinking ? '...' : 'SOLVE'}
                </button>
              </form>
              
              <div className="hidden md:flex items-center justify-center gap-6 text-[9px] font-mono uppercase tracking-[0.4em] pb-1 opacity-20">
                <span>NEXTLEVEL CORE_V1.2</span>
                <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                <span>DEV: OPOKU WILLIAMS [0596181222]</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation (The Trigger Menu) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#010c08]/90 backdrop-blur-3xl border-t border-emerald-500/10 flex justify-around items-center z-[70] px-4">
           <button onClick={() => setViewMode('chat')} className={`mobile-nav-btn ${viewMode === 'chat' ? 'active' : ''}`}>
             <Icons.Math />
             <span>Solve</span>
           </button>
           <button onClick={() => setViewMode('quizzes')} className={`mobile-nav-btn ${viewMode === 'quizzes' ? 'active' : ''}`}>
             <Icons.Quiz />
             <span>Quiz</span>
           </button>
           <button onClick={() => setViewMode('stats')} className={`mobile-nav-btn ${viewMode === 'stats' ? 'active' : ''}`}>
             <Icons.Chart />
             <span>Stats</span>
           </button>
           <button onClick={() => setViewMode('saved')} className={`mobile-nav-btn ${viewMode === 'saved' ? 'active' : ''}`}>
             <Icons.Save />
             <span>Vault</span>
           </button>
        </nav>
      </main>

      <style>{`
        .sidebar-item {
          display: flex; align-items: center; gap: 16px; padding: 18px 24px; border-radius: 20px;
          transition: all 0.3s ease; color: rgba(16, 185, 129, 0.2); font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.25em; border: 1px solid transparent;
        }
        .sidebar-item:hover { background: rgba(16, 185, 129, 0.05); color: rgba(16, 185, 129, 0.6); transform: translateX(8px); }
        .sidebar-item.active { background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.3); font-weight: 800; text-shadow: 0 0 15px rgba(52, 211, 153, 0.4); }
        
        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px; color: rgba(52, 211, 153, 0.3); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-nav-btn span { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; font-family: 'JetBrains Mono', monospace; }
        .mobile-nav-btn.active { color: #34d399; transform: translateY(-4px); text-shadow: 0 0 10px rgba(52, 211, 153, 0.4); }
        .mobile-nav-btn svg { width: 22px; height: 22px; }
        .mobile-nav-btn.active svg { filter: drop-shadow(0 0 8px #10b981); }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scan-line {
          animation: scan 10s linear infinite;
          opacity: 0.08;
          background: linear-gradient(to bottom, transparent, #10b98144, transparent);
          pointer-events: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 100;
        }
      `}</style>
    </div>
  );
};

export default App;