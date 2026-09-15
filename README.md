# Barcha Xabarlar Bot — Vercel

Telegram Business akkauntlaridan kelgan xabarlarni bitta admin botga yig‘adi. Qabulxona akkauntida tezkor tugmali menyuni har bir mijozga faqat birinchi murojaatda ko‘rsatadi; mijoz `menu` yoki `/menu` deb uni qayta ochishi mumkin. Admin Reply orqali mijozga javob beradi va `/panel` orqali menyu ma’lumotlarini yangilaydi.

## Vercel environment variables

- `TELEGRAM_BOT_TOKEN` — `@barchaxabarlar_bot` tokeni.
- `TELEGRAM_WEBHOOK_SECRET` — tasodifiy maxfiy satr.
- `ADMIN_CHAT_ID` — `166592957`.
- `SETUP_SECRET` — webhook o‘rnatish sahifasini himoyalaydigan tasodifiy maxfiy satr.
- `UPSTASH_REDIS_REST_URL` — Vercel Marketplace Redis integratsiyasidan.
- `UPSTASH_REDIS_REST_TOKEN` — Vercel Marketplace Redis integratsiyasidan.

`KV_REST_API_URL` va `KV_REST_API_TOKEN` nomlari ham qo‘llab-quvvatlanadi.

## Ishga tushirish

1. Loyihani alohida Vercel project sifatida deploy qiling.
2. Vercel Marketplace orqali Upstash Redis ulang.
3. Environment Variables qiymatlarini Production uchun kiriting va redeploy qiling.
4. Brauzerda `https://PROJECT-DOMAIN/api/setup?key=SETUP_SECRET` manzilini bir marta oching.
5. Har bir Telegram Business akkauntiga boshqa profildan bittadan xabar yuboring.
6. Admin botda `/accounts` orqali akkauntlarni `Qabulxona`, `Dars` yoki `Asosiy` sifatida belgilang.
7. `/panel` orqali mijoz menyusini boshqaring.

Google Apps Script polling va webhook’ini qayta yoqmang.
