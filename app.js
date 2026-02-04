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

function todayKey() {
  // YYYY-MM-DD حسب توقيت الجهاز
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

  // عرض القائمة
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

  // السماح بقرعة جديدة بعد تغيير القائمة
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
    spinText.textContent = pickRandom(list).item;
    step++;
    if (step >= rounds) {
      clearInterval(timer);

      const { item, index } = pickRandom(list);
      spinText.textContent = item;

      // حذف القطعة المختارة من القرعة للأيام القادمة
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

// ✅ أول مرة: إذا ما في قائمة محفوظة، خذ اللي داخل الـ textarea واحفظه
if (!localStorage.getItem(K_ITEMS)) {
  const initial = normalizeLines(itemsEl.value);
  saveItems(initial);
}

render();
