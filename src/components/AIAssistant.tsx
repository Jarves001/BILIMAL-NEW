import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

// Initialize AI globally so it's ready.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
let chatInstance: any = null;

export default function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  // Available for Premium users (any active subscription) or Admins
  const hasAccess = user?.role === 'admin' || user?.subscription === 'active';

  if (!user || !hasAccess) return null;

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      if (!chatInstance) {
        chatInstance = ai.chats.create({
          model: "gemini-3.1-pro-preview",
          config: {
            systemInstruction: 'Ты дружелюбный и умный ИИ-помощник образовательной платформы BILIMAL. Твоя задача — помогать студентам с учебой: объяснять непонятные темы, направлять ход мыслей, давать подсказки к решениям. СТРОГОЕ ПРАВИЛО: НИКОГДА не решай задачи за пользователя целиком и не давай готовые прямые ответы. Только объясняй "как сделать правильно" и задавай наводящие вопросы. Пиши кратко, понятно и поддерживающе. Все ответы форматируй с помощью Markdown.',
            temperature: 0.7,
          }
        });
      }

      const response = await chatInstance.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', content: response.text || 'Нет ответа.' }]);
    } catch (err) {
      console.error('AI Error:', err);
      setMessages(prev => [...prev, { role: 'model', content: 'Ой, произошла ошибка подключения к ИИ. Попробуйте позже.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {isOpen ? (
        <div className="bg-white border text-base border-slate-200 rounded-2xl shadow-2xl w-[360px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden mb-4 transition-all duration-300 transform origin-bottom-right">
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold leading-tight">BILIMAL AI</h3>
                <p className="text-indigo-100 text-xs">Премиум Ассистент</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot size={32} className="text-indigo-600" />
                </div>
                <p className="font-medium text-slate-700">Привет, {user.name}!</p>
                <p className="text-sm mt-2 text-slate-500 px-4">Я твой личный ИИ-наставник. Задавай мне любые вопросы по учебе, тестам, и я помогу тебе разобраться!</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <div className="markdown-body prose prose-sm max-w-none text-left prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-800">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-left">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center h-[44px]">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-slate-200">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Задай вопрос ИИ..."
                className="w-full pl-4 pr-12 py-3 text-sm bg-slate-100 border-transparent rounded-full focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 group"
        >
          <Sparkles size={24} className="group-hover:animate-pulse" />
          <span className="font-semibold hidden group-hover:block whitespace-nowrap overflow-hidden transition-all px-1 origin-left">BILIMAL AI</span>
        </button>
      )}
    </div>
  );
}
