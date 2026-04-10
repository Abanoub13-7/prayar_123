function Prayar({ name, time, active }) {
  return (
    <div className={`prayer-card ${active ? "active" : ""}`} >
      <h3>{name}</h3>
      <p>{time ? time : "--:--"}</p>
    </div>
  );
}

export default Prayar;