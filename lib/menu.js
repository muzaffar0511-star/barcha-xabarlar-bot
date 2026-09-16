import { getJson, setJson } from "./store.js";

const MENU_KEY = "tm:menu:config";
const FOOTER = "Savolingiz bo‘lsa, pastda yozib qoldiring.";

export function defaultMenuConfig() {
  return {
    welcome: "Kerakli bo‘limni tanlang:",
    sections: [
      {
        id: "courses",
        title: "📚 Kurslar",
        intro: "📚 Hozirda faqat guruh shaklidagi Multilevel kurslari mavjud.\n\nKerakli ma’lumotni tanlang:",
        links: [],
        items: [
          {
            id: "course_month",
            title: "📘 1 oylik kurs",
            text: "📘 1 oylik onlayn Multilevel kursi\n\n💰 Narxi: 300 000 so‘m\n📅 Davomiyligi: 1 oy\n🕗 Vaqti: 20:00–22:00\n🗓 Haftada: 6 kun\n👨‍🏫 Ustoz: Teacher Muzaffar\n\nKursda Listening, Reading, Writing va Speaking o‘tiladi. Essay, letter va to‘liq Speaking javoblari tekshirilib, ball beriladi. 20 ta mock test va TM School Premium taqdim etiladi."
          },
          {
            id: "course_two_weeks",
            title: "📗 2 haftalik kurs",
            text: "📗 2 haftalik onlayn Multilevel kursi\n\n💰 Narxi: 150 000 so‘m\n📅 Davomiyligi: 2 hafta\n🕗 Vaqti: 20:00–21:30\n🗓 Haftada: 6 kun\n👩‍🏫 Ustoz: Ms. Feruza — IELTS 8, Multilevel 68, C1\n\nHar kuni Multilevel testi bo‘yicha savollar va amaliy topshiriqlar beriladi. TM School Premium bonus sifatida taqdim etiladi."
          },
          {
            id: "course_level",
            title: "🎯 Talab qilinadigan daraja",
            text: "🎯 Multilevel kursida qatnashish uchun ingliz tili darajasi kamida B1 bo‘lishi kerak."
          },
          {
            id: "course_offline",
            title: "📍 Oflayn kurslar",
            text: "📍 Oflayn Multilevel kurslari mavjud.\n\nManzil: Andijon shahri, Yangi Bozor, Sakura binosi, 3-qavat, iTeacher Academy o‘quv markazi.\n📞 Telefon: +998 97 582 02 00"
          }
        ]
      },
      {
        id: "app",
        title: "📱 TM School ilovasi",
        intro: "📱 TM School ilovasi\n\nKerakli ma’lumotni tanlang:",
        links: [
          { title: "🌐 Rasmiy sayt", url: "https://teacher-muzaffar.com" },
          { title: "🤖 Android ilovasi", url: "https://play.google.com/store/apps/details?id=com.muzaffar_teacher_uz.tm_school" }
        ],
        items: [
          {
            id: "app_features",
            title: "✨ Imkoniyatlar",
            text: "✨ TM School ilovasida:\n\n• Multilevel bo‘yicha videodarslar\n• Listening va Reading testlari\n• Writing topshiriqlari\n• Speaking mashqlari\n• To‘liq mock imtihonlar\n• Speaking va Writing uchun AI feedback\n• Vocabulary darslari\n• Foydali maslahatlar\n• Tushgan savollar\n• Podcastlar mavjud."
          },
          {
            id: "app_premium",
            title: "💎 Premium tariflar",
            text: "💎 TM School Premium tariflari\n\n• Starter — 1 kun, 5 000 so‘m\n• Bronze — 15 kun, 40 000 so‘m\n• Silver — 30 kun, 60 000 so‘m\n• Platinum — 60 kun, 90 000 so‘m"
          },
          {
            id: "app_credits",
            title: "📝 Tekshiruv kreditlari",
            text: "📝 Speaking yoki Writing tekshiruv kreditlari\n\n• 10 000 so‘m — 17 ta tekshiruv\n• 20 000 so‘m — 33 ta tekshiruv\n• 40 000 so‘m — 67 ta tekshiruv\n• 60 000 so‘m — 100 ta tekshiruv"
          },
          {
            id: "app_payment",
            title: "💳 To‘lov",
            text: "💳 To‘lov Payme, Click yoki bank kartasi orqali amalga oshiriladi.\n\nBank kartasi orqali to‘lash uchun @muzaffar05111 profiliga murojaat qiling."
          },
          {
            id: "app_discount",
            title: "🎁 50% chegirma",
            text: "🎁 50% chegirma\n\nCEFR o‘qituvchisi kamida 3 nafar o‘quvchisini Premium tarifga ulasa, o‘quvchilarga 50% chegirma, o‘qituvchiga esa Premium bepul beriladi.\n\nKursda o‘qimaydiganlar ham jami 3 nafar foydalanuvchi bo‘lib murojaat qilsa, 50% chegirma oladi.\n\nFaollashtirish uchun @muzaffar05111 profiliga murojaat qiling."
          },
          {
            id: "app_devices",
            title: "📱 Qurilmalardan foydalanish",
            text: "📱 Bitta akkauntdan faqat bitta kompyuter va bitta telefonda foydalanish mumkin.\n\nBir akkauntga bir nechta odam kirsa, faqat eng oxirgi kirgan foydalanuvchi platformadan foydalana oladi."
          }
        ]
      }
    ]
  };
}

export async function getMenuConfig() {
  const saved = await getJson(MENU_KEY);
  if (saved) return saved;
  const initial = defaultMenuConfig();
  await saveMenuConfig(initial);
  return initial;
}

export async function saveMenuConfig(config) {
  await setJson(MENU_KEY, config);
}

export function findSection(config, id) {
  return config.sections.find((section) => section.id === id) || null;
}

export function findItem(config, id) {
  for (const section of config.sections) {
    const item = section.items.find((entry) => entry.id === id);
    if (item) return item;
  }
  return null;
}

export function removeSection(config, id) {
  const previousLength = config.sections.length;
  config.sections = config.sections.filter((section) => section.id !== id);
  return config.sections.length !== previousLength;
}

export function removeItem(config, id) {
  for (const section of config.sections) {
    const previousLength = section.items.length;
    section.items = section.items.filter((item) => item.id !== id);
    if (section.items.length !== previousLength) return true;
  }
  return false;
}

function moveEntry(entries, id, offset) {
  const index = entries.findIndex((entry) => entry.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= entries.length) return false;
  [entries[index], entries[target]] = [entries[target], entries[index]];
  return true;
}

export function moveSection(config, id, offset) {
  return moveEntry(config.sections, id, offset);
}

export function moveItem(config, id, offset) {
  for (const section of config.sections) {
    if (section.items.some((item) => item.id === id)) {
      return moveEntry(section.items, id, offset);
    }
  }
  return false;
}

export function directUrl(text) {
  const value = String(text || "").trim();
  return /^https?:\/\/\S+$/i.test(value) ? value : null;
}

export function menuView(config, key) {
  const mainKeyboard = {
    inline_keyboard: config.sections.map((section) => [
      { text: section.title, callback_data: `menu_${section.id}` }
    ])
  };
  if (key === "menu_main") {
    return { text: withFooter(config.welcome), reply_markup: mainKeyboard };
  }

  let selectedSection = null;
  let selectedItem = null;
  for (const section of config.sections) {
    if (key === `menu_${section.id}`) selectedSection = section;
    const item = section.items.find((entry) => entry.id === key);
    if (item) {
      selectedSection = section;
      selectedItem = item;
    }
  }
  if (!selectedSection) {
    return { text: withFooter(config.welcome), reply_markup: mainKeyboard };
  }

  const rows = selectedSection.items.map((item) => {
    const url = directUrl(item.text);
    return [{
      text: item.title,
      ...(url ? { url } : { callback_data: item.id })
    }];
  });
  for (const link of selectedSection.links || []) {
    rows.push([{ text: link.title, url: link.url }]);
  }
  rows.push([{ text: "⬅️ Bosh menyu", callback_data: "menu_main" }]);
  return {
    text: withFooter(selectedItem ? selectedItem.text : selectedSection.intro),
    reply_markup: { inline_keyboard: rows }
  };
}

export function withFooter(text) {
  const value = String(text || "").trim();
  return value.includes(FOOTER) ? value : `${value}\n\n💬 ${FOOTER}`;
}

export function newMenuId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}
