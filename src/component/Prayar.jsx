function Prayar({ name, time, icon, active, next }) {
  const cleanedTime = typeof time === 'string' ? time.match(/^\d{1,2}:\d{2}/)?.[0] : null;
  return (
    <article className={`prayer-card${active ? ' active' : ''}${next ? ' next' : ''}`}>
      <div className="prayer-name-wrap"><span className="prayer-icon" aria-hidden="true">{icon}</span><div><h3>{name}</h3>{active && <small>الفترة الحالية</small>}{next && !active && <small>الصلاة القادمة</small>}</div></div>
      <div className="prayer-time-wrap"><time dir="ltr">{cleanedTime || '--:--'}</time>{active && <span className="active-dot" aria-label="الصلاة الحالية" />}{next && <span className="next-chip">القادمة</span>}</div>
    </article>
  );
}

export default Prayar;
