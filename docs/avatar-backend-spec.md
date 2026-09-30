# Foydalanuvchi / xodim rasmi (avatar) — backend uchun texnik topshiriq

Bu hujjat backend dasturchi uchun. Frontend endi profil (Sozlamalar → Mening profilim) va xodim
qo'shish/tahrirlash oynasida rasm yuklashni qo'llaydi. Rasm sidebar, navbar, xodim kartasi va xodim
tafsilotlarida ko'rinadi. Frontend tayyor; quyidagi endpointlar qo'shilgach, rasm serverda saqlanadi
va barcha qurilmalarda ko'rinadi.

Barcha yo'llar `/api/v1` prefiksi bilan, `Authorization: Bearer <accessToken>` talab qiladi.

---

## 1. Hozirgi holat

- `openapi.json` da foydalanuvchi rasmi uchun **hech qanday maydon va endpoint yo'q**:
  `UpdateMeDto`, `CreateUserDto`, `UpdateUserDto` da `avatarUrl` yo'q; fayl yuklash endpointlari faqat
  `crm/attachments`, `inventory/.../attachments` va `catalog/media` (mahsulot rasmi) uchun.
- Frontend foydalanuvchi obyektidagi **`avatarUrl`** maydonini allaqachon o'qiydi (`GET /auth/me`,
  `GET /accounts/users`). Endi shu maydon haqiqatan to'ldirilishi kerak.
- Endpointlar yo'q (`404/405/501`) bo'lsa, frontend rasmni **faqat shu qurilmadagi brauzer xotirasida**
  saqlaydi va foydalanuvchiga "Rasm faqat shu qurilmada saqlandi" degan ogohlantirishni ko'rsatadi.

## 2. Yangi endpointlar

### 2.1. O'z rasmi

| Metod | Yo'l | Vazifasi |
|---|---|---|
| POST | `/auth/me/avatar` | Joriy foydalanuvchi rasmini yuklash/almashtirish |
| DELETE | `/auth/me/avatar` | Joriy foydalanuvchi rasmini o'chirish |

### 2.2. Xodim rasmi (ADMIN / DIRECTOR)

| Metod | Yo'l | Vazifasi |
|---|---|---|
| POST | `/accounts/users/{id}/avatar` | Xodim rasmini yuklash/almashtirish |
| DELETE | `/accounts/users/{id}/avatar` | Xodim rasmini o'chirish |

### 2.3. So'rov (POST)

`Content-Type: multipart/form-data`, bitta maydon: **`file`** (fayl nomi `avatar.jpg`).

- Ruxsat etilgan turlar: `image/jpeg`, `image/png`, `image/webp`.
- Frontend rasmni yuborishdan oldin **320×320 kvadrat JPEG** ga o'girib yuboradi (odatda 15–60 KB),
  shuning uchun server tomonida chegara **2 MB** yetarli. Baribir serverda ham tekshiring va kerak bo'lsa
  o'zi kichraytirib (masalan 512×512) saqlasin.
- Boshqa tur — `415 Unsupported Media Type`; hajm oshsa — `413 Payload Too Large`; fayl yo'q — `400`.

### 2.4. Javob

Yangilangan foydalanuvchi obyekti (yoki kamida quyidagi):

```json
{ "id": "usr_1", "avatarUrl": "https://cdn.example.com/avatars/usr_1.jpg?v=1727690400" }
```

- Frontend `avatarUrl` (yoki `url`) maydonini o'qiydi.
- `DELETE` javobi: `204 No Content` yoki `{ "avatarUrl": null }`.

## 3. Rasm qaerda saqlanadi va qanday beriladi

- Fayl saqlash: mavjud R2/S3 (mahsulot rasmi kabi). Bazada: `users.avatar_key` (yoki `avatar_url`) va
  `avatar_updated_at`.
- **Muhim:** `avatarUrl` brauzerdagi `<img src>` da ishlatiladi, `<img>` `Authorization` sarlavhasini
  yubora olmaydi. Shuning uchun URL **ochiq (public) yoki imzolangan (signed) va muddati yetarlicha uzun**
  bo'lishi kerak (`GET /catalog/media/{id}` kabi ochiq yo'l ham bo'lishi mumkin).
- Yangi rasm yuklanganda URL keshi yangilanishi uchun URLga versiya qo'shing (`?v=<avatar_updated_at>`).
- Rasm almashtirilganda yoki o'chirilganda **eski fayl storage'dan o'chirilsin**.

## 4. Mavjud javoblarga `avatarUrl` qo'shish

Quyidagi javoblarda foydalanuvchi bo'lgan har joyda `avatarUrl` (rasm bo'lmasa `null`) qaytsin:

- `GET /auth/me`, `PATCH /auth/me`
- `GET /accounts/users`, `GET /accounts/users/{id}`, `POST`/`PATCH /accounts/users`
- Qo'llab-quvvatlash xabarlaridagi `senderAvatarUrl` (allaqachon ishlatiladi)
- (ixtiyoriy) sotuv, davomat va audit yozuvlaridagi `user`/`responsible` obyektlari

## 5. Huquqlar

- `POST/DELETE /auth/me/avatar` — har qanday autentifikatsiyalangan foydalanuvchi, faqat o'zi uchun.
- `POST/DELETE /accounts/users/{id}/avatar` — faqat `ADMIN` va `DIRECTOR`, faqat o'z workspace'idagi
  foydalanuvchilar uchun. Boshqa workspace'dagi ID — `404`.
- Audit logga yozing: `resource = "User"`, `action = "UPDATE"`, meta: `{ "field": "avatar" }`.

## 6. Xatolar

| Kod | Qachon |
|---|---|
| `400` | `file` maydoni yo'q yoki fayl buzilgan |
| `403` | Boshqa xodim rasmini o'zgartirishga huquq yo'q |
| `404` | Foydalanuvchi topilmadi yoki boshqa workspace'niki |
| `413` | Fayl juda katta |
| `415` | Rasm turi qo'llab-quvvatlanmaydi |

## 7. Tekshiruv ro'yxati

1. `POST /auth/me/avatar` → `GET /auth/me` da `avatarUrl` to'ldirilgan.
2. Sahifani boshqa brauzerda/qurilmada ochsangiz ham rasm ko'rinadi.
3. Rasmni almashtirsangiz, eski URL o'chgan/yangilangan va brauzer yangi rasmni ko'rsatadi.
4. `DELETE` dan keyin `avatarUrl = null`, frontend bosh harflarni ko'rsatadi.
5. Kassir boshqa xodim rasmini o'zgartira olmaydi (`403`).
6. 3 MB dan katta fayl `413`, PDF `415` qaytaradi.
