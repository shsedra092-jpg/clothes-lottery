console.log("app.js loaded");

// مفاتيح التخزين
const K_ITEMS = "clothes_items_v1";
const K_LAST_DATE = "clothes_last_spin_date_v1";
const K_LAST_PICK = "clothes_last_pick_v1";

// عناصر الصفحة
const itemsEl = document.getElementById("items");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const spinBtn = document.getElementById("spin");
const spinText = document.getElementById("spinText");
const statusEl = document.getElementById("status");
const remainingEl = document.getElementById("remaining");

// ====== صوت (Web Audio) ======
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTick() {
  const ctx = getAudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = "square";
  o.frequency.value = 900; // تردد “تك”
  g.gain.value = 0.03;     // مستوى الصوت (خفيف)

  o.connect(g);
  g.connect(ctx.destination);

  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  o.start(now);
  o.stop(now + 0.05);
}

function playYay() {
  const ctx = getAudioCtx();

  // نغمة “heeeey” بسيطة (سلايد تردد)
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = "sine";
  g.gain.value = 0.05;

  o.connect(g);
  g.connect(ctx.destination);

  const now = ctx.currentTime;

  // سلايد من منخفض إلى عالي
  o.frequency.setValueAtTime(250, now);
  o.frequency.exponentialRampToValueAtTime(700, now + 0.35);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  o.start(now);
  o.stop(now + 0.5);
}

// مهم على iOS: لازم نفعّل الصوت بأول تفاعل
spinBtn.addEventListener("click", async () => {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }
}, { once: true });

// ====== منطق التطبيق ======
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(K_ITEMS) || "[]");
  } catch {
    return [];
  }
}

function saveItems(list) {
  localStorage.setItem(K_ITEMS, JSON.stringify(list));
}

function normalizeLines(text) {
  return text
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function render() {
  const list = loadItems();
  remainingEl.textContent = String(list.length);

  itemsEl.value = list.join("\n");

  const lastDate = localStorage.getItem(K_LAST_DATE);
  const lastPick = localStorage.getItem(K_LAST_PICK);
  const t = todayKey();

  if (list.length === 0) {
    statusEl.textContent = "خلصوا! عبّي أواعي جديدة وبعدين احفظ القائمة.";
    spinBtn.disabled = true;
    spinText.textContent = "ما في أواعي";
    return;
  }

  if (lastDate === t) {
    spinBtn.disabled = true;
    statusEl.textContent = `اختيار اليوم جاهز ✅ (اليوم: ${t}) — طلعت: ${lastPick || ""}`;
    spinText.textContent = lastPick || "تم الاختيار";
  } else {
    spinBtn.disabled = false;
    statusEl.textContent = `جاهز لقرعة اليوم 🎯 (اليوم: ${t})`;
    spinText.textContent = "دوّر لتطلع قطعة";
  }
}

saveBtn.addEventListener("click", () => {
  const list = normalizeLines(itemsEl.value);
  saveItems(list);

  localStorage.removeItem(K_LAST_DATE);
  localStorage.removeItem(K_LAST_PICK);

  render();
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(K_ITEMS);
  localStorage.removeItem(K_LAST_DATE);
  localStorage.removeItem(K_LAST_PICK);
  render();
});

function pickRandom(list) {
  const i = Math.floor(Math.random() * list.length);
  return { item: list[i], index: i };
}

spinBtn.addEventListener("click", () => {
  const list = loadItems();
  if (list.length === 0) return render();

  const t = todayKey();
  if (localStorage.getItem(K_LAST_DATE) === t) return render();

  spinBtn.disabled = true;

  let step = 0;
  const rounds = 18;

  const timer = setInterval(() => {
    // تغيير النص أثناء الدوران
    spinText.textContent = pickRandom(list).item;

    // ✅ صوت تك مع كل خطوة
    playTick();

    step++;
    if (step >= rounds) {
      clearInterval(timer);

      const { item, index } = pickRandom(list);
      spinText.textContent = item;

      // ✅ صوت النتيجة
      playYay();

      // حذف القطعة المختارة
      list.splice(index, 1);
      saveItems(list);

      localStorage.setItem(K_LAST_DATE, t);
      localStorage.setItem(K_LAST_PICK, item);

      render();
    }
  }, 120);
});

// Offline
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

// أول مرة: إذا ما في قائمة محفوظة، خذ اللي داخل الـ textarea واحفظه
if (!localStorage.getItem(K_ITEMS)) {
  const initial = normalizeLines(itemsEl.value);
  saveItems(initial);
}

render();
