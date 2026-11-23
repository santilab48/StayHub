# StayHub final cutover handover

วันที่ 23 พฤศจิกายน 2026 (Asia/Bangkok)

## สถานะส่งมอบ

**Infrastructure dual-database cutover มีหลักฐานว่าใช้งานได้จาก Production release ก่อนหน้า แต่ Final Cutover ยังไม่เสร็จ 100%.** Railway PostgreSQL เก็บข้อมูลบัญชี/session และข้อมูลดำเนินงาน ส่วน Neon Production schema `stayhub_membership` ให้บริการอ่านสถานะสมาชิกและสิทธิพิเศษ งาน Commercial Membership, Platform Super Admin, Production backup/restore proof และ Production write acceptance ยังไม่ผ่านเกณฑ์ส่งมอบ

Repository `santilab48/StayHub` ใช้ branch `feat/stayhub-p26-readiness` และ Draft PR #2 ไม่ได้ Merge. Remote HEAD ก่อนจัดทำรายงานคือ `5d480120de2d91c19d4716e15ed3505c2479d312`. Working tree สะอาดก่อนงานนี้ ไม่มีการแก้ Production หรือสิทธิ์จริง

ข้อมูล Production จากรายงาน P6.2 ที่จัดทำก่อนหน้านี้ระบุ Railway deployment `fa736402-0a12-497c-8c48-00ab26c2a217` เป็น SUCCESS โดย source pin `201fe3b524a35804544ae1fdd1259b6b07e09f75`, Railway app และ `Postgres-PDqf` Online 1/1, `/api/health/db` ผ่าน, migration 001–014 ถูกตรวจและ SKIP, Neon membership predeploy แบบ read-only ผ่าน ข้อมูลนี้เป็นผลสังเกตย้อนหลัง ไม่ใช่การตรวจ Production สดในรอบนี้

## สิ่งที่ตรวจจริงในรอบนี้

- เครื่องงานไม่มี Railway/Neon management connector, database bindings หรือ credentials และเครือข่ายตอบ `CONNECT tunnel failed, response 403` ต่อ Production health และ membership endpoints จึงตรวจสถานะบริการ, backup tab, variables, Neon branch และ logs สดไม่ได้
- สร้าง PostgreSQL 16 แยกสองฐานที่ localhost. Railway stand-in `stayhub_p26_ci` ติดตั้ง migration 001–014 ครบ 14/14; Neon stand-in `stayhub_membership_ci` ติดตั้ง `neon/membership/001_membership.sql`. ไม่มีการเชื่อม Production
- HTTP integration `scripts/p26-http-e2e.mjs` ผ่านการลงชื่อเข้าใช้, session, property authorization, room sync, billing, payment, replay และ permission checks
- Membership HTTP integration `scripts/p60-membership-http-e2e.mjs` ผ่านการแยก Railway identity/Neon data, expired/suspended fail-closed และการไม่เปิด endpoint ให้ client ออกสิทธิ์เอง. `scripts/check-membership-production.mjs` ผ่านเมื่อรันในโหมด isolated CI ต่อฐานสมาชิกแยก ไม่ใช่ Neon Production
- Chromium E2E ผ่าน `p61-membership-browser-e2e`, `p53-browser-e2e`, `p57-receipt-browser-e2e` และ `p58-offline-pwa-e2e`. ครอบคลุมสถานะสมาชิก, ห้อง A→Server→B→Server→A พร้อม offline conflict, receipt PDF ของบิลที่จ่ายแล้ว, การปฏิเสธผู้ไม่มีสิทธิ์ และ PWA offline persistence
- Local DB/sync/backup unit tests ผ่าน 13/13; `scripts/test-local-sync-contract.mjs` ผ่าน; `npm run typecheck` และ `npm run build` ผ่าน
- Logical `pg_dump`/`pg_restore` ของฐานทดสอบลงฐานอื่นสำเร็จ. ต้นทางและปลายทางตรงกันที่ migration 14, ที่พัก 3, ห้อง 5, บิล 2, payments 4, ยอดบิล 8,350.00 และยอดรับชำระ 8,350.00. นี่เป็น fixture ของฐานทดสอบเท่านั้น

GitHub Actions ที่บันทึกใน `docs/P62_CUTOVER_PRODUCTION_EVIDENCE.md` เป็น SUCCESS สำหรับ Build/Security `45154309140` และ isolated PostgreSQL/Chromium `45154309156`. การทดสอบ localhost ข้างต้นเป็นผลรันใหม่ของงานนี้ ส่วน CI links เป็นหลักฐานจากงานก่อนหน้า

## P6.3 Production backup และ recovery

**BLOCKED.** ไม่มีช่องทางดู Railway Production PostgreSQL volume, backup schedule, restore points หรือ retention ในเครื่องงานนี้ จึงยังยืนยันว่ามี backup ที่ใช้กู้คืนได้หรือกำหนด schedule ใหม่ไม่ได้ Volume ที่ Online และการ restore fixture ใน CI ไม่ใช่หลักฐาน Production backup. ไม่มีการ restore, restart, snapshot หรือเปลี่ยน database Production

ขั้นตอน Recovery ที่ต้องใช้เมื่อมีสิทธิ์ตรวจ Production จริง

1. ระบุ project/environment/service/database identity และบันทึก deployment ID, app source pin, provider mode และชื่อ variable ที่จำเป็นโดยไม่เปิดเผย secret. ตรวจจำนวน migration 001–014 และ health ก่อนเริ่ม
2. ตรวจ Railway `Postgres-PDqf` Backups ว่ามี schedule, restore point ล่าสุด, retention และสถานะงานจริง. ระบุเวลาและชนิด backup. หากไม่มี ให้กำหนดตาม RPO/RTO ที่ผู้ดูแลอนุมัติและตรวจการสร้าง restore point ครั้งแรก
3. สำหรับ off-site logical backup ให้ใช้บัญชีอ่านข้อมูลที่ได้รับอนุญาตและ PostgreSQL client ที่ตรงกับ server, เข้ารหัสไฟล์, เก็บในปลายทางที่ควบคุมสิทธิ์ และบันทึก checksum/เวลา/ขนาด/ตาราง โดยไม่พิมพ์ connection string หรือข้อมูลลูกค้าใน log
4. กู้คืนสำเนาลงฐานแยกที่ยืนยันว่าไม่ใช่ Production. ตรวจ migration filenames/checksums, table/index/constraint inventory, exact row counts ของทุกตาราง และยอดรวม bill/payment. ทดสอบ login/read-only API กับสำเนาใน environment ที่ไม่ส่งข้อมูลถึงลูกค้า
5. เมื่อเกิด incident จริง ให้หยุดการเขียนตามแผนที่อนุมัติ, รักษา volume และหลักฐานเดิม, เลือก restore point ตาม RPO, กู้คืนในที่แยกก่อน และเปรียบเทียบข้อมูลก่อนเปลี่ยนปลายทาง. การ restore ทับ Production ต้องมีอนุญาตเฉพาะการกระทำนั้น

Rollback แอปควรใช้ deployment/source pin เดิมที่ตรวจว่ารองรับ schema 001–014 และตรวจ health/auth/billing หลังเปลี่ยน. P6.2 ระบุ deployment ปัจจุบัน `fa736402-0a12-497c-8c48-00ab26c2a217`; P5.4 ระบุ rollback reference เก่า `dfcdc09f-7f9c-43ad-a77d-1a6f7d701493` แต่สถานะ artifact ปัจจุบันยังไม่ทราบ. ห้ามสมมติว่า rollback reference ยังใช้ได้โดยไม่ตรวจ Railway ก่อน. ทดสอบ rollback ใน Staging หรือ environment แยกก่อน Production

## P6.4 Two-way room sync

**ผ่านในฐานทดสอบแยกเท่านั้น.** Chromium สอง context แยก cookies/IndexedDB ส่งห้องไปกลับ, รักษา offline edit, ทำ conflict rebase และ reload ได้. HTTP test ยืนยัน replay/idempotency, account/property isolation และ unauthorized rejection. ไม่มีบัญชี/ที่พัก Production สำหรับเขียนข้อมูลทดสอบที่อนุญาตชัดเจน จึงไม่ได้รัน Production write E2E หรือแตะข้อมูลลูกค้า

## P6.5 Neon Membership และ Benefits

Read-only membership API และหน้า member status ใช้งานในโค้ดและผ่าน isolated tests. Production P6.2 predeploy เคยยืนยัน Neon reader role แยกจาก operational schema. P6.2 ระบุ Production catalog มี 0 plans, 0 entitlements และ 0 members. ไม่ได้สร้างราคา, tier หรือสิทธิ์จริง. ระบบค้นหาสมาชิก, อนุมัติ/ต่ออายุผ่าน UI, account mapping ย้อนหลัง และ privileged audit workflow สำหรับผู้ดูแลยังไม่ครบ. `scripts/p60-membership-provision.mjs` เป็น CLI ที่ต้องมี approval/target guard และสร้าง audit event แต่ไม่มีผู้ดูแลหรือ catalog จริงที่ได้รับอนุมัติในรอบนี้

## P6.6 Platform Super Admin

**ยังไม่พร้อม.** ไม่มีตัวตน Platform Super Admin ที่ provision และรับรองแล้วจากแหล่งสิทธิ์ฝั่ง Server. ไม่เปิดบทบาทนี้ให้บัญชีทั่วไป, ไม่สร้าง default admin และไม่เปิด API สำหรับ client เพิ่มสิทธิ์เอง. Dashboard, member search/approval/suspension/renewal และ audit UI ที่ใช้ role ที่ตรวจฝั่ง Server ต้องพัฒนาและทดสอบพร้อม approved provisioning workflow. ห้ามเปิดใช้งาน Production จนกว่าจะระบุตัวตนผู้ดูแล, นโยบายสิทธิ์และ catalog จริงอย่างชัดเจน

## P6.7 Final QA และข้อจำกัด

Isolated tests ครอบคลุม desktop Chromium, auth/session, owner/tenant isolation, offline/PWA, IndexedDB, billing/payment, PDF receipt, membership states, local encrypted backup และ database fixture restore. ยังไม่มีหลักฐาน physical mobile, printer จริง, Production authenticated member session, Production backup restore หรือ rollback drill. Production health ในรอบนี้ยังไม่ตรวจสด เพราะ proxy ตอบ 403

ไม่มี bug ใหม่จากชุดทดสอบแยกในรอบนี้ จึงไม่มีการแก้ application code. ไม่ได้เปลี่ยน UI/UX, Railway/Neon variables, Production data, Production deployment หรือ Merge Draft PR #2. ไม่ได้อัปเดตข้อความใน PR โดยตรง เพราะ GitHub GraphQL API ตอบ `Forbidden`; commit บน branch จะปรากฏเป็น source diff ของ Draft PR เดิม แต่สถานะ PR ล่าสุดยังไม่ได้อ่านยืนยัน

## เกณฑ์ที่ยังต้องผ่านก่อนประกาศ Cutover Complete

- ตรวจ Production backup schedule/retention/restore point และ restore **สำเนาข้อมูล Production จริง** ในที่แยกพร้อมตรวจ migration, counts และยอดเงิน
- ได้ approved test account/property สำหรับ Production room sync write E2E หรือคงสถานะ Production write unverified
- อนุมัติ package/price/entitlement policy และ verified Railway UUID mapping โดยไม่แจกสิทธิ์จริงเอง
- Provision Platform Super Admin ที่รับรองตัวตนแล้ว, ใช้ server-side RBAC, ป้องกัน self-grant และเก็บ audit log สำหรับทุก mutation
- ทดสอบ desktop/mobile, PWA, printer/receipt และ rollback ใน environment แยก แล้วตรวจ Production health/provider/Neon reader สดอีกครั้ง

**Final cutover status: ไม่ครบ 100%** แม้ infrastructure dual-database ที่เคย deploy จะผ่าน Production predeploy และ isolated QA รอบนี้ผ่าน


## Addendum P6.3 — Platform Admin readonly gate (2026-11-23)

งานที่ทำต่อหลัง Commit `162df535b5393c5f1f23b38bac83c86e269afbd8`:

- พัฒนา Registry ผู้ดูแลฝั่ง Neon โดยไม่สร้างบัญชี Super Admin เริ่มต้น และเพิ่มหน้าค้นหาสมาชิกแบบ **อ่านอย่างเดียว** `/platform-admin` ที่ตรวจ Session Railway + ตารางสิทธิ์ Neon ฝั่ง Server ทุกครั้ง
- เพิ่ม API `GET /api/v2/platform-members` พร้อม 401/403, Pagination และ `Cache-Control: no-store` ไม่มี Endpoint ให้ผู้ใช้แก้ไขหรือออกสิทธิ์เอง
- ผ่าน GitHub Build/Security https://github.com/santilab48/StayHub/actions/runs/45160023762 และ isolated PostgreSQL/Chromium/restore https://github.com/santilab48/StayHub/actions/runs/45160023656 โดยทดสอบว่าผู้ไม่มีสิทธิ์ถูกปฏิเสธ การเพิกถอนสิทธิ์มีผลทันที และสมาชิกไม่สามารถเพิ่มสิทธิ์ตนเองผ่าน API
- Neon **Staging** `br-fancy-sky-a1n96vul`: ลง `neon/membership/002_platform_admins.sql` แบบเพิ่มตารางเท่านั้น ตรวจบัญชี Reader อ่านทะเบียนผู้ดูแลซึ่งยังมี 0 รายการได้ แต่ไม่สามารถอ่านตารางที่พักเดิม
- **ยังไม่ Deploy/แก้ Neon Production หรือ Railway Production ใน P6.3** และไม่เปิดใช้งาน Super Admin แก่บัญชีจริง ต้องมีขั้นตอนแต่งตั้ง/เพิกถอนพร้อม Audit Event และตัวตนผู้ดูแลที่อนุมัติก่อน
- รายละเอียด: `docs/P63_PLATFORM_ADMIN_READONLY_GATE.md`

**Final Cutover ยังคงสถานะไม่ครบ 100%** โดยเฉพาะ Production Railway backup/restore, approved Production write E2E, package pricing/policy, production admin provisioning และ physical-device testing
