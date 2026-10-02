# Tasklist 2 models

TypeScript models สำหรับ PostgreSQL เริ่มพัฒนาในเครื่องแล้วจึงย้ายไป Neon / Vercel ติดตั้ง Better Auth และ `pg` แล้ว ใช้ PostgreSQL adapter โดยตรง และมี SQL migration ที่ `db/migrations/0001_initial.sql`

| Model          | ตารางที่เสนอ   | หน้าที่                                                               |
| -------------- | -------------- | --------------------------------------------------------------------- |
| `User`         | `user`         | ผู้ใช้และโปรไฟล์ ใช้ `name`, `image`, `emailVerified` ตาม Better Auth |
| `Session`      | `session`      | การล็อกอินของแต่ละอุปกรณ์และเวลาหมดอายุ                               |
| `Account`      | `account`      | วิธีเข้าสู่ระบบและ password hash                                      |
| `Verification` | `verification` | ข้อมูลชั่วคราวของการยืนยันอีเมลและรีเซ็ตรหัสผ่าน                      |
| `Project`      | `projects`     | โปรเจกต์ของผู้ใช้                                                     |
| `Task`         | `tasks`        | งานส่วนตัวหรืองานในโปรเจกต์                                           |

## ความสัมพันธ์

```text
user.id
  ├── session.userId   (หลาย session ต่อผู้ใช้)
  ├── account.userId   (หลายวิธีเข้าสู่ระบบต่อผู้ใช้)
  ├── projects.userId  (หลายโปรเจกต์ต่อผู้ใช้)
  └── tasks.userId     (หลายงานต่อผู้ใช้)

projects.id ── tasks.projectId (ว่างได้สำหรับงานส่วนตัว)

verification.identifier เป็น key ของ flow ไม่ใช่ foreign key ไป user
```

ใช้ `user` ตัวเดียวสำหรับ Auth และเจ้าของ Project / Task จึงไม่ต้องมีตารางโปรไฟล์ซ้ำ

## Email + password

- เปิด `emailAndPassword.enabled` เมื่อทำ Auth config
- ตั้ง `emailAndPassword.requireEmailVerification: false` เพื่อสมัครและล็อกอินได้โดยไม่ต้องยืนยันอีเมล
- Account ของ credential ใช้ `providerId = "credential"`, `accountId = user.id` และ `password` เป็น hash
- ให้ Better Auth สร้างและจัดการ Account, Session และ Verification ผ่าน API ของไลบรารี
- ฟิลด์ OAuth ใน Account เป็น `null` สำหรับ credential; เก็บไว้ให้ตรงกับ core schema
- User เปลี่ยน `displayName` เป็น `name` และ `avatarUrl` เป็น `image`
- `timezone` เป็น custom field ที่ต้องประกาศใน `user.additionalFields`; เสนอ `type: "string"`, `required: false`, `defaultValue: "UTC"` และตรวจว่าเป็น IANA timezone ใน application
- Model ใช้ `timezone: string | null` เพราะ default ใน Auth config ไม่ใช่ database default; application ต้อง fallback เป็น `UTC`

## วันและเวลาของงาน

- Task ใช้ `dueAt` ฟิลด์เดียวสำหรับวันและเวลาครบกำหนด ไม่แยก `dueDate` / `dueTime`
- `dueAt: null` หมายถึงยังไม่กำหนด deadline
- ไม่มี `startsAt` หรือ `endsAt`; Calendar วางงานตาม `dueAt`
- ฟอร์มรับวันและเวลาตาม timezone ของ User แล้วแปลงเป็นจุดเวลาจริงก่อนบันทึก
- ใน PostgreSQL ให้ใช้ `timestamptz` สำหรับ `dueAt` และ timestamp อื่น ๆ; timezone ของผู้ใช้เก็บแยกที่ User
- `Project` ไม่มีวันครบกำหนดของตัวเอง

## การลบ

- ใช้การลบถาวร ไม่เพิ่ม `deletedAt` และไม่มีถังขยะหรือการกู้คืนในรุ่นแรก
- `Project.archivedAt` ยังใช้สำหรับเก็บโปรเจกต์เข้าคลัง ซึ่งต่างจากการลบ
- ก่อนทำคำสั่งลบ Project จริง ต้องกำหนดว่าจะลบงานภายในด้วยหรือย้ายเป็นงานส่วนตัว เพื่อให้ foreign key และเจ้าของข้อมูลยังถูกต้อง

## ตอนสร้าง database schema จริง

- User ID และ foreign key ที่อ้างถึงต้องใช้ชนิดเดียวกัน ตอนนี้ใช้ `string` และยังไม่บังคับ UUID
- `user.email` และ `session.token` ต้อง unique; ตรวจ schema ที่ generate แล้วให้มี indexes สำหรับ `session.userId`, `account.userId`, `verification.identifier`
- ตรวจความไม่ซ้ำของ Account ตามคู่ `providerId` / `accountId` และคงชื่อฟิลด์ตาม adapter ที่เลือก
- Project และ Task ต้องมีเจ้าของตรงกัน ห้ามผูกงานเข้ากับโปรเจกต์ของคนอื่น
- เก็บ timestamp เป็นจุดเวลาจริง แสดงผลตาม timezone ของ User และแปลง Date เป็น ISO string เมื่อส่งผ่าน JSON
- Account, Session และ Verification เป็น storage models; ส่งข้อมูลให้ UI ผ่าน API ที่เลือกฟิลด์ ไม่ส่ง raw records หรือ secrets
- หลังเลือก ORM / adapter สำหรับ PostgreSQL ให้ generate schema จาก Better Auth เวอร์ชันที่ติดตั้ง แล้วเทียบ model และสร้าง migration ผ่านเครื่องมือนั้น

อ้างอิง: [Core schema](https://better-auth.com/docs/concepts/database#core-schema), [Email & Password](https://better-auth.com/docs/authentication/email-password)
