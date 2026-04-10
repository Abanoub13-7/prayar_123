import { useEffect, useState } from "react";
import Prayar from "./component/Prayar";

function App() {
  const cities = [
    { name: "القاهرة", value: "Cairo" },
    { name: "الاسكندريه", value: "Alexandria" },
    { name: "الجيزة", value: "Giza" },
    { name: "المنصورة", value: "Mansoura" },
    { name: "اسوان", value: "Aswan" },
    { name: "البحيرة", value: "Beheira" },
    { name: "الاقصر", value: "Luxor" }
  ];

  const [city, setCity] = useState("Cairo");
  const [timings, setTimings] = useState(null);

  const [currentPrayer, setCurrentPrayer] = useState("");
  const [nextPrayer, setNextPrayer] = useState("");
  const [progress, setProgress] = useState(0);

  // تحديد الصلاة الحالية
  const getCurrentPrayer = (timings) => {
    if (!timings) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: "الفجر", time: timings.Fajr },
      { name: "الظهر", time: timings.Dhuhr },
      { name: "العصر", time: timings.Asr },
      { name: "المغرب", time: timings.Maghrib },
      { name: "العشاء", time: timings.Isha }
    ];

    let active = "";

    for (let i = 0; i < prayers.length; i++) {
      const [h, m] = prayers[i].time.split(":").map(Number);
      const prayerMinutes = h * 60 + m;

      if (currentMinutes < prayerMinutes) {
        active = prayers[i].name;
        break;
      }
    }

    if (!active) active = "الفجر";

    setCurrentPrayer(active);
  };

  // حساب الصلاة القادمة + progress
  const calculateNextPrayer = (timings) => {
    if (!timings) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: "الفجر", time: timings.Fajr },
      { name: "الظهر", time: timings.Dhuhr },
      { name: "العصر", time: timings.Asr },
      { name: "المغرب", time: timings.Maghrib },
      { name: "العشاء", time: timings.Isha }
    ];

    let current = null;
    let next = null;

    for (let i = 0; i < prayers.length; i++) {
      const [h, m] = prayers[i].time.split(":").map(Number);
      const prayerMinutes = h * 60 + m;

      if (currentMinutes < prayerMinutes) {
        next = prayers[i];
        break;
      }
      current = prayers[i];
    }

    if (!next) next = prayers[0];

    setNextPrayer(next.name);

    const [nH, nM] = next.time.split(":").map(Number);
    const nextMinutes = nH * 60 + nM;

    const prevMinutes = current
      ? current.time.split(":").map(Number).reduce((h, m) => h * 60 + m)
      : 0;

    const total = nextMinutes - prevMinutes;
    const passed = currentMinutes - prevMinutes;

    const percent = Math.max(0, Math.min(100, (passed / total) * 100));

    setProgress(percent);
  };

  // API CALL
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Egypt&method=5`
        );

        const data = await response.json();
        const timingsData = data.data.timings;

        setTimings(timingsData);

        getCurrentPrayer(timingsData);
        calculateNextPrayer(timingsData);

      } catch (error) {
        console.error(error);
      }
    };

    fetchPrayerTimes();
  }, [city]);

  return (
    <section>
              <h1>مواعيد الصلاة</h1>
      <div className="container">

        {/* TOP SECTION */}
        <div className="top_sec">

          <div className="city">
            <h3>المدينة</h3>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities.map((city_obj) => (
                <option key={city_obj.value} value={city_obj.value}>
                  {city_obj.name}
                </option>
              ))}
            </select>
          </div>

          <div className="date">
            <h3>التاريخ</h3>
            <h4>{new Date().toLocaleDateString("ar-EG")}</h4>
          </div>

        </div>

        {/* PRAYERS */}
        <Prayar name="الفجر" time={timings?.Fajr} active={currentPrayer === "الفجر"} />
        <Prayar name="الظهر" time={timings?.Dhuhr} active={currentPrayer === "الظهر"} />
        <Prayar name="العصر" time={timings?.Asr} active={currentPrayer === "العصر"} />
        <Prayar name="المغرب" time={timings?.Maghrib} active={currentPrayer === "المغرب"} />
        <Prayar name="العشاء" time={timings?.Isha} active={currentPrayer === "العشاء"} />

        {/* PROGRESS BAR */}
        <div className="progress-container">
          <h3>الصلاة القادمة: {nextPrayer}</h3>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default App;