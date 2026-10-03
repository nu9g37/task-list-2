# Project API

ทุกเส้นต้องมี session cookie จาก Better Auth สำหรับ POST / PATCH / DELETE ให้ส่ง `Origin` ตรงกับ `BETTER_AUTH_URL` และ body JSON ต้องมี `Content-Type: application/json`

| Method | Path                | ผลลัพธ์                                                          |
| ------ | ------------------- | ---------------------------------------------------------------- |
| GET    | `/api/projects`     | `200 { projects: [...] }`; ค่าเริ่มต้นแสดงเฉพาะที่ยังไม่ Archive |
| POST   | `/api/projects`     | `201 { project: {...} }`                                         |
| GET    | `/api/projects/:id` | `200 { project: {...} }`                                         |
| PATCH  | `/api/projects/:id` | `200 { project: {...} }`                                         |
| DELETE | `/api/projects/:id` | `200 { message: "Project deleted successfully" }`                |

GET รายการใช้ `?archived=true` เพื่อดูเฉพาะ Archive หรือ `?archived=all` เพื่อดูทั้งหมด เรียงด้วย `position` แล้ว `id`

## สร้าง

```json
{
  "name": "Website redesign",
  "description": "งานปรับเว็บไซต์",
  "color": "#245C45"
}
```

ต้องมี `name` (1–200 ตัวอักษรหลัง trim) ส่วน description ว่างได้และยาวไม่เกิน 10000 ตัวอักษร, color ใช้ `#RRGGBB` ค่าเริ่มต้น `#245C45`, position เป็นจำนวนเต็ม 0–2147483647 หากไม่ส่ง position จะต่อท้ายรายการโดย backend

ID และ userId กำหนดฝั่ง server ไม่รับจาก body

## แก้ไข / Archive

ส่งเฉพาะฟิลด์ที่ต้องการแก้: `name`, `description`, `color`, `position`, `archived`

```json
{ "archived": true }
```

`archived: false` เปิดโปรเจกต์กลับมาใช้งานได้ description ใช้ `null` เพื่อล้างค่า วันที่ส่งกลับเป็น ISO strings ไม่รับ timestamp ของ Archive จาก client

## เรียงลำดับ Sidebar

ส่ง `PATCH /api/projects/reorder` พร้อม `{ "projectIds": ["id-1", "id-2"] }`
โดยส่ง ID ของโปรเจกต์ที่ยังไม่ Archive ทั้งหมดของผู้ใช้ตามลำดับใหม่ ห้ามซ้ำ
ระบบบันทึก `position` เป็น 0, 1, 2, ... ใน transaction เดียว
หากรายการไม่ตรงกับข้อมูลปัจจุบันจะตอบ `409` โดยไม่แก้ลำดับบางส่วน
สำเร็จจะตอบ `200 { "message": "Project order saved" }`

## Errors

- `400`: body / filter ไม่ถูกต้อง หรือมีฟิลด์ที่ไม่รองรับ
- `401`: ไม่มี session ที่ใช้งานได้
- `403`: Origin ของ mutation ไม่ถูกต้อง
- `404`: ไม่พบ Project หรือเป็นของผู้ใช้อื่น
- `409`: Project ยังมี Task อยู่จึงลบไม่ได้ หรือเกินขอบเขตลำดับ
- `415`: body ไม่ใช้ `application/json`
- `503`: environment ยังไม่พร้อม
- `500`: ข้อผิดพลาดภายใน ไม่ส่งรายละเอียดฐานข้อมูลให้ client

## Integration test

สคริปต์ `scripts/test-project-api.mjs` ใช้ API และ PostgreSQL จริง สร้างผู้ใช้ทดสอบเฉพาะกิจสองคน แล้วลบเฉพาะข้อมูลของผู้ใช้ที่สร้างในการรันนั้นเมื่อจบ การทดสอบต้องใช้ฐานข้อมูลสำหรับพัฒนา

เปิด dev server ด้วย `npm run dev` จากนั้นรัน `node scripts/test-project-api.mjs` สคริปต์ใช้ `BETTER_AUTH_URL` จาก `.env.local` หากใช้ URL อื่นให้ตั้ง `API_TEST_URL` ให้ตรงกับ URL ของ server และค่า Origin ที่ server ยอมรับ
