import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";
import {
  Users,
  Video,
  Calendar,
  CheckSquare,
  XSquare,
  ShieldCheck,
  Mail,
  PlayCircle,
  UserPlus,
  PhoneIncoming,
} from "lucide-react";
import api from "../api/client";
import ScheduleEditor from "../components/ScheduleEditor";

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "videos" | "groups">(
    "requests",
  );

  const [apps, setApps] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedCurator, setSelectedCurator] = useState<string>("");

  const [consultations, setConsultations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<
    string | null
  >(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [userToCurator, setUserToCurator] = useState<string>("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending apps
      const appsQuery = query(
        collection(db, "teacher_applications"),
        where("status", "==", "pending"),
      );
      const appsSnap = await getDocs(appsQuery);
      setApps(appsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // 2. Fetch users
      const usersSnap = await getDocs(collection(db, "users"));
      setUsersList(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // 3. Fetch groups
      const groupsSnap = await getDocs(collection(db, "groups"));
      setGroups(groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // 4. Fetch pending consultations
      const consQuery = query(
        collection(db, "consultation_requests"),
        where("status", "==", "pending"),
      );
      const consSnap = await getDocs(consQuery);
      setConsultations(consSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // 5. Fetch courses
      const coursesSnap = await getDocs(collection(db, "courses"));
      setCourses(coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Moderator fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApp = async (id: string, email: string) => {
    try {
      setApps(prev => prev.filter(app => app.id !== id));
      await updateDoc(doc(db, "teacher_applications", id), {
        status: "pending_admin",
      });
      alert(
        `Анкета переведена администратору. Можете связаться с кандидатом по: ${email}`,
      );
    } catch (err) {
      alert("Ошибка!");
      fetchData(); // rollback
    }
  };

  const handleRejectApp = async (id: string) => {
    try {
      setApps(prev => prev.filter(app => app.id !== id));
      await updateDoc(doc(db, "teacher_applications", id), {
        status: "rejected",
      });
    } catch (err) {
      alert("Ошибка!");
      fetchData(); // rollback
    }
  };

  const createGroup = async () => {
    if (!newGroupName) return;
    try {
      await addDoc(collection(db, "groups"), {
        name: newGroupName,
        curator_id: selectedCurator,
        students: [],
      });
      setNewGroupName("");
      fetchData();
    } catch (err) {
      alert("Ошибка создания группы");
    }
  };

  const autoGenerateGroups = async () => {
    if (
      !window.confirm(
        "Сгенерировать группы (по макс. 10 человек) для нераспределенных студентов?",
      )
    )
      return;
    const students = usersList.filter((u) => u.role === "student");
    const existingStudentIdsInGroups = new Set(
      groups.flatMap((g) => g.students || []),
    );
    const unassignedStudents = students.filter(
      (s) => !existingStudentIdsInGroups.has(s.id),
    );

    if (unassignedStudents.length === 0) {
      return alert("Все студенты уже распределены по группам.");
    }

    try {
      let groupCount = groups.length + 1;
      for (let i = 0; i < unassignedStudents.length; i += 10) {
        const chunk = unassignedStudents.slice(i, i + 10);
        await addDoc(collection(db, "groups"), {
          name: `Авто-Группа #${groupCount}`,
          curator_id: curators[0]?.id || "", // assign first curator if any
          students: chunk.map((s) => s.id),
        });
        groupCount++;
      }
      alert("Группы успешно сгенерированы!");
      fetchData();
    } catch (err) {
      alert("Ошибка при генерации групп");
    }
  };

  const handleMakeCurator = async () => {
    if (!userToCurator) return alert("Выберите пользователя");
    if (!window.confirm("Назначить этого пользователя куратором?")) return;
    try {
      await updateDoc(doc(db, "users", userToCurator), { role: "curator" });
      alert("Пользователь успешно назначен куратором!");
      setUserToCurator("");
      fetchData(); // re-fetch to update roles
    } catch (err: any) {
      alert(
        "Ошибка при обновлении роли: " +
          (err?.response?.data?.error || err.message),
      );
    }
  };

  const handleAcceptConsultation = async (id: string, phone: string) => {
    try {
      await updateDoc(doc(db, "consultation_requests", id), {
        status: "accepted",
        handledBy: user?.id,
        handledAt: new Date(),
      });
      alert(`Консультация принята! Свяжитесь по номеру: ${phone}`);
      fetchData();
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const loadCourseLessons = async (courseId: string) => {
    if (selectedCourseForLessons === courseId) {
      setSelectedCourseForLessons(null);
      setLessons([]);
      return;
    }
    try {
      const snap = await getDocs(
        query(collection(db, `courses/${courseId}/lessons`)),
      );
      setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSelectedCourseForLessons(courseId);
    } catch (err) {
      console.error(err);
    }
  };

  const curators = usersList.filter((u) => u.role === "curator");
  const potentialCurators = usersList.filter(
    (u) => u.role !== "curator" && u.role !== "admin" && u.role !== "moderator",
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
        Загрузка данных...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary uppercase mb-2">
            Панель Модератора
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Управление платформой, модерация контента и распределение
          </p>
        </div>

        {/* Tabs Desktop */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === "requests" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"}`}
          >
            Заявки{" "}
            <span className="ml-2 bg-primary text-white px-2 py-0.5 rounded-full text-[9px]">
              {apps.length + consultations.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === "videos" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"}`}
          >
            Уроки
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === "groups" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"}`}
          >
            Группы
          </button>
        </div>
      </div>

      <div className="mb-12">
        {activeTab === "requests" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Консультации */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <PhoneIncoming size={20} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Новые Консультации
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {consultations.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Нет новых заявок на консультацию
                  </div>
                )}
                {consultations.map((c) => (
                  <div
                    key={c.id}
                    className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div>
                      <p className="text-lg font-black text-primary tracking-wide mb-1">
                        {c.phone}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Calendar size={12} />{" "}
                        {c.created_at?.toDate
                          ? c.created_at.toDate().toLocaleString()
                          : "Неизвестно"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptConsultation(c.id, c.phone)}
                      className="w-full md:w-auto bg-emerald-500 text-white px-6 py-3 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckSquare size={14} /> Принять в работу
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Анкеты Учителей */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Анкеты Учителей
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white border-2 border-slate-100 rounded-xl p-6 shadow-sm hover:border-slate-300 transition-colors flex flex-col h-full"
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-black text-primary mb-1 line-clamp-1">
                          {app.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={12} /> {app.email}
                        </p>
                      </div>

                      <div className="space-y-3 mb-6 bg-slate-50 rounded-lg p-4 flex-grow">
                        <div className="text-sm">
                          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                            Предмет
                          </span>
                          {app.subject}
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                            Опыт
                          </span>
                          {app.experience} лет
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                            Образование
                          </span>
                          <span className="line-clamp-2">{app.education}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-auto">
                        <button
                          onClick={() => handleApproveApp(app.id, app.email)}
                          className="flex-1 bg-primary text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 shadow-md shadow-primary/10"
                        >
                          <CheckSquare size={14} /> Пропуст.
                        </button>
                        <button
                          onClick={() => handleRejectApp(app.id)}
                          className="flex-1 bg-red-50 text-red-600 py-3 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-colors flex justify-center items-center gap-2"
                        >
                          <XSquare size={14} /> Отклон.
                        </button>
                      </div>
                    </div>
                  ))}
                  {apps.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      Нет новых анкет
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "videos" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[60vh]">
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                  <PlayCircle size={20} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Модерация Видео Уроков
                </h2>
              </div>
              <div className="p-6">
                {courses.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Video size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs uppercase font-bold tracking-widest">
                      Курсы еще не добавлены учителями
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className={`border-2 rounded-xl transition-all ${selectedCourseForLessons === course.id ? "border-primary ring-4 ring-primary/5" : "border-slate-100 hover:border-slate-300"}`}
                      >
                        <div
                          className="p-5 flex justify-between items-center cursor-pointer bg-white rounded-xl"
                          onClick={() => loadCourseLessons(course.id)}
                        >
                          <div>
                            <h3 className="font-black text-primary text-lg">
                              {course.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              Основа: {course.subject}
                            </p>
                          </div>
                          <div
                            className={`text-[10px] font-black px-4 py-2 rounded-lg uppercase tracking-wider transition-colors ${selectedCourseForLessons === course.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}
                          >
                            {selectedCourseForLessons === course.id
                              ? "Закрыть уроки"
                              : "Показать уроки"}
                          </div>
                        </div>

                        {selectedCourseForLessons === course.id && (
                          <div className="p-5 bg-slate-50 border-t-2 border-slate-100 rounded-b-xl space-y-3">
                            {lessons.length === 0 && (
                              <div className="text-center py-8">
                                <p className="text-[10px] uppercase font-bold text-slate-400 bg-white inline-block px-4 py-2 border rounded shadow-sm">
                                  В этом курсе еще нет уроков.
                                </p>
                              </div>
                            )}
                            {lessons.map((lesson, idx) => (
                              <div
                                key={lesson.id}
                                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-sm"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-primary mb-1">
                                      {lesson.title}
                                    </h4>
                                    {lesson.video_url ? (
                                      <a
                                        href={lesson.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1 font-medium bg-blue-50 px-2 py-0.5 rounded"
                                      >
                                        {lesson.video_url}
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded font-bold uppercase">
                                        Ссылка отсутствует
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                  {lesson.video_url && (
                                    <a
                                      href={lesson.video_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 md:flex-none text-center px-6 py-2.5 border-2 border-slate-200 rounded-lg text-[10px] font-black uppercase hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                                    >
                                      Смотреть
                                    </a>
                                  )}
                                  <button className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors">
                                    Проверено
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Назначение Кураторов */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                  <UserPlus size={20} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Назначение Кураторов
                </h2>
              </div>
              <div className="p-6 md:p-8">
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Выберите пользователя для назначения куратором
                    </label>
                    <select
                      value={userToCurator}
                      onChange={(e) => setUserToCurator(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-accent p-4 text-sm font-medium outline-none rounded-xl transition-all"
                    >
                      <option value="">-- Выбрать пользователя --</option>
                      {potentialCurators.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || "Без Имени"} ({u.email}) -{" "}
                          {u.role || "Ученик"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleMakeCurator}
                    className="w-full sm:w-auto bg-primary text-white font-black uppercase text-xs px-8 py-4 rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/10 whitespace-nowrap"
                  >
                    Сделать куратором
                  </button>
                </div>
              </div>
            </section>

            {/* Управление Группами */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Users size={20} />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                    Учебные Группы
                  </h2>
                </div>
                <button
                  onClick={autoGenerateGroups}
                  className="px-6 py-2.5 bg-accent text-primary rounded-lg font-black uppercase text-[10px] hover:bg-accent/90 transition-all shadow-sm"
                >
                  Авто-Распределение
                </button>
              </div>

              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col md:flex-row gap-4 items-end max-w-4xl">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                      Название Группы
                    </label>
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      type="text"
                      className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-primary outline-none transition-all placeholder:text-slate-300"
                      placeholder="Напр. Группа НИШ-А1"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                      Назначить куратора
                    </label>
                    <select
                      value={selectedCurator}
                      onChange={(e) => setSelectedCurator(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm outline-none transition-all focus:border-primary text-slate-700"
                    >
                      <option value="">Без куратора</option>
                      {curators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={createGroup}
                    className="w-full md:w-auto py-3.5 px-8 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-md shadow-primary/10"
                  >
                    Создать
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-black text-primary text-lg uppercase tracking-wide">
                          {group.name}
                        </h3>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 text-[10px] rounded-full font-bold uppercase">
                          {group.students?.length || 0} уч.
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 mb-6 border border-slate-100 relative group/curator">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Куратор
                        </p>
                        <select 
                          className="w-full bg-transparent text-sm font-bold text-primary outline-none appearance-none cursor-pointer"
                          value={group.curator_id || ''}
                          onChange={async (e) => {
                            try {
                               await updateDoc(doc(db, "groups", group.id), { curator_id: e.target.value });
                               fetchData(); // or update local state
                            } catch (err) {
                               alert("Ошибка при смене куратора");
                            }
                          }}
                        >
                          <option value="">Не назначен</option>
                          {curators.map((c) => (
                             <option key={c.id} value={c.id}>{c.name || c.email}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-6 flex-grow">
                        <ScheduleEditor 
                          groupId={group.id} 
                          initialSchedule={group.schedule_data || []} 
                          fallbackText={group.schedule_text} 
                        />
                      </div>

                      <button className="w-full border-2 border-slate-200 text-slate-600 rounded-lg py-3 text-xs font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-colors">
                        Состав учеников
                      </button>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400">
                      <Users size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">
                        Учебные группы пока не созданы
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
