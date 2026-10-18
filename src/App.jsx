import { useCallback, useEffect, useMemo, useState } from 'react';
import Prayar from './component/Prayar.jsx';
import { PRAYERS, formatCountdown, getLocalDateKey, getPrayerState } from './utils/prayerUtils.js';

const CITIES = [
  { name: 'القاهرة', value: 'Cairo' }, { name: 'الإسكندرية', value: 'Alexandria' },
  { name: 'الجيزة', value: 'Giza' }, { name: 'المنصورة', value: 'Mansoura' },
  { name: 'طنطا', value: 'Tanta' }, { name: 'دمنهور', value: 'Damanhur' },
  { name: 'بني سويف', value: 'Beni Suef' }, { name: 'الفيوم', value: 'Faiyum' },
  { name: 'أسيوط', value: 'Asyut' }, { name: 'سوهاج', value: 'Sohag' },
  { name: 'الأقصر', value: 'Luxor' }, { name: 'أسوان', value: 'Aswan' },
  { name: 'بورسعيد', value: 'Port Said' }, { name: 'السويس', value: 'Suez' },
  { name: 'شرم الشيخ', value: 'Sharm El Sheikh' }, { name: 'مرسى مطروح', value: 'Marsa Matruh' },
  { name: 'قنا', value: 'Qena' }, { name: 'المنيا', value: 'Minya' },
  { name: 'الإسماعيلية', value: 'Ismailia' }, { name: 'دمياط', value: 'Damietta' },
];

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
};

function App() {
  const [city, setCity] = useState(() => readStorage('prayar-city', 'Cairo'));
  const [timings, setTimings] = useState(null);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('today');
  const [theme, setTheme] = useState(() => readStorage('prayar-theme', 'dark'));
  const [method, setMethod] = useState(() => readStorage('prayar-method', '5'));
  const [asrSchool, setAsrSchool] = useState(() => readStorage('prayar-school', '0'));
  const [remindersEnabled, setRemindersEnabled] = useState(() => readStorage('prayar-reminders', false));
  const [reminderMinutes, setReminderMinutes] = useState(() => readStorage('prayar-reminder-minutes', 10));
  const [monthly, setMonthly] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState('');
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [notice, setNotice] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  useEffect(() => { writeStorage('prayar-city', city); }, [city]);
  useEffect(() => { writeStorage('prayar-theme', theme); }, [theme]);
  useEffect(() => { writeStorage('prayar-method', method); }, [method]);
  useEffect(() => { writeStorage('prayar-school', asrSchool); }, [asrSchool]);
  useEffect(() => { writeStorage('prayar-reminders', remindersEnabled); }, [remindersEnabled]);
  useEffect(() => { writeStorage('prayar-reminder-minutes', reminderMinutes); }, [reminderMinutes]);

  useEffect(() => {
    const tick = () => setDate(new Date());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPrayerTimes = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ city, country: 'Egypt', method, school: asrSchool });
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('تعذر الاتصال بخدمة مواقيت الصلاة. حاول مرة أخرى.');
        const result = await response.json();
        const nextTimings = result?.data?.timings;
        if (result?.code !== 200 || !nextTimings || PRAYERS.some((prayer) => !nextTimings[prayer.key])) {
          throw new Error('وصلت استجابة غير مكتملة لمواقيت الصلاة. حاول إعادة التحميل.');
        }
        setTimings(nextTimings);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') setError(fetchError.message || 'حدث خطأ أثناء تحميل المواقيت.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPrayerTimes();
    return () => controller.abort();
  }, [city, method, asrSchool, retryCount]);

  const prayerState = useMemo(() => getPrayerState(timings, date), [timings, date]);
  const countdown = prayerState ? formatCountdown(prayerState.nextDateTime.getTime() - date.getTime()) : '--:--:--';
  const cityName = CITIES.find((item) => item.value === city)?.name || city;
  const todayLabel = date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const monthLabel = monthDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!remindersEnabled || !prayerState || notificationPermission !== 'granted') return undefined;
    const sentKey = 'prayar-sent-reminders';
    const sent = readStorage(sentKey, {});
    const remaining = prayerState.nextDateTime.getTime() - date.getTime();
    const target = Number(reminderMinutes) * 60 * 1000;
    const reminderKey = `${getLocalDateKey(prayerState.nextDateTime)}-${prayerState.next.key}-${reminderMinutes}`;
    if (remaining > 0 && remaining <= target && !sent[reminderKey]) {
      try {
        new Notification(`اقترب موعد صلاة ${prayerState.next.name}`, {
          body: `متبقي ${formatCountdown(remaining)} على صلاة ${prayerState.next.name} في ${cityName}.`,
          tag: reminderKey,
        });
        writeStorage(sentKey, { ...sent, [reminderKey]: true });
      } catch { /* browser may block notifications */ }
    }
    return undefined;
  }, [remindersEnabled, prayerState, notificationPermission, reminderMinutes, date, cityName]);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    setMonthlyError('');
    try {
      const params = new URLSearchParams({ city, country: 'Egypt', method, school: asrSchool });
      const url = `https://api.aladhan.com/v1/calendarByCity/${monthDate.getFullYear()}/${monthDate.getMonth() + 1}?${params}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('تعذر تحميل الجدول الشهري. تحقق من الاتصال وحاول مجددًا.');
      const result = await response.json();
      if (result?.code !== 200 || !Array.isArray(result?.data)) throw new Error('بيانات الجدول الشهري غير مكتملة.');
      setMonthly(result.data);
    } catch (loadError) {
      setMonthlyError(loadError.message || 'حدث خطأ أثناء تحميل الجدول.');
    } finally { setMonthlyLoading(false); }
  }, [city, method, asrSchool, monthDate]);

  useEffect(() => {
    if (activeTab === 'month') loadMonthly();
  }, [activeTab, loadMonthly]);

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotice('هذا المتصفح لا يدعم إشعارات الويب.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setRemindersEnabled(true);
        setNotice('تم تفعيل التنبيهات. ستعمل أثناء فتح الموقع والسماح له بالعمل.');
      } else setNotice('لم يتم منح إذن الإشعارات. يمكنك تفعيله من إعدادات المتصفح.');
    } catch { setNotice('تعذر طلب إذن الإشعارات من المتصفح.'); }
  };

  const copyToday = async () => {
    if (!timings) return;
    const lines = [`مواقيت الصلاة - ${cityName}`, todayLabel, ...PRAYERS.map((prayer) => `${prayer.name}: ${timings[prayer.key]}`)];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setNotice('تم نسخ مواقيت الصلاة.');
    } catch { setNotice('تعذر النسخ تلقائيًا؛ يمكنك تحديد المواقيت ونسخها يدويًا.'); }
  };

  return (
    <main className={`app-shell theme-${theme}`} dir="rtl">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="site-header page-width">
        <a className="brand" href="#home" aria-label="Prayar الصفحة الرئيسية">
          <span className="brand-mark">☾</span><span><strong>Prayar</strong><small>رفيقك لكل صلاة</small></span>
        </a>
        <div className="header-actions">
          <span className="live-indicator"><i /> مواقيت اليوم</span>
          <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="تغيير المظهر" title="تغيير المظهر">{theme === 'dark' ? '☼' : '☾'}</button>
          <button className="icon-button" onClick={copyToday} aria-label="نسخ المواقيت" title="نسخ المواقيت">⧉</button>
        </div>
      </header>

      <section className="hero page-width" id="home">
        <div className="hero-copy">
          <p className="eyebrow"><span>✦</span> وقتك مع الصلاة</p>
          <h1>طمأنينة تبدأ<br /><em>مع كل صلاة</em></h1>
          <p className="hero-description">تابع مواقيت الصلاة بدقة، واستعد لصلاتك القادمة في وقتها أينما كنت.</p>
          <div className="hero-meta"><span>📍 {cityName}، مصر</span><span>◷ {todayLabel}</span></div>
        </div>
        <div className="next-prayer-card">
          <div className="next-card-top"><span className="next-label">الصلاة القادمة</span><span className="moon-badge">☾</span></div>
          {loading && !prayerState ? <div className="skeleton-line" /> : <><h2>{prayerState?.next.name || '—'}</h2><p className="next-time">{prayerState?.next.time || '--:--'}</p></>}
          <div className="countdown-label">الوقت المتبقي</div>
          <div className="countdown" dir="ltr">{countdown}</div>
          <div className="progress-meta"><span>التقدم نحو الصلاة القادمة</span><strong>{Math.round(prayerState?.progress || 0)}%</strong></div>
          <div className="progress-track"><span style={{ width: `${prayerState?.progress || 0}%` }} /></div>
        </div>
      </section>

      <nav className="tabs page-width" aria-label="أقسام مواقيت الصلاة">
        <button className={activeTab === 'today' ? 'tab active' : 'tab'} onClick={() => setActiveTab('today')}>◷ <span>مواقيت اليوم</span></button>
        <button className={activeTab === 'month' ? 'tab active' : 'tab'} onClick={() => setActiveTab('month')}>▦ <span>الجدول الشهري</span></button>
        <button className={activeTab === 'settings' ? 'tab active' : 'tab'} onClick={() => setActiveTab('settings')}>⚙ <span>الإعدادات</span></button>
      </nav>

      <section className="content-grid page-width">
        <div className="main-panel panel">
          {activeTab === 'today' && <>
            <div className="panel-heading"><div><p className="eyebrow">جدول اليوم</p><h2>مواقيت الصلوات</h2></div><span className="date-pill">{date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span></div>
            {error && <div className="alert error" role="alert"><span>!</span><div><strong>تعذر تحميل المواقيت</strong><p>{error}</p><button onClick={() => { setError(''); setRetryCount((count) => count + 1); }}>إعادة المحاولة</button></div></div>}
            {loading && !timings && <div className="loading-state"><span className="spinner" /> جاري تحميل مواقيت الصلاة...</div>}
            {!loading && !timings && error && <div className="empty-state">تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</div>}
            {timings && <div className="prayer-list">{PRAYERS.map((prayer) => <Prayar key={prayer.key} name={prayer.name} time={timings[prayer.key]} icon={prayer.icon} active={prayerState?.current.key === prayer.key} next={prayerState?.next.key === prayer.key} />)}</div>}
            <div className="panel-footnote"><span>ⓘ</span> قد تختلف المواقيت دقائق بسيطة حسب طريقة الحساب والموقع الجغرافي.</div>
          </>}

          {activeTab === 'month' && <>
            <div className="panel-heading"><div><p className="eyebrow">خطط لشهرك</p><h2>جدول الصلاة الشهري</h2></div><div className="month-controls"><button className="small-icon-button" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} aria-label="الشهر السابق">›</button><span>{monthLabel}</span><button className="small-icon-button" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} aria-label="الشهر التالي">‹</button></div></div>
            {monthlyLoading && <div className="loading-state"><span className="spinner" /> جاري تحميل الجدول الشهري...</div>}
            {monthlyError && <div className="alert error"><span>!</span><div><strong>تعذر تحميل الجدول</strong><p>{monthlyError}</p><button onClick={loadMonthly}>إعادة المحاولة</button></div></div>}
            {!monthlyLoading && monthly.length > 0 && <div className="table-wrap"><table className="monthly-table"><thead><tr><th>التاريخ</th>{PRAYERS.map((prayer) => <th key={prayer.key}>{prayer.name}</th>)}</tr></thead><tbody>{monthly.map((day) => <tr key={day.date?.gregorian?.date || day.date?.readable}><td><strong>{day.date?.gregorian?.day}</strong><small>{day.date?.gregorian?.weekday?.ar || day.date?.gregorian?.weekday?.en}</small></td>{PRAYERS.map((prayer) => <td key={prayer.key}>{day.timings?.[prayer.key]?.match(/^\d{1,2}:\d{2}/)?.[0] || '--:--'}</td>)}</tr>)}</tbody></table></div>}
            {!monthlyLoading && !monthlyError && monthly.length === 0 && <div className="empty-state">اختر الشهر لعرض مواقيت الصلاة.</div>}
            <div className="panel-footnote"><span>ⓘ</span> يتم جلب المواعيد من خدمة AlAdhan وفق طريقة الحساب المختارة.</div>
          </>}

          {activeTab === 'settings' && <>
            <div className="panel-heading"><div><p className="eyebrow">خصص تجربتك</p><h2>إعدادات المواقيت</h2></div><span className="settings-icon">⚙</span></div>
            <div className="settings-form">
              <label className="field-label">المدينة<div className="select-wrap"><span>⌖</span><select value={city} onChange={(event) => setCity(event.target.value)}>{CITIES.map((item) => <option key={item.value} value={item.value}>{item.name}</option>)}</select></div></label>
              <label className="field-label">طريقة حساب مواقيت الصلاة<div className="select-wrap"><span>◷</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="5">الهيئة المصرية العامة للمساحة</option><option value="4">أم القرى، مكة المكرمة</option><option value="3">رابطة العالم الإسلامي</option><option value="2">الجمعية الإسلامية لأمريكا الشمالية</option><option value="1">جامعة العلوم الإسلامية، كراتشي</option><option value="0">الطريقة الجعفرية</option></select></div></label>
              <label className="field-label">حساب صلاة العصر<div className="select-wrap"><span>☀</span><select value={asrSchool} onChange={(event) => setAsrSchool(event.target.value)}><option value="0">المذهب الشافعي (ظل = 1)</option><option value="1">المذهب الحنفي (ظل = 2)</option></select></div></label>
              <div className="setting-row"><div><strong>تذكير قبل الصلاة</strong><p>إظهار إشعار قبل موعد الصلاة أثناء فتح الموقع.</p></div><label className="switch"><input type="checkbox" checked={remindersEnabled} onChange={(event) => { if (event.target.checked) requestNotifications(); else setRemindersEnabled(false); }} /><span /></label></div>
              <label className="field-label">التنبيه قبل الموعد<div className="select-wrap"><span>◴</span><select value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))}><option value={5}>5 دقائق</option><option value={10}>10 دقائق</option><option value={15}>15 دقيقة</option><option value={30}>30 دقيقة</option></select></div></label>
              {notificationPermission === 'denied' && <p className="permission-note">إشعارات الموقع محظورة من المتصفح. غيّر الإذن من إعدادات الموقع في المتصفح.</p>}
              <div className="settings-tip"><span>✦</span><p>يتم حفظ إعداداتك على هذا الجهاز تلقائيًا، دون الحاجة إلى إنشاء حساب.</p></div>
            </div>
          </>}
        </div>

        <aside className="side-column">
          <div className="panel city-panel"><div className="side-heading"><span className="side-icon">⌖</span><div><h3>موقعك الحالي</h3><p>اختر المدينة لمواقيت أدق</p></div></div><label className="visually-hidden" htmlFor="city-select">اختيار المدينة</label><select id="city-select" className="city-select" value={city} onChange={(event) => setCity(event.target.value)}>{CITIES.map((item) => <option key={item.value} value={item.value}>{item.name}</option>)}</select><div className="location-status"><span /> مصر · توقيت الجهاز المحلي</div></div>
          <div className="panel reminder-panel"><div className="reminder-art">☾</div><p className="eyebrow">لا تفوّت صلاتك</p><h3>الصلاة راحة<br />للقلب والروح</h3><p className="reminder-copy">اجعل لكل صلاة مكانًا في يومك، تجد في وقتها سكينة وطمأنينة.</p><button className="primary-button" onClick={() => { setActiveTab('settings'); if (!remindersEnabled) requestNotifications(); }}>تفعيل التذكيرات <span>←</span></button></div>
          <div className="panel quick-panel"><h3>معلومات سريعة</h3><div className="quick-row"><span>الصلاة الحالية</span><strong>{prayerState?.current.name || '—'}</strong></div><div className="quick-row"><span>الصلاة القادمة</span><strong>{prayerState?.next.name || '—'}</strong></div><div className="quick-row"><span>موعد الصلاة القادمة</span><strong dir="ltr">{prayerState?.next.time || '--:--'}</strong></div></div>
        </aside>
      </section>
      {notice && <div className="toast" role="status"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="إغلاق">×</button></div>}
      <footer className="site-footer page-width"><a className="footer-brand" href="#home">☾ Prayar</a><span>صُمّم ليكون يومك أقرب إلى الصلاة</span><span>© {date.getFullYear()} Prayar</span></footer>
    </main>
  );
}

export default App;
