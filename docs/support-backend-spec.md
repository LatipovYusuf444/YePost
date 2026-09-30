# Qo'llab-quvvatlash (Support) — backend uchun texnik topshiriq

Bu hujjat backend dasturchi uchun. Frontend "Qo'llab-quvvatlash" bo'limi endi 3 ustunli inbox ko'rinishida:
chapda **murojaatlar (tickets)** ro'yxati, o'rtada **suhbat**, o'ngda **murojaat haqida ma'lumot**.
Frontend tayyor; pastdagi yangi endpointlar qo'shilgach, u avtomatik to'liq rejimga o'tadi.

Barcha yo'llar `/api/v1` prefiksi bilan, `Authorization: Bearer <accessToken>` talab qiladi.
Javoblar ikki shaklda ham qabul qilinadi: to'g'ridan-to'g'ri obyekt/massiv yoki `{ success, data }` envelope
(loyihadagi boshqa endpointlar bilan bir xil).

---

## 1. Hozir mavjud va frontend ishlatadigan endpointlar (o'zgarmaydi)

| Metod | Yo'l | Vazifasi |
|---|---|---|
| GET | `/support/messages?cursor=&limit=` | Umumiy suhbat xabarlari (yangilari birinchi). `{ items, nextCursor }` |
| POST | `/support/messages` | Xabar yuborish `{ text, attachmentIds? }` |
| PATCH | `/support/messages/read` | Kiruvchi xabarlarni o'qilgan deb belgilash |
| GET | `/support/unread-count` | `{ count }` — menyudagi qizil nishon uchun |

Xabar obyekti (hozirgi shakl, o'zgarmaydi):

```json
{
  "id": "msg_01",
  "text": "Salom",
  "direction": "OUT",
  "senderName": "Bosh direktor",
  "senderAvatarUrl": null,
  "status": "SENT",
  "createdAt": "2026-09-30T10:22:00.000Z",
  "attachments": [{ "id": "att_1", "url": "https://...", "name": "invoice.pdf" }]
}
```

- `direction`: `OUT` — biznes (tenant) → YePost qo'llab-quvvatlash; `IN` — qo'llab-quvvatlash → biznes.
- `status`: `SENT` | `DELIVERED` | `READ` (faqat `OUT` xabarlar uchun ko'rsatiladi).

> Yangi endpointlar qo'shilmaguncha frontend shu umumiy suhbatni bitta virtual murojaat
> ("Umumiy suhbat") sifatida ko'rsatadi.

---

## 2. Yangi: Murojaatlar (tickets)

### 2.1. Ma'lumotlar modeli — `SupportTicket`

| Maydon | Tur | Izoh |
|---|---|---|
| `id` | string | Murojaat ID |
| `workspaceId` | string | Tenant (faqat o'z workspace'ining murojaatlari ko'rinadi) |
| `subject` | string | Mavzu (majburiy, 3–120 belgi) |
| `status` | enum | `ACTIVE` \| `IN_PROGRESS` \| `COMPLETED` |
| `createdById` | string | Murojaat ochgan foydalanuvchi |
| `assigneeId` | string \| null | Mas'ul qo'llab-quvvatlash xodimi |
| `createdAt` / `updatedAt` | ISO datetime | |
| `completedAt` | ISO datetime \| null | Yakunlangan vaqt |

Statuslar ma'nosi (UI'dagi 3 ta tab):

- `ACTIVE` — "Faol": yangi ochilgan, hali xodim olmagan yoki javob kutilmoqda.
- `IN_PROGRESS` — "Jarayonda": xodim biriktirilgan va ish boshlagan.
- `COMPLETED` — "Yakunlangan": hal qilingan. Yakunlangan murojaatga xabar yuborib bo'lmaydi
  (yuborilsa `409 Conflict`), foydalanuvchi uni qayta ochishi mumkin.

### 2.2. Endpointlar

#### `GET /support/tickets` — murojaatlar ro'yxati

Query (hammasi ixtiyoriy): `status`, `search` (mavzu va oxirgi xabar bo'yicha), `limit` (default 50, max 100).
Tartib: oxirgi faollik (`lastMessageAt`) bo'yicha kamayish.

Javob — massiv (yoki `{ items: [...] }`):

```json
[
  {
    "id": "tk_01",
    "subject": "To'lov bilan bog'liq savol",
    "status": "IN_PROGRESS",
    "createdAt": "2026-09-30T08:10:00.000Z",
    "lastMessage": "Hisobingizni tekshirib ko'ryapmiz",
    "lastMessageAt": "2026-09-30T09:02:00.000Z",
    "unreadCount": 2,
    "messageCount": 7,
    "assignee": {
      "id": "usr_9",
      "name": "Dilnoza Karimova",
      "avatarUrl": "https://.../avatar.jpg",
      "role": "Qo'llab-quvvatlash xodimi"
    }
  }
]
```

- `unreadCount` — shu murojaatdagi o'qilmagan **kiruvchi** (`IN`) xabarlar soni.
- `assignee` — biriktirilmagan bo'lsa `null`.
- `lastMessage` — oxirgi xabar matni; faqat fayl bo'lsa `null` (frontend "Fayl yuborildi" deb ko'rsatadi).

#### `POST /support/tickets` — yangi murojaat

```json
{ "subject": "To'lov bilan bog'liq savol", "text": "Kecha to'lov ikki marta yechildi...", "attachmentIds": ["att_1"] }
```

- Murojaat yaratiladi (`status = ACTIVE`) va `text` shu murojaatning birinchi `OUT` xabari bo'ladi.
- Javob: yaratilgan `SupportTicket` (`201`).

#### `GET /support/tickets/{id}/messages` — murojaat xabarlari

Query: `cursor`, `limit` (default 30). Shakl **`GET /support/messages` bilan bir xil**:
yangi xabarlar birinchi, `{ "items": [...], "nextCursor": "..." | null }`.

#### `POST /support/tickets/{id}/messages` — xabar yuborish

```json
{ "text": "Rahmat, kutaman", "attachmentIds": [] }
```

Javob — yaratilgan xabar obyekti (yuqoridagi shakl, `direction: "OUT"`, `status: "SENT"`).
`text` yoki `attachmentIds` dan kamida bittasi majburiy. `COMPLETED` murojaatga — `409`.

#### `PATCH /support/tickets/{id}/read` — o'qilgan deb belgilash

Shu murojaatdagi barcha `IN` xabarlarni `READ` qiladi, `unreadCount` = 0. Javob: `204` yoki `{ ok: true }`.

#### `PATCH /support/tickets/{id}/status` — holatni o'zgartirish

```json
{ "status": "COMPLETED" }
```

Tenant tomonidan faqat quyidagi o'tishlar ruxsat etiladi:

- `ACTIVE` | `IN_PROGRESS` → `COMPLETED` ("Yakunlash" tugmasi)
- `COMPLETED` → `ACTIVE` ("Qayta ochish" tugmasi; `assignee` saqlanadi yoki tozalanadi — sizning qaroringiz)

`IN_PROGRESS` ga o'tkazish faqat YePost xodimi tomonidan (2.4-bo'limga qarang). Javob: yangilangan `SupportTicket`.

### 2.3. Mavjud endpointlarga o'zgarish

- `GET /support/unread-count` — endi **barcha murojaatlar bo'yicha** o'qilmagan `IN` xabarlar yig'indisini qaytarsin.
- `GET/POST /support/messages` va `PATCH /support/messages/read` — eski mijozlar uchun qoldirilsin (backward compatible).
  Tavsiya: mavjud xabarlarni migratsiyada bitta murojaatga ("Umumiy suhbat", `ACTIVE`) biriktiring.

### 2.4. YePost xodimlari tomoni (tenant API'dan tashqari)

Tenant foydalanuvchisi ko'radigan hamma narsa uchun quyidagilar kerak (alohida admin panel/API):

- Barcha tenantlar murojaatlarini ko'rish, murojaatni o'ziga biriktirish (`assigneeId` o'rnatiladi, `status` → `IN_PROGRESS`).
- Tenantga javob yozish (`direction: "IN"`, `senderName`, `senderAvatarUrl` xodimdan olinadi).
- Murojaatni yakunlash.

Frontend `assignee.name`, `assignee.avatarUrl`, `assignee.role` ni o'ng panelda ko'rsatadi.

---

## 3. Huquqlar va xavfsizlik

- Foydalanuvchi faqat **o'z workspace'i**ning murojaatlarini ko'radi va yozadi (`workspaceId` tokendan olinadi).
- Boshqa workspace'ning murojaat ID'siga so'rov — `404` (mavjudligini oshkor qilmang).
- Fayllar mavjud `crm` attachments yuklash oqimi orqali yuklanadi; xabarga faqat `attachmentIds` beriladi.

## 4. Xatolar

| Kod | Qachon |
|---|---|
| `400` | `subject`/`text` bo'sh yoki noto'g'ri |
| `403` | Ruxsat etilmagan status o'tishi (masalan tenant `IN_PROGRESS` qo'ymoqchi) |
| `404` | Murojaat topilmadi yoki boshqa workspace'niki |
| `409` | Yakunlangan murojaatga xabar yuborish |

## 5. Keyingi bosqich (ixtiyoriy)

Hozir frontend har **5 soniyada** yangilanishni so'raydi (polling). Real vaqt uchun WebSocket/SSE
(`ticket.message.created`, `ticket.status.changed`) qo'shilsa, polling olib tashlanadi.

## 6. Frontend qanday ulanadi

1. Sahifa ochilganda `GET /support/tickets` chaqiriladi.
2. `404/405/501` qaytsa — hozirgi `/support/messages` bitta "Umumiy suhbat" sifatida ko'rsatiladi (yangi tugmalar yashirin).
3. `200` qaytsa — to'liq inbox: tablar, qidiruv, "Yangi murojaat", "Yakunlash/Qayta ochish", mas'ul xodim va tarix.
