# StayHub P1 database migration audit

วันที่ตรวจ 23 พฤศจิกายน 2026 (Asia/Bangkok)

## 1. Repository และขอบเขตหลักฐาน

- Branch `feat/stayhub-p26-readiness` มี local และ remote HEAD ตรงกันที่ `af268700d9c5a8faaf89a5b65c6ae613119fb8ff` ตอนเริ่มตรวจ หลัง fetch และ fast-forward แบบไม่ทับงานเดิม
- Working tree สะอาดก่อนสร้างรายงานนี้
- งานนี้อ่าน repository และลอง HTTP GET ไปยัง health endpoint เท่านั้น ไม่มี SQL ต่อ Production เพราะเครื่องงานไม่มีการเชื่อมต่อฐานข้อมูลหรือเครื่องมือ Railway/Neon ที่ใช้งานได้
- `https://stayhub-production-ac298aeb.up.railway.app/api/health/db/transport` และ Staging endpoint เดียวกันตอบ `CONNECT tunnel failed, response 403` จาก proxy จึงไม่มีผล health สด

## 2. Railway PostgreSQL Production inventory

**BLOCKED — ยังตรวจฐาน `Postgres-PDqf` สดไม่ได้** ไม่มี `DATABASE_URL`, Railway connection binding, CLI หรือ `psql` ในเครื่องงาน และเครือข่ายไม่ให้เข้าถึงบริการเป้าหมาย จึงยังยืนยันชื่อฐาน, role, server version, table inventory, row count, migration ledger และการเชื่อมต่อของ Production app ณ เวลาตรวจไม่ได้

เอกสารเดิม `docs/P27D_RAILWAY_PRODUCTION_EMPTY_DATA_EVIDENCE.md` บันทึกผล SQL ที่ผู้ใช้เคยส่งเมื่อ 22 พฤศจิกายน 2026 ว่า Railway Production มี 20 ตาราง, migration 11 รายการ และข้อมูลธุรกิจ 19 ตารางเป็นศูนย์ ณ เวลานั้น ผลดังกล่าวเป็นหลักฐานย้อนหลัง ไม่ใช่ row count ปัจจุบัน และไม่ครอบคลุม migration 012–014

## 3. Neon PostgreSQL Production inventory

**BLOCKED — ยังตรวจ Neon Production สดไม่ได้** ไม่มี connection binding หรือ Neon API ที่ใช้ตรวจ project, branch, database, migration ledger, schema หรือ row count ปัจจุบัน

เอกสารเดิม `docs/P28B_NEON_PRODUCTION_VERIFY.md` และ `docs/P28F1_PRODUCTION_PREFLIGHT.md` ระบุ project `late-darkness-78944075`, Production branch `br-snowy-tree-a1kt7omx` และ database `neondb` พร้อมผลเปรียบเทียบในช่วงเวลาที่จัดทำเอกสารนั้น การตรวจครั้งนี้ยังยืนยันตัวตนและสถานะล่าสุดไม่ได้

## 4. Row counts ทุกตาราง

ตารางต่อไปนี้ได้จาก migration 001–014 ใน repository เท่านั้น จำนวนแถวสดของ **ทั้ง Railway Production และ Neon Production เป็น BLOCKED ทุกตาราง**

| ตารางใน schema `stayhub` | Railway Production | Neon Production |
|---|---|---|
| accounts | BLOCKED | BLOCKED |
| announcements | BLOCKED | BLOCKED |
| auth_attempts | BLOCKED | BLOCKED |
| billing_bill_items | BLOCKED | BLOCKED |
| billing_bills | BLOCKED | BLOCKED |
| billing_meter_readings | BLOCKED | BLOCKED |
| billing_payments | BLOCKED | BLOCKED |
| drivers | BLOCKED | BLOCKED |
| housekeeping_tasks | BLOCKED | BLOCKED |
| invites | BLOCKED | BLOCKED |
| join_requests | BLOCKED | BLOCKED |
| leases | BLOCKED | BLOCKED |
| local_sync_receipts | BLOCKED | BLOCKED |
| local_sync_revisions | BLOCKED | BLOCKED |
| notifications | BLOCKED | BLOCKED |
| parcels | BLOCKED | BLOCKED |
| properties | BLOCKED | BLOCKED |
| property_memberships | BLOCKED | BLOCKED |
| property_settings | BLOCKED | BLOCKED |
| repair_requests | BLOCKED | BLOCKED |
| reservations | BLOCKED | BLOCKED |
| ride_requests | BLOCKED | BLOCKED |
| room_documents | BLOCKED | BLOCKED |
| sessions | BLOCKED | BLOCKED |
| stay_events | BLOCKED | BLOCKED |
| stays | BLOCKED | BLOCKED |
| unit_blocks | BLOCKED | BLOCKED |
| units | BLOCKED | BLOCKED |
| vehicles | BLOCKED | BLOCKED |
| schema_migrations (ledger) | BLOCKED | BLOCKED |

บัญชี ห้องพัก ผู้เช่าที่ผูกกับ `stays` และ `property_memberships`, สัญญา, มิเตอร์, บิล, รายการบิล และการชำระเงินจึงยังไม่สามารถกำหนดปริมาณข้อมูลที่จะย้ายจากผลตรวจปัจจุบันได้

## 5. Schema และ migration comparison

Repository มี migration `001`–`014` ครบตามลำดับไฟล์ รายการ 001–011 สร้างฐานหลัก, สิทธิ์, การพักและ billing; 012 เพิ่ม operational modules; 013 เพิ่ม repair workflow; 014 เพิ่ม `local_sync_receipts` และ `local_sync_revisions` สำหรับ Sync บน Staging Migration 014 มี foreign key ไปยัง `properties` และ `accounts`, primary key ของ `operation_id`, unique key ของ revision ตาม property/entity และ check constraints

**BLOCKED — ยังเปรียบเทียบ schema, index, constraint, foreign key และ checksum ledger ของฐานจริงไม่ได้** จำนวน migration ที่ติดตั้งจริงบนแต่ละ Production database ยังไม่ทราบ `app/api/health/db/route.ts` คาด 13 รายการสำหรับ provider ทั่วไป และ 14 รายการสำหรับ Neon Staging หรือ isolated CI เท่านั้น เงื่อนไขในโค้ดไม่ใช่หลักฐานว่าฐาน Production ติดตั้งตามนั้น

สำหรับการตรวจซ้ำให้ดึง `stayhub.schema_migrations` พร้อม checksum และ `pg_catalog` ของทั้งสองฐานแบบ read-only โดยตรวจตัวตน project, environment, branch และ database ก่อน เปรียบเทียบตาราง คอลัมน์ ชนิดข้อมูล default, index definition, constraint definition และ foreign key แบบ normalized จึงจะระบุ migration ที่ขาดหรือ schema drift ได้

## 6. Production database connection verification

**BLOCKED — ไม่สามารถยืนยันค่า `DATABASE_URL` หรือปลายทางที่ Production app ใช้จริง** เครื่องงานไม่มี binding ของ Railway Production และไม่สามารถอ่าน Railway variables หรือ health endpoint ได้

การอ่านโค้ด `lib/db/postgres.ts` ยืนยันได้เพียงกติกาเลือก connection string ถ้า `STAYHUB_DB_PROVIDER=neon-production` จะใช้ `STAYHUB_NEON_PRODUCTION_URL` ภายใต้ Railway Production identity guard; ถ้า `neon-staging` จะใช้ Staging URL; กรณีอื่นใช้ `DATABASE_URL` การมีชื่อตัวแปรหรือค่าเริ่มต้นในโค้ดไม่พิสูจน์ค่าที่ Production ตั้งอยู่จริง เอกสาร `docs/P28F1_PRODUCTION_PREFLIGHT.md` ก็ระบุว่าการยืนยันปลายทาง `DATABASE_URL` ถูกบล็อกในครั้งก่อน

## 7. API dependency inventory

- เส้นทาง `app/api/v2/[action]`, `bills`, `leases`, `meter-readings`, `operations`, `repairs`, `reservations` และ `sync` ใช้ `lib/db/postgres.ts` รวมถึง session ที่ `lib/cloud-identity.ts` ผ่าน `postgresQuery` หรือ transaction ดังนั้นปลายทางจริงขึ้นกับ provider variables ของ runtime
- Sync API ที่ `app/api/v2/sync` จำกัดเส้นทาง production โดย environment guard และต้องอาศัย migration 014 บน Staging สำหรับ receipt/revision
- `lib/db/neon.ts` เป็น helper ที่อ่าน `DATABASE_URL` โดยตรง แต่การค้นหา import ใน `app` และ `lib` ไม่พบ caller ปัจจุบัน จึงยังไม่ใช่หลักฐานว่า API สดใช้ helper นี้
- `lib/supabase-browser.ts`, `lib/supabase.ts`, `lib/server-auth.ts` และหลาย component ใน `components/` ยังมีการใช้งาน Supabase Auth, table, storage หรือ RPC โดยตรง เช่น `FinanceRateSettingsForm.tsx` และ `finalize-contract-client.ts` งานย้ายฐานข้อมูลต้อง inventory callsite เหล่านี้แยกจาก PostgreSQL API ก่อนเปลี่ยน provider
- ยังไม่สามารถยืนยัน traffic หรือ dependency ของ Production app runtime จากผลตรวจนี้

## 8. UI/UX preservation

รายงานนี้ไม่มีการแก้ไฟล์ UI, layout, style, route, component, business logic, migration, CI หรือการตั้งค่าระบบ จึงไม่เปลี่ยนหน้าตาหรือพฤติกรรม UI/UX จาก commit ที่ตรวจ

## 9. Blockers และ risks

1. ไม่มี read-only access ที่ยืนยันตัวตนไปยัง Railway Production และ Neon Production ในเครื่องงานนี้; proxy ตอบ `403` ต่อ health endpoints
2. ไม่มีหลักฐานสดของ row count และ schema parity; ผลในเอกสารเก่าอาจเปลี่ยนแล้ว ห้ามสรุปว่าฐานใดว่างหรือพร้อมย้าย
3. Production provider variables และปลายทาง `DATABASE_URL` ยังยืนยันไม่ได้
4. Migration 012–014 เพิ่มตาราง/ข้อกำหนดจากหลักฐานเก่าที่มีเพียง 001–011; สถานะการติดตั้งจริงไม่ทราบ
5. Supabase callsite ใน frontend และ auth/storage ยังต้องตรวจครบก่อนออกแบบการย้ายข้อมูลและการคงฟังก์ชันเดิม

## 10. งานจำเป็นสำหรับ P2

- จัดช่องทาง read-only ที่ตรวจ environment, Neon branch และ database identity ได้ โดยไม่พิมพ์ secret ลง log หรือรายงาน
- เก็บ exact `COUNT(*)` ของทุกตารางและ checksum migration ledger ของทั้งสอง Production database ณ เวลาเดียวกัน พร้อม schema/index/constraint/foreign key inventory จาก `pg_catalog`
- ยืนยันปลายทางจริงของ Production app และตัวแปร provider ด้วย metadata ที่ไม่เปิดเผยค่า secret และ probe จาก runtime ที่ผูกกับ environment จริง
- เทียบข้อมูลบัญชี ที่พัก ห้อง ผู้พัก สัญญา มิเตอร์ บิล และการชำระเงิน รวมถึง dependency ของ Supabase Auth, storage และ RPC ก่อนกำหนดวิธีย้าย
- ระบุ migration ที่ขาดจากผลเทียบจริง แล้วออกแบบแผน copy, verification, rollback และการรักษา UI/ฟังก์ชันเดิมในงาน P2 ที่ได้รับมอบหมายภายหลัง

P1 รอบนี้ยังไม่ผ่านเกณฑ์ตรวจฐานต้นทางและปลายทางครบ เพราะข้อจำกัดการเข้าถึงข้างต้น ไม่มีการเขียนฐานข้อมูล รัน migration เปลี่ยน environment variable หรือ deploy
