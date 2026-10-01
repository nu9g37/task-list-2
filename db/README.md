# Local PostgreSQL setup with pgAdmin

1. ใน pgAdmin คลิกขวาฐานข้อมูลที่สร้างไว้ แล้วเลือก **Query Tool**
2. รัน `SELECT current_database();` เพื่อตรวจว่ากำลังใช้ฐานข้อมูลของ Tasklist
3. เปิดไฟล์ `migrations/0001_initial.sql` ด้วยปุ่ม Open File ของ Query Tool
4. Execute ทั้งไฟล์ในครั้งเดียว (F5); รันครั้งเดียวในฐานข้อมูลใหม่ที่ยังไม่มีตารางเหล่านี้
5. เปิดและรัน `verify.sql` ต้องพบ `user`, `session`, `account`, `verification`, `projects`, `tasks`
6. Refresh ที่ **Schemas → public → Tables**

หาก SQL ล้มเหลวและ Query Tool ยังอยู่ใน aborted transaction ให้รัน `ROLLBACK;` ก่อนแก้สาเหตุ สคริปต์ใช้ transaction เพื่อไม่ให้เหลือตารางที่สร้างค้างครึ่งทาง อย่าลบตารางเดิมเพื่อแก้กรณีรันซ้ำ

## ข้อตกลงของ schema

ฐานข้อมูลเดิมให้รัน `migrations/0002_remove_in_progress.sql` เพื่อเปลี่ยนสถานะ
`IN_PROGRESS` เป็น `TODO` และจำกัดสถานะงานให้เหลือ `TODO` กับ `DONE`

- รหัสเป็น text; Better Auth สร้างรหัส Auth ส่วน backend ต้องสร้างรหัส Project / Task
- ชื่อคอลัมน์ camelCase ใช้ double quotes ใน SQL เช่น `"userId"`, `"dueAt"`
- `dueAt` รวมวันและเวลาเป็น `timestamptz`; ไม่มี start/end time, project deadline หรือ deletedAt
- การลบเป็นแบบถาวร แต่ schema จะบล็อกการลบ Project ที่มี Task จนกว่าจะสั่งย้ายหรือลบ Task อย่างชัดเจน
- การลบ User จะถูกบล็อกหากยังมี Project / Task; ต้องทำขั้นตอนจัดการข้อมูลก่อนเปิดฟีเจอร์ลบบัญชี
- `updatedAt` มี default เฉพาะตอน INSERT; backend ต้องอัปเดตเมื่อแก้ข้อมูล
- TypeScript models เป็นรูปแบบข้อมูล ส่วน SQL นี้บังคับ foreign key, unique และ check constraints

## ขั้นต่อไป: เชื่อม backend

ตั้งค่าจริงใน `.env.local` โดยไม่ commit รหัสผ่าน ตัวอย่างรูปแบบ:

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_URL_ENCODED_PASSWORD@localhost:5432/YOUR_DATABASE
```

ชื่อผู้ใช้และพอร์ตดูจาก Connection ของ server ใน pgAdmin; รหัสผ่านที่มีอักขระพิเศษต้อง URL-encode

Backend เตรียมไว้ที่ `db/index.ts`, `lib/auth.ts` และ `app/api/auth/[...all]/route.ts` ใช้ PostgreSQL driver โดยตรง, `emailAndPassword.enabled: true`, `requireEmailVerification: false` และ `timezone` ใน `user.additionalFields`

แก้ `DATABASE_URL` ใน `.env.local` เป็นค่าจริง โดยรักษา `BETTER_AUTH_SECRET` ที่สร้างไว้ จากนั้น:

```sh
npm run db:check
npm run dev
```

`db:check` ตรวจการเชื่อมต่อและคอลัมน์ของทั้งหกตาราง โดยไม่แก้ข้อมูล

### ทดสอบโดยยังไม่ทำ frontend

ใช้ Postman หรือ REST client ตัวเดียวกันเพื่อให้เก็บ cookie ต่อเนื่อง เปิดฐาน URL ตาม `BETTER_AUTH_URL` (ค่าเริ่มต้น `http://localhost:3000`)

| Method / path | ใช้งาน |
| --- | --- |
| `GET /api/health` | ต้องได้ `status: "ok"`, `database: "connected"` |
| `POST /api/auth/sign-up/email` | สมัครด้วย JSON: `name`, `email`, `password` |
| `POST /api/auth/sign-in/email` | ล็อกอินด้วย JSON: `email`, `password` |
| `GET /api/me` | ต้องได้ข้อมูลผู้ใช้เมื่อมี cookie; ไม่มี session ต้องได้ 401 |
| `POST /api/auth/sign-out` | ล็อกเอาต์ แล้วตรวจว่า `/api/me` กลับเป็น 401 |

POST ใช้ `Content-Type: application/json` และ `Origin` ตรงกับ `BETTER_AUTH_URL` เลือกรหัสผ่านทดสอบอย่างน้อย 8 ตัวอักษร ไม่เพิ่ม user หรือ password hash ผ่าน SQL ด้วยมือ ให้ Better Auth จัดการ

การสมัครทดสอบสร้างข้อมูลจริงในฐานข้อมูล ขั้นตอนถัดไปหลังทดสอบ Auth ผ่านคือ API ของ Project และ Task

SQL นี้เขียนจาก core schema ที่เผยแพร่ และตรวจชื่อฟิลด์กับ schema ของ Better Auth 1.7.6 ที่ติดตั้งแล้ว การตรวจชื่อฟิลด์ยังไม่แทนการทดสอบกับฐานข้อมูลจริง; ใช้ `db:check` แล้วทดสอบสมัคร/ล็อกอินเพื่อยืนยันการเชื่อมต่อและพฤติกรรมของ Auth

อ้างอิง: [Better Auth PostgreSQL](https://better-auth.com/docs/adapters/postgresql), [Core schema](https://better-auth.com/docs/concepts/database#core-schema)
