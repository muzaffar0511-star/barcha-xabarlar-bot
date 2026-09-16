import { adminChatId, required } from "../lib/config.js";
import {
  findItem,
  findSection,
  getMenuConfig,
  menuView,
  newMenuId,
  removeItem,
  removeSection,
  saveMenuConfig
} from "../lib/menu.js";
import { del, getJson, once, setJson } from "../lib/store.js";
import { messageType, telegram, userName } from "../lib/telegram.js";

function authorized(request) {
  return request.headers["x-telegram-bot-api-secret-token"] === required("TELEGRAM_WEBHOOK_SECRET");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).end();
  if (!authorized(request)) return response.status(401).end();

  const update = request.body || {};
  try {
    if (update.update_id !== undefined && !(await once(`tm:update:${update.update_id}`))) {
      return response.status(200).json({ ok: true, duplicate: true });
    }
    if (update.business_connection) await rememberConnection(update.business_connection);
    if (update.callback_query) await handleCallback(update.callback_query);
    if (update.business_message) await handleBusinessMessage(update.business_message);
    if (update.message) await handleAdminMessage(update.message);
  } catch (error) {
    console.error("Webhook update failed", error);
  }
  return response.status(200).json({ ok: true });
}

async function rememberConnection(connection) {
  if (connection.is_enabled === false) {
    await del(`tm:bc:${connection.id}`);
    return;
  }
  const current = await getJson(`tm:bc:${connection.id}`);
  const fullName = userName(connection.user);
  const searchable = `${fullName} ${connection.user?.username || ""}`.toLowerCase();
  const inferredLabel = searchable.includes("qabul") || searchable.includes("reception")
    ? "Qabulxona"
    : searchable.includes("dars")
      ? "Dars"
      : "Akkaunt";
  await setJson(`tm:bc:${connection.id}`, {
    id: connection.id,
    label: current?.label || inferredLabel,
    owner_id: String(connection.user?.id || current?.owner_id || ""),
    name: fullName,
    username: connection.user?.username || ""
  });
  const ids = (await getJson("tm:bc:list")) || [];
  if (!ids.includes(connection.id)) {
    ids.push(connection.id);
    await setJson("tm:bc:list", ids);
  }
}

async function connectionInfo(businessConnectionId) {
  let info = await getJson(`tm:bc:${businessConnectionId}`);
  if (info) return info;
  const connection = await telegram("getBusinessConnection", {
    business_connection_id: businessConnectionId
  });
  await rememberConnection(connection);
  return getJson(`tm:bc:${businessConnectionId}`);
}

async function handleBusinessMessage(message) {
  const bcId = message.business_connection_id;
  if (!bcId || !message.from) return;
  const info = await connectionInfo(bcId);
  if (!info || String(message.from.id) === String(info.owner_id) || info.label === "Asosiy") return;

  const admin = adminChatId();
  const type = messageType(message);
  const preview = message.text || message.caption || `[${type}]`;
  const username = message.from.username ? `\n🔗 @${message.from.username}` : "";
  const header = await telegram("sendMessage", {
    chat_id: admin,
    text: `📥 ${info.label.toUpperCase()}\n👤 ${userName(message.from)}${username}\n\n💬 ${preview}\n\n↩️ Javob berish uchun shu xabarga Reply qiling.`
  });
  const route = { bc: bcId, chat: String(message.chat.id), original: message.message_id };
  await setJson(`tm:route:${header.message_id}`, route, 2592000);

  if (!message.text) {
    const relayed = await relayMedia(admin, message).catch(() => null);
    if (relayed?.message_id) await setJson(`tm:route:${relayed.message_id}`, route, 2592000);
  }

  if (info.label !== "Qabulxona") return;
  const common = message.text ? commonReply(message.text) : null;
  if (common && common !== "#MENU") {
    await telegram("sendMessage", {
      business_connection_id: bcId,
      chat_id: message.chat.id,
      text: common,
      reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true }
    });
    return;
  }

  const menuShownKey = `tm:menu:shown:v2:${bcId}:${message.chat.id}`;
  const menuWasShown = Boolean(await getJson(menuShownKey));
  const menuRequested = /^\/?menu$/i.test(String(message.text || "").trim());

  if (menuWasShown && !menuRequested) {
    if (common === "#MENU" || message.sticker) {
      await telegram("sendMessage", {
        business_connection_id: bcId,
        chat_id: message.chat.id,
        text: "Assalomu alaykum! Sizga qanday yordam berishim mumkin?",
        reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true }
      });
    }
    return;
  }

  const config = await getMenuConfig();
  const view = menuView(config, "menu_main");
  const greeting = common === "#MENU" || message.sticker
    ? "Assalomu alaykum! Men TM School qabulxona yordamchisiman.\n\n"
    : "";
  await telegram("sendMessage", {
    business_connection_id: bcId,
    chat_id: message.chat.id,
    text: greeting + view.text,
    reply_markup: view.reply_markup,
    reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true }
  });
  await setJson(menuShownKey, true, 86400);
}

async function handleCallback(query) {
  await telegram("answerCallbackQuery", { callback_query_id: query.id }).catch(() => null);
  if (!query.message || !query.data) return;

  if (String(query.from.id) === adminChatId() && query.data.startsWith("admin_")) {
    await handleAdminCallback(query);
    return;
  }
  if (String(query.from.id) === adminChatId() && !query.message.business_connection_id) {
    await showAdminPreview(query);
    return;
  }

  const bcId = query.message.business_connection_id;
  if (!bcId) return;
  const info = await connectionInfo(bcId);
  if (info?.label !== "Qabulxona") return;
  const config = await getMenuConfig();
  const view = menuView(config, query.data);
  await telegram("editMessageText", {
    business_connection_id: bcId,
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    text: view.text,
    reply_markup: view.reply_markup
  }).catch(async (error) => {
    if (!String(error.message).includes("message is not modified")) {
      await telegram("sendMessage", {
        business_connection_id: bcId,
        chat_id: query.message.chat.id,
        text: view.text,
        reply_markup: view.reply_markup
      });
    }
  });
}

async function handleAdminMessage(message) {
  if (message.chat?.type !== "private" || String(message.chat.id) !== adminChatId()) return;
  const text = String(message.text || "").trim();

  if (/^\/start(?:@\w+)?$/.test(text)) {
    await telegram("sendMessage", {
      chat_id: adminChatId(),
      text: "👋 Barcha Xabarlar Bot tayyor.\n\nMijozga javob berish uchun bildirishnomaga Reply qiling. Menyuni boshqarish uchun /panel, akkauntlarni belgilash uchun /accounts yuboring."
    });
    return;
  }
  if (/^\/panel(?:@\w+)?$/.test(text)) return sendAdminPanel();
  if (/^\/accounts(?:@\w+)?$/.test(text)) return sendAccountsPanel();
  if (/^\/cancel(?:@\w+)?$/.test(text)) {
    await del("tm:admin:state");
    await telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Amal bekor qilindi." });
    return;
  }

  const state = await getJson("tm:admin:state");
  if (state && text) return handleAdminInput(text, state);

  if (!message.reply_to_message) {
    await telegram("sendMessage", {
      chat_id: adminChatId(),
      text: "⚠️ Javobni mijoz xabari ostidagi Reply orqali yuboring yoki /panel dan foydalaning."
    });
    return;
  }
  const route = await getJson(`tm:route:${message.reply_to_message.message_id}`);
  if (!route) {
    await telegram("sendMessage", {
      chat_id: adminChatId(),
      text: "⚠️ Bu xabar uchun manzil topilmadi. Eng yangi bildirishnomaga Reply qiling."
    });
    return;
  }
  await sendReply(route, message);
  await telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Javob yuborildi." });
}

async function sendAdminPanel() {
  await del("tm:admin:state");
  await telegram("sendMessage", {
    chat_id: adminChatId(),
    text: "⚙️ Qabulxona menyusini boshqarish\n\nKerakli amalni tanlang:",
    reply_markup: { inline_keyboard: [
      [{ text: "➕ Yangi asosiy bo‘lim", callback_data: "admin_add_section" }],
      [{ text: "➕ Bo‘limga yangi ma’lumot", callback_data: "admin_add_item" }],
      [{ text: "✏️ Ma’lumot matnini yangilash", callback_data: "admin_edit_item" }],
      [{ text: "🏷 Bo‘lim nomini o‘zgartirish", callback_data: "admin_rename_section" }],
      [{ text: "🏷 Tugma nomini o‘zgartirish", callback_data: "admin_rename_item" }],
      [{ text: "🗑 Bo‘limni o‘chirish", callback_data: "admin_delete_section" }],
      [{ text: "🗑 Ma’lumot/tugmani o‘chirish", callback_data: "admin_delete_item" }],
      [{ text: "👁 Mijoz menyusini ko‘rish", callback_data: "admin_preview" }]
    ] }
  });
}

async function handleAdminCallback(query) {
  const data = query.data;
  if (data === "admin_panel") return sendAdminPanel();
  if (data === "admin_preview") {
    const view = menuView(await getMenuConfig(), "menu_main");
    await telegram("sendMessage", { chat_id: adminChatId(), ...view });
    return;
  }
  if (data === "admin_add_section") {
    await setJson("tm:admin:state", { action: "add_section" }, 3600);
    return promptAdmin("Yangi asosiy bo‘lim nomini yuboring.\n\nMasalan: 📖 Kitoblar");
  }
  if (data === "admin_add_item") return sendSectionPicker("Yangi ma’lumot qaysi bo‘limga qo‘shiladi?", "admin_addto_");
  if (data === "admin_edit_item") return sendSectionPicker("Qaysi bo‘limdagi ma’lumot yangilanadi?", "admin_editsec_");
  if (data === "admin_rename_section") return sendSectionPicker("Qaysi bo‘lim nomini o‘zgartirasiz?", "admin_renamesec_");
  if (data === "admin_rename_item") return sendSectionPicker("Qaysi bo‘limdagi tugma nomini o‘zgartirasiz?", "admin_renitemsec_");
  if (data === "admin_delete_section") return sendSectionPicker("O‘chiriladigan bo‘limni tanlang:", "admin_delsec_");
  if (data === "admin_delete_item") return sendSectionPicker("Qaysi bo‘limdagi ma’lumot o‘chiriladi?", "admin_delitemsec_");

  if (data.startsWith("admin_addto_")) {
    await setJson("tm:admin:state", { action: "add_item_title", section_id: data.slice(12) }, 3600);
    return promptAdmin("Yangi tugma nomini yuboring.\n\nMasalan: 📅 Kurs boshlanish sanasi");
  }
  if (data.startsWith("admin_editsec_")) return sendItemPicker(data.slice(14), "Yangilanadigan ma’lumotni tanlang:", "admin_edit_");
  if (data.startsWith("admin_renamesec_")) {
    await setJson("tm:admin:state", { action: "rename_section", section_id: data.slice(16) }, 3600);
    return promptAdmin("Bo‘limning yangi nomini yuboring.");
  }
  if (data.startsWith("admin_renitemsec_")) return sendItemPicker(data.slice(17), "Nomini o‘zgartiradigan tugmani tanlang:", "admin_renameitem_");
  if (data.startsWith("admin_delsec_")) {
    const section = findSection(await getMenuConfig(), data.slice(13));
    if (!section) return adminError("Bo‘lim topilmadi.");
    return sendDeleteConfirmation(
      `“${section.title}” bo‘limi va uning ichidagi barcha ma’lumotlar o‘chirilsinmi?`,
      `admin_confirm_delsec_${section.id}`
    );
  }
  if (data.startsWith("admin_delitemsec_")) return sendItemPicker(data.slice(17), "O‘chiriladigan ma’lumot/tugmani tanlang:", "admin_delitem_");
  if (data.startsWith("admin_delitem_")) {
    const item = findItem(await getMenuConfig(), data.slice(14));
    if (!item) return adminError("Ma’lumot topilmadi.");
    return sendDeleteConfirmation(
      `“${item.title}” ma’lumoti va tugmasi o‘chirilsinmi?`,
      `admin_confirm_delitem_${item.id}`
    );
  }
  if (data.startsWith("admin_confirm_delsec_")) {
    const config = await getMenuConfig();
    if (!removeSection(config, data.slice(21))) return adminError("Bo‘lim topilmadi.");
    await saveMenuConfig(config);
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Bo‘lim va uning ichidagi ma’lumotlar o‘chirildi." });
  }
  if (data.startsWith("admin_confirm_delitem_")) {
    const config = await getMenuConfig();
    if (!removeItem(config, data.slice(22))) return adminError("Ma’lumot topilmadi.");
    await saveMenuConfig(config);
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Ma’lumot va uning tugmasi o‘chirildi." });
  }
  if (data.startsWith("admin_edit_")) {
    await setJson("tm:admin:state", { action: "edit_item_text", item_id: data.slice(11) }, 3600);
    return promptAdmin("Ushbu tugma uchun yangi to‘liq ma’lumotni yuboring.");
  }
  if (data.startsWith("admin_renameitem_")) {
    await setJson("tm:admin:state", { action: "rename_item", item_id: data.slice(17) }, 3600);
    return promptAdmin("Tugmaning yangi nomini yuboring.");
  }
  if (data.startsWith("admin_acc_q_")) return labelAccount(data.slice(12), "Qabulxona");
  if (data.startsWith("admin_acc_d_")) return labelAccount(data.slice(12), "Dars");
  if (data.startsWith("admin_acc_a_")) return labelAccount(data.slice(12), "Asosiy");
}

async function handleAdminInput(value, state) {
  if (value.length > 3800) return promptAdmin("Matn juda uzun. 3800 belgidan qisqaroq matn yuboring.");
  const config = await getMenuConfig();
  if (state.action === "add_section") {
    config.sections.push({ id: newMenuId("s"), title: value, intro: `${value}\n\nKerakli ma’lumotni tanlang:`, links: [], items: [] });
    await saveMenuConfig(config);
    await del("tm:admin:state");
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Yangi bo‘lim qo‘shildi. /panel orqali uning ichiga ma’lumot qo‘shing." });
  }
  if (state.action === "add_item_title") {
    await setJson("tm:admin:state", { ...state, action: "add_item_text", title: value }, 3600);
    return promptAdmin(`Endi “${value}” tugmasi bosilganda chiqadigan to‘liq ma’lumotni yuboring.`);
  }
  if (state.action === "add_item_text") {
    const section = findSection(config, state.section_id);
    if (!section) return adminError("Bo‘lim topilmadi.");
    section.items.push({ id: newMenuId("i"), title: state.title, text: value });
    await saveMenuConfig(config);
    await del("tm:admin:state");
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Yangi ma’lumot va tugma qo‘shildi." });
  }
  if (state.action === "edit_item_text") {
    const item = findItem(config, state.item_id);
    if (!item) return adminError("Ma’lumot topilmadi.");
    item.text = value;
    await saveMenuConfig(config);
    await del("tm:admin:state");
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Ma’lumot yangilandi." });
  }
  if (state.action === "rename_section") {
    const section = findSection(config, state.section_id);
    if (!section) return adminError("Bo‘lim topilmadi.");
    section.title = value;
    await saveMenuConfig(config);
    await del("tm:admin:state");
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Bo‘lim nomi yangilandi." });
  }
  if (state.action === "rename_item") {
    const item = findItem(config, state.item_id);
    if (!item) return adminError("Tugma topilmadi.");
    item.title = value;
    await saveMenuConfig(config);
    await del("tm:admin:state");
    return telegram("sendMessage", { chat_id: adminChatId(), text: "✅ Tugma nomi yangilandi." });
  }
}

async function sendSectionPicker(text, prefix) {
  const config = await getMenuConfig();
  const rows = config.sections.map((section) => [{ text: section.title, callback_data: prefix + section.id }]);
  rows.push([{ text: "⬅️ Boshqaruv paneli", callback_data: "admin_panel" }]);
  return telegram("sendMessage", { chat_id: adminChatId(), text, reply_markup: { inline_keyboard: rows } });
}

async function sendItemPicker(sectionId, text, prefix) {
  const section = findSection(await getMenuConfig(), sectionId);
  if (!section?.items.length) return telegram("sendMessage", { chat_id: adminChatId(), text: "Bu bo‘limda hali ma’lumot yo‘q." });
  const rows = section.items.map((item) => [{ text: item.title, callback_data: prefix + item.id }]);
  rows.push([{ text: "⬅️ Boshqaruv paneli", callback_data: "admin_panel" }]);
  return telegram("sendMessage", { chat_id: adminChatId(), text, reply_markup: { inline_keyboard: rows } });
}

function sendDeleteConfirmation(text, callbackData) {
  return telegram("sendMessage", {
    chat_id: adminChatId(),
    text: `⚠️ ${text}\n\nBu amalni qaytarib bo‘lmaydi.`,
    reply_markup: { inline_keyboard: [
      [{ text: "✅ Ha, o‘chirish", callback_data: callbackData }],
      [{ text: "❌ Bekor qilish", callback_data: "admin_panel" }]
    ] }
  });
}

function promptAdmin(text) {
  return telegram("sendMessage", { chat_id: adminChatId(), text: `${text}\n\nBekor qilish uchun /cancel yuboring.` });
}

async function adminError(text) {
  await del("tm:admin:state");
  return telegram("sendMessage", { chat_id: adminChatId(), text: `⚠️ ${text} /panel orqali qayta urinib ko‘ring.` });
}

async function showAdminPreview(query) {
  const view = menuView(await getMenuConfig(), query.data);
  await telegram("editMessageText", {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    ...view
  }).catch(() => telegram("sendMessage", { chat_id: adminChatId(), ...view }));
}

async function sendAccountsPanel() {
  const ids = (await getJson("tm:bc:list")) || [];
  if (!ids.length) {
    await telegram("sendMessage", { chat_id: adminChatId(), text: "Hali Telegram Business akkauntlari aniqlanmadi. Har bir ulangan akkauntga boshqa profildan bittadan xabar yuboring, keyin /accounts ni qayta bosing." });
    return;
  }
  for (const id of ids) {
    const info = await getJson(`tm:bc:${id}`);
    if (!info) continue;
    await telegram("sendMessage", {
      chat_id: adminChatId(),
      text: `👤 ${info.name}\nUsername: ${info.username ? `@${info.username}` : "mavjud emas"}\nHozirgi turi: ${info.label}`,
      reply_markup: { inline_keyboard: [[
        { text: "Qabulxona", callback_data: `admin_acc_q_${id}` },
        { text: "Dars", callback_data: `admin_acc_d_${id}` },
        { text: "Asosiy", callback_data: `admin_acc_a_${id}` }
      ]] }
    });
  }
}

async function labelAccount(id, label) {
  const info = await getJson(`tm:bc:${id}`);
  if (!info) return adminError("Akkaunt topilmadi.");
  info.label = label;
  await setJson(`tm:bc:${id}`, info);
  return telegram("sendMessage", { chat_id: adminChatId(), text: `✅ ${info.name} — ${label} sifatida belgilandi.` });
}

function commonReply(text) {
  const value = String(text).toLowerCase().replace(/[’‘`ʻʼ]/g, "'").replace(/[.!?,;:]+/g, "").replace(/\s+/g, " ").trim();
  if (/^(rahmat|katta rahmat|raxmat|thanks|thank you|спасибо)$/.test(value)) return "Arzimaydi 😊";
  if (/^(arzimaydi|hechqisi yo'q|не за что|you are welcome)$/.test(value)) return "😊";
  if (/^(hop|xo'p|xop|ok|okay|mayli|tushunarli|yaxshi|ладно|хорошо)$/.test(value)) return "Xo‘p 😊";
  if (/^(salom|assalomu alaykum|assalom|hello|hi|привет|здравствуйте)$/.test(value)) return "#MENU";
  return null;
}

async function relayMedia(chatId, message) {
  if (message.photo) return telegram("sendPhoto", { chat_id: chatId, photo: message.photo.at(-1).file_id, caption: message.caption || "" });
  if (message.voice) return telegram("sendVoice", { chat_id: chatId, voice: message.voice.file_id, caption: message.caption || "" });
  if (message.video) return telegram("sendVideo", { chat_id: chatId, video: message.video.file_id, caption: message.caption || "" });
  if (message.audio) return telegram("sendAudio", { chat_id: chatId, audio: message.audio.file_id, caption: message.caption || "" });
  if (message.document) return telegram("sendDocument", { chat_id: chatId, document: message.document.file_id, caption: message.caption || "" });
  if (message.animation) return telegram("sendAnimation", { chat_id: chatId, animation: message.animation.file_id, caption: message.caption || "" });
  if (message.sticker) return telegram("sendSticker", { chat_id: chatId, sticker: message.sticker.file_id });
  if (message.location) return telegram("sendLocation", { chat_id: chatId, latitude: message.location.latitude, longitude: message.location.longitude });
  if (message.contact) return telegram("sendContact", { chat_id: chatId, phone_number: message.contact.phone_number, first_name: message.contact.first_name, last_name: message.contact.last_name || "" });
  return null;
}

async function sendReply(route, message) {
  const base = {
    business_connection_id: route.bc,
    chat_id: route.chat,
    reply_parameters: { message_id: route.original, allow_sending_without_reply: true }
  };
  if (message.text) return telegram("sendMessage", { ...base, text: message.text });
  if (message.photo) return telegram("sendPhoto", { ...base, photo: message.photo.at(-1).file_id, caption: message.caption || "" });
  if (message.voice) return telegram("sendVoice", { ...base, voice: message.voice.file_id, caption: message.caption || "" });
  if (message.video) return telegram("sendVideo", { ...base, video: message.video.file_id, caption: message.caption || "" });
  if (message.audio) return telegram("sendAudio", { ...base, audio: message.audio.file_id, caption: message.caption || "" });
  if (message.document) return telegram("sendDocument", { ...base, document: message.document.file_id, caption: message.caption || "" });
  if (message.animation) return telegram("sendAnimation", { ...base, animation: message.animation.file_id, caption: message.caption || "" });
  if (message.sticker) return telegram("sendSticker", { ...base, sticker: message.sticker.file_id });
  if (message.location) return telegram("sendLocation", { ...base, latitude: message.location.latitude, longitude: message.location.longitude });
  throw new Error("Bu xabar turi hozircha qo‘llab-quvvatlanmaydi.");
}
