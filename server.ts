import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Admin
const adminApp = initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(adminApp);

const PLANS = {
  basic: { title: 'Стандарт (30 дней)', days: 30, price: 9990, video: true, tests: true, exams: 1, ai: false },
  test: { title: 'Тесты (30 дней)', days: 30, price: 4990, video: false, tests: true, exams: 0, ai: false },
  premium: { title: 'Премиум (90 дней)', days: 90, price: 24990, video: true, tests: true, exams: 3, ai: true }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log('Starting BILIMAL Firebase-Powered Server...');
  
  // --- SEED DATA (Firestore version) ---
  const seed = async () => {
    try {
      // Check for a specific course to avoid duplicates even if multiple instances start
      const existingSnap = await db.collection('courses')
        .where('title', '==', 'Математика НИШ: Базовый уровень')
        .limit(1)
        .get();

      if (existingSnap.empty) {
        console.log('Seeding initial data to Firestore...');
        
        const course1Ref = await db.collection('courses').add({
          title: 'Математика НИШ: Базовый уровень',
          description: 'Полный курс по математике для подготовки к поступлению в 7 класс НИШ.',
          subject: 'Математика',
          teacher_id: 'system',
          created_at: FieldValue.serverTimestamp()
        });
        
        const lesson1Ref = await db.collection('courses').doc(course1Ref.id).collection('lessons').add({
          title: 'Логические задачи и множества',
          video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          order_index: 1,
          course_id: course1Ref.id
        });

        await db.collection('courses').doc(course1Ref.id).collection('lessons').doc(lesson1Ref.id).collection('tasks').add({
          question: 'Если в корзине 5 яблок и вы забрали 3, сколько яблок у вас осталось?',
          option_a: '2',
          option_b: '3',
          option_c: '5',
          option_d: '8',
          correct_answer: 'B',
          explanation: 'Вы забрали 3 яблока, значит у вас 3 яблока.'
        });

        await db.collection('courses').add({
          title: 'Критическое мышление и Логика',
          description: 'Развитие аналитических навыков для решения IQ тестов.',
          subject: 'Логика',
          teacher_id: 'system',
          created_at: FieldValue.serverTimestamp()
        });

        await db.collection('courses').add({
          title: 'Английский язык: Reading & Grammar',
          description: 'Подготовка к секции English для поступления в 7 класс.',
          subject: 'Английский язык',
          teacher_id: 'system',
          created_at: FieldValue.serverTimestamp()
        });

        await db.collection('courses').add({
          title: 'Қазақ тілі мен әдебиеті',
          description: 'Мәтінмен жұмыс және грамматикалық талдау.',
          subject: 'Казахский язык',
          teacher_id: 'system',
          created_at: FieldValue.serverTimestamp()
        });
        
        console.log('Seed complete.');
      }
    } catch (err) {
      console.error('Seed ERROR:', err);
    }
  };

  app.use(cors());
  app.use(express.json());

  // --- AUTH MIDDLEWARE ---
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
      } catch (err: any) {
        console.error('AUTH ERROR (403):', err.message);
        res.status(403).json({ error: 'Unauthorized', details: err.message });
      }
    } else {
      res.sendStatus(401);
    }
  };

  const getSubscription = async (userId: string) => {
    const subSnap = await db.collection('users').doc(userId).collection('subscription').doc('current').get();
    if (!subSnap.exists) return null;
    
    const sub = subSnap.data();
    if (!sub) return null;

    const isExpired = sub.end_date && new Date(sub.end_date) < new Date();
    if (isExpired) {
      await subSnap.ref.delete();
      return null;
    }
    return sub;
  };

  const checkSubscription = async (req: any, res: any, next: any) => {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();
    
    if (userData?.role === 'admin') return next();
    
    const sub = await getSubscription(req.user.uid);
    if (!sub) {
      return res.status(403).json({ 
        error: 'Subscription required', 
        message: 'Купите подписку для доступа к этому разделу' 
      });
    }
    req.subscription = sub;
    next();
  };

  // --- SUBSCRIPTION ROUTES ---
  app.get('/api/my-subscription', authenticate, async (req: any, res) => {
    const sub = await getSubscription(req.user.uid);
    res.json(sub);
  });

  app.post('/api/subscribe', authenticate, async (req: any, res) => {
    const { plan } = req.body;
    if (!PLANS[plan as keyof typeof PLANS]) return res.status(400).json({ error: 'Invalid plan' });
    
    const info = PLANS[plan as keyof typeof PLANS];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + info.days);

    try {
      const subInfo = {
        user_id: req.user.uid,
        plan,
        price: info.price,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        exams_left: info.exams,
        has_video_access: info.video,
        has_ai_chat: info.ai
      };

      await db.collection('users').doc(req.user.uid).collection('subscription').doc('current').set(subInfo);
      
      await db.collection('users').doc(req.user.uid).update({
        subscription_status: 'active'
      });

      res.json({ message: 'Subscribed successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.sendStatus(404);
    
    const userData = userDoc.data();
    const sub = await getSubscription(req.user.uid);
    
    res.json({
      id: req.user.uid,
      name: userData?.name,
      email: userData?.email,
      role: userData?.role || 'student',
      subscription: sub ? 'active' : 'inactive',
      subInfo: sub
    });
  });

  // --- COURSE ROUTES ---
  app.get('/api/courses', async (req, res) => {
    const coursesSnap = await db.collection('courses').get();
    const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(courses);
  });

  app.get('/api/courses/:id', authenticate, checkSubscription, async (req: any, res) => {
    const sub = req.subscription;
    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    const lessonsSnap = await db.collection('courses').doc(req.params.id).collection('lessons').orderBy('order_index').get();
    
    const lessons = lessonsSnap.docs.map(doc => {
      const data = doc.data();
      const isLocked = !sub.has_video_access && data.video_url;
      return { id: doc.id, ...data, video_locked: isLocked };
    });

    res.json({ id: courseDoc.id, ...courseDoc.data(), lessons });
  });

  app.get('/api/lessons/:lessonId/tasks', authenticate, checkSubscription, async (req: any, res) => {
    const { courseId } = req.query;
    
    if (courseId) {
      const tasksSnap = await db.collection('courses').doc(courseId as string).collection('lessons').doc(req.params.lessonId).collection('tasks').get();
      const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(tasks);
    } else {
      const coursesSnap = await db.collection('courses').get();
      for (const course of coursesSnap.docs) {
        const tasksSnap = await db.collection('courses').doc(course.id).collection('lessons').doc(req.params.lessonId).collection('tasks').get();
        if (!tasksSnap.empty) {
          const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          return res.json(tasks);
        }
      }
      res.json([]);
    }
  });

  app.post('/api/results', authenticate, checkSubscription, async (req: any, res: any) => {
    const { lesson_id, course_id, score, total_questions } = req.body;
    await db.collection('results').add({
      user_id: req.user.uid,
      lesson_id: lesson_id,
      course_id: course_id,
      score,
      total_questions: total_questions,
      completed_at: FieldValue.serverTimestamp()
    });
    res.json({ message: 'Result saved' });
  });

  app.post('/api/use-exam', authenticate, checkSubscription, async (req: any, res: any) => {
    const sub = req.subscription;
    if (!sub || sub.exams_left <= 0) {
      return res.status(403).json({ error: 'No exams left in your subscription' });
    }

    try {
      const subRef = db.collection('users').doc(req.user.uid).collection('subscription').doc('current');
      await subRef.update({
        exams_left: FieldValue.increment(-1)
      });
      res.json({ message: 'Exam used', examsLeft: sub.exams_left - 1 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BILIMAL Server running on http://localhost:${PORT}`);
    // Seed in background
    seed().catch(err => console.error('Background seed failed:', err));
  });
}

startServer();
