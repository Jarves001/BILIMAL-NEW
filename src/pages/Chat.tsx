import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Send, Users, User as UserIcon, Calendar, CheckCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function Chat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchContacts = async () => {
      try {
        let contactsQuery;
        if (user.role === 'teacher') {
          // Teachers see their students
          contactsQuery = query(collection(db, 'users'), where('role', 'in', ['student', 'admin', 'moderator', 'curator']));
        } else if (user.role === 'student') {
          // Students see teachers, curators and admins
          contactsQuery = query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin', 'moderator', 'curator']));
        } else {
          // Admins/Moderators/Curators see everyone
          contactsQuery = query(collection(db, 'users'));
        }
        
        const snap = await getDocs(contactsQuery);
        let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) })).filter(u => u.id !== user.id);
        
        setContacts(list);
      } catch (err) {
        console.error('Error fetching chat contacts', err);
      }
    };
    
    fetchContacts();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUser) return;
    
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.id),
      orderBy('createdAt', 'asc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => m.participants.includes(selectedUser.id));
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    
    return () => unsub();
  }, [user, selectedUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;
    
    const text = newMessage;
    setNewMessage('');
    
    try {
      await addDoc(collection(db, 'messages'), {
        text,
        senderId: user.id,
        receiverId: selectedUser.id,
        participants: [user.id, selectedUser.id],
        subject: selectedUser.subject || (user as any).subject || 'general',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert('Ошибка отправки сообщения');
    }
  };

  const renderMessageContent = (text: string) => {
    // Basic URL detection to make links clickable (for Zoom links, etc.)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-200 hover:text-white transition-colors break-words">
            {part}
          </a>
        );
      }
      return <span key={i} className="break-words">{part}</span>;
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] p-4 md:p-8 flex">
      <div className="w-full flex shadow-xl border overflow-hidden rounded-3xl bg-white">
        
        {/* Sidebar */}
        <div className="w-1/3 border-r flex flex-col bg-slate-50/80">
          <div className="p-6 border-b bg-white flex flex-col gap-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-primary">Сообщения</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{contacts.length} Контактов</p>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 relative">
            {contacts.map(c => (
              <button
                 key={c.id}
                 onClick={() => setSelectedUser(c)}
                 className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all duration-300 border-2 ${
                   selectedUser?.id === c.id 
                    ? 'border-primary bg-primary shadow-md text-white' 
                    : 'border-transparent bg-white hover:border-slate-200 shadow-sm text-slate-900'
                 }`}
              >
                 <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center font-black rounded-lg ${
                   selectedUser?.id === c.id ? 'bg-white text-primary' : 'bg-primary/5 text-primary'
                 }`}>
                    {c.name?.charAt(0) || <UserIcon size={20}/>}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{c.name}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest truncate mt-0.5 ${
                      selectedUser?.id === c.id ? 'text-white/70' : 'text-slate-400'
                    }`}>{c.role} {c.subject ? `• ${c.subject}` : ''}</div>
                 </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="w-2/3 flex flex-col bg-slate-50 relative">
           {selectedUser ? (
             <>
               <div className="px-8 py-5 border-b bg-white flex items-center justify-between z-10 shadow-sm">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 flex items-center justify-center font-black rounded-lg bg-primary/5 text-primary">
                      {selectedUser.name?.charAt(0) || <UserIcon size={20}/>}
                   </div>
                   <div>
                     <div className="font-black text-lg text-primary leading-tight">{selectedUser.name}</div>
                     <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> В сети
                     </div>
                   </div>
                 </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6 relative">
                  {/* Decorative background logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <Users size={400} />
                  </div>

                  {messages.map(msg => {
                     const isMe = msg.senderId === user.id;
                     return (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         key={msg.id} 
                         className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                       >
                          <div className={`max-w-[75%] p-5 shadow-sm relative ${
                            isMe 
                              ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                              : 'bg-white border text-slate-800 rounded-2xl rounded-tl-sm'
                          }`}>
                             <div className="text-[15px] leading-relaxed">
                               {renderMessageContent(msg.text)}
                             </div>
                             <div className={`text-[10px] mt-3 flex items-center gap-1 font-bold uppercase tracking-widest ${
                               isMe ? 'text-white/60 justify-end' : 'text-slate-400'
                             }`}>
                               <Clock size={10} />
                               {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                               {isMe && <CheckCheck size={14} className="ml-1 text-white/50" />}
                             </div>
                          </div>
                       </motion.div>
                     );
                  })}
                  <div ref={chatEndRef} />
               </div>
               
               <div className="p-6 bg-white border-t">
                 <form onSubmit={sendMessage} className="relative flex items-center">
                    <input 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Напишите сообщение, прикрепите ссылку на Zoom..."
                      className="w-full bg-slate-100 rounded-2xl pl-6 pr-16 py-4 outline-none text-sm font-medium border-2 border-transparent focus:border-primary/20 focus:bg-white shadow-inner transition-all"
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                    >
                       <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
                    </button>
                 </form>
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="z-10 flex flex-col items-center max-w-sm text-center"
               >
                 <div className="w-24 h-24 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-6 text-primary rotate-12">
                   <Users size={48} className="-rotate-12" />
                 </div>
                 <h2 className="text-2xl font-black text-primary uppercase tracking-tight mb-3">Сообщения</h2>
                 <p className="text-slate-500 font-medium text-sm">
                   Выберите контакт из списка слева, чтобы начать переписку. Учителя будут отправлять сюда ссылки на Zoom-конференции.
                 </p>
               </motion.div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

