export const SUBJECTS = [
  { id: 'math', name: 'Математика', path: '/dashboard?subject=math' },
  { id: 'logic', name: 'Логика & IQ', path: '/dashboard?subject=logic' },
  { id: 'kazakh', name: 'Казахский язык', path: '/dashboard?subject=kazakh' },
  { id: 'russian', name: 'Русский язык', path: '/dashboard?subject=russian' },
  { id: 'english', name: 'Английский язык', path: '/dashboard?subject=english' },
  { id: 'reading', name: 'Анализ текста', path: '/dashboard?subject=reading' },
];

export const getSubjectLabel = (id: string) => {
  const subject = SUBJECTS.find(s => s.id === id.toLowerCase());
  return subject ? subject.name : id;
};
