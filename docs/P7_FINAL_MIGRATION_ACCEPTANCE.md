# StayHub P7 — Final migration acceptance

วันที่ 24 พฤศจิกายน 2026 (Asia/Bangkok) · Repository `santilab48/StayHub` · Branch `feat/stayhub-p26-readiness`

## คำตัดสิน

**BLOCKED — ยังรับรองการย้ายระบบครบ 100% ไม่ได้** โดยเฉพาะ Railway Production PostgreSQL backup/restore และความครบถ้วนของข้อมูลจริง. ไม่ได้เปลี่ยนข้อมูล Production, ตั้งค่าฐาน, Deploy, Merge Draft PR #2 หรือเริ่มงาน Membership/Super Admin.

Remote HEAD ตอนเริ่ม: `a7ad4ae671b555d222180cd7ddfb8f6591fb6687`; Working Tree สะอาดก่อนจัดทำรายงาน. GitHub Actions ที่หน้าเว็บสาธารณะแสดงสำหรับ HEAD นี้: `45172514258` และ `45172514197` สถานะ **Success** ณ การตรวจครั้งนี้. GitHub API สำหรับรายละเอียด job/PR ตอบ `Forbidden`; สถานะหน้าเว็บเป็นหลักฐาน CI เท่าที่อ่านได้ ไม่ใช่หลักฐาน Production acceptance.

## P7.1 — Railway Production backup: BLOCKED

ไม่มี Railway management/database connector หรือ credential ในสภาพแวดล้อมนี้. จึงตรวจสถานะ Postgres/volume สด, schedule, retention, backup ล่าสุด, restore point, ขนาดฐาน, migration ledger ปัจจุบัน หรือความพร้อมกู้คืนไม่ได้ และไม่สามารถตั้ง schedule พร้อมตรวจผลจริงได้. รายงาน [P6.2](P62_CUTOVER_PRODUCTION_EVIDENCE.md) บันทึกเมื่อ 23 พ.ย. ว่า Production app/Postgres Online, deployment `fa736402-0a12-497c-8c48-00ab26c2a217` สำเร็จ, migration 001–014 ถูกตรวจแล้ว และ Neon membership reader ผ่าน predeploy. หลักฐานย้อนหลังนั้น **ไม่ใช่** backup หรือสถานะสด. Neon snapshot `snap-rough-firefly-a1w6x02f` ก็ไม่ใช่ Railway backup.

## P7.2 — Restore สำเนา Production: BLOCKED

ไม่มี Production backup/pg_dump ที่ตรวจตัวตนและจัดการข้อมูลลูกค้าอย่างปลอดภัยได้ จึงไม่ได้กู้คืนสำเนาข้อมูลจริงไปฐานทดสอบ. หลักฐานเดิม [P5.9](P59_SECURITY_BACKUP_ROLLBACK_AUDIT.md) และ [Final handover](FINAL_CUTOVER_HANDOVER.md) เป็นการ `pg_dump`/`pg_restore` **fixture บน PostgreSQL แยก**: migration 14/14 และ counts/ยอดบิล/ชำระตรงกัน. นั่นพิสูจน์ขั้นตอนทดสอบ ไม่พิสูจน์ว่ากู้ข้อมูล Production ได้. ไม่มีการ restore ทับ Production หรือคัดลอกข้อมูลลูกค้า.

## P7.3 — Data integrity: BLOCKED

ไม่มี read-only connection สู่ Railway Production และไม่มี snapshot ก่อนย้ายที่ตรวจเทียบสดในรอบนี้. ดังนั้นจำนวน Accounts, Properties, Rooms, Tenants, Leases, Meter Readings, Bills, Payments, Reservations, Repairs และ Migration History ทั้งหมดเป็น **ยังไม่ได้ตรวจสด**; ยอดบิล/ยอดรับชำระ, foreign keys, index และความสัมพันธ์ก็ยังไม่ได้ตรวจ. ห้ามใช้ตัวเลข fixture หรือข้อมูลเก่ามาแทนจำนวน Production. ยังสรุปว่าข้อมูลก่อนย้ายครบไม่ได้.

## P7.4 — Production functional acceptance: BLOCKED

`curl` ไป `https://stayhub.tushub.com/` และ `/api/health/db` รวมทั้ง Railway URL เดิม ถูก outbound proxy ปฏิเสธด้วย `CONNECT tunnel failed, response 403`. นี่เป็นข้อจำกัดการเชื่อมต่อของเครื่องทดสอบ **ไม่ใช่หลักฐานว่าเว็บไซต์ล่ม**. จึงไม่ยืนยัน HTTPS certificate/domain, สมัคร/ล็อกอิน/session, รายการที่พัก/ห้อง, sync, มิเตอร์, บิล, payment, PDF, PWA/offline หรือการแยกสิทธิ์จาก Production ในรอบนี้. ไม่มีบัญชีและที่พักทดสอบ Production ที่อนุญาตชัดเจน จึงไม่ทำ write acceptance และไม่สร้างข้อมูลในที่พักลูกค้า. CI/Chromium และ Staging ที่บันทึกไว้ก่อนหน้าเป็นผลของสภาพแวดล้อมอื่น ไม่ใช่ Production write test.

## P7.5 — Final verification: BLOCKED บางส่วน

| หัวข้อ | สถานะ | หลักฐาน/ข้อจำกัด |
| --- | --- | --- |
| Git Remote และ CI | PASS เฉพาะ GitHub ที่อ่านได้ | Fetch HEAD สำเร็จ; GitHub Actions `45172514258`, `45172514197` หน้าเว็บแสดง Success สำหรับ `a7ad4ae`. ไม่ได้อ่านรายละเอียด job ผ่าน API |
| Railway app/Postgres/Neon | BLOCKED สด | [P6.2](P62_CUTOVER_PRODUCTION_EVIDENCE.md) ยืนยัน deployment และ Neon reader ในอดีต; ไม่มี management access ในรอบนี้ |
| HTTPS/domain/health | BLOCKED | Proxy 403 ก่อนถึงปลายทาง; ไม่ได้ตรวจใบรับรองหรือ HTTP response ของแอป |
| Logs/security | BLOCKED สด | ไม่มี Railway logs/variables หรือ authenticated Production session; ไม่มี critical-warning verdict ใหม่ |
| Rollback | BLOCKED | Deployment `fa736402-0a12-497c-8c48-00ab26c2a217` เป็น historical reference; ยังไม่ยืนยันสถานะ artifact, configuration, backup restore point หรือซ้อม rollback ปัจจุบัน |

## สิ่งที่ต้องมีเพื่อปิด Acceptance

1. เข้าถึง **Railway Production** แบบอ่านอย่างเดียวและยืนยัน project/environment/service/database identity ก่อนดู Backups tab, schedule, retention, restore point, volume, DB size, migration 001–014, logs และ health. หากไม่มี backup ให้ตั้งค่าเฉพาะใน Production service เดิมด้วยสิทธิ์ที่ได้รับ แล้วตรวจ restore point ที่สร้างสำเร็จจริง.
2. กู้ **สำเนา Production จริง** ลงฐานทดสอบแยกที่ยืนยันตัวตนและมีมาตรการปกป้องข้อมูลลูกค้า; เทียบ schema/index/FK, counts ทุกตาราง, migrations, ห้อง/บิล/payment และยอดเงินกับ read-only snapshot ต้นทาง. ห้าม restore ทับ Production.
3. ตรวจเว็บไซต์และ certificate/health จากช่องทางที่เข้าถึงปลายทางได้จริง. ทำ Production write E2E เฉพาะบัญชี/ที่พักทดสอบที่ได้รับอนุญาต พร้อม cleanup plan; หากไม่มี ให้คงสถานะ BLOCKED และแยกผล Staging ชัดเจน.
4. ตรวจ current deployment/configuration และ rollback artifact ใน Railway พร้อมซ้อม restore/rollback บน environment แยกก่อนประกาศพร้อมกู้คืน.

**Migration acceptance: NOT ACCEPTED / BLOCKED.** Infrastructure cutover มีหลักฐานย้อนหลัง แต่ backup, restore, data integrity และ Production functional acceptance ยังไม่มีหลักฐานจริงครบ. ไม่ได้แก้ application code จึงไม่รัน TypeScript/Build ซ้ำ.


## Addendum — Direct production service check (24 November 2026)

This is a new connected check that partially resolves the previous execution environment's inability to access Railway management. It does **not** override the P7 backup, restore, data-integrity or authenticated functional gates.

- Railway project `a8a5a434-4d18-438f-b4ea-ece072094595`, Production environment `c9c4b13a-9041-4ae6-bd50-2d02b546b053`: both `StayHub` and `Postgres-PDqf` are **online 1/1**, with 0 warning/critical issues and no pending Railway environment changes at inspection time.
- Railway `Postgres-PDqf` volume `postgres-volume-zENI` is mounted at `/var/lib/postgresql/data` (500 MB). This is **not** evidence of a usable backup.
- Current Production deployment `fa736402-0a12-497c-8c48-00ab26c2a217` remains **SUCCESS**, source commit `201fe3b524a35804544ae1fdd1259b6b07e09f75`. No new Production deployment was initiated.
- Custom domain `stayhub.tushub.com`: ownership **verified**, CNAME propagated to `rz9ikc4w.up.railway.app`, Railway certificate `CERTIFICATE_STATUS_TYPE_VALID`.
- A direct read-only Neon Production query through role `stayhub_membership_reader`, branch `br-snowy-tree-a1kt7omx`, returns 0 plans, 0 entitlements and 0 memberships (consistent with unconfigured commercial membership).
- The external page/health HTTP fetch remained inaccessible to the remote web client, so no claim of a successful authenticated application or write acceptance is made.
- Railway management connector used here exposes service, deployments and volume status but **does not expose a backup schedule, retention, restore point or production database SQL/execution operation**. Accordingly P7.1 (backup), P7.2 (restore of production data), P7.3 (source-to-production data completeness) and P7.4 (live authenticated functional/write E2E) remain **BLOCKED / unverified**. Neither backup restore nor Production data write was attempted.
- For the current P7 report HEAD `56b8d96254b287ec51c33494b6958d26dc0fd2df`, GitHub Build/Security workflow `45342479938` was SUCCESS when checked, while isolated HTTP E2E `45342479896` was still **in progress**; do not assert the latter passed until completed.
- The prior report's claim that Railway/Neon management could not be checked is historical to its runner and has now been superseded for **service status, domain/TLS, deployment and Neon reader checks only**.

**Verdict:** Infrastructure + domain cutover verified operational; final data/backup/restore/functional acceptance remains incomplete. No Production modifications, migrations, re-deployments or user-data writes were performed.
