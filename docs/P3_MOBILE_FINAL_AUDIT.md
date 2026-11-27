# P3 Mobile UI Final Audit

วันที่ตรวจ: 27 พฤศจิกายน 2026 (Asia/Bangkok)

Branch: `feat/stayhub-p26-readiness`
Remote HEAD ก่อนตรวจ: `a4995961c97b819aaa7a8a030ce1b702744f5dce`

## ขอบเขตและสภาพแวดล้อม

ตรวจด้วย Playwright และ Chromium `/usr/bin/chromium` บน localhost โดยใช้ PostgreSQL ใน Docker ฐาน `stayhub_p26_ci` ซึ่งติดตั้ง migration 22/22 และข้อมูลทดสอบที่สร้างขึ้นใหม่เท่านั้น หน้าเจ้าของทั้ง Apartment, Guesthouse, Daily, Homestay และเมนูผู้เช่า 6 เมนู ตรวจที่ 320×568, 360×800, 375×812, 390×844 และ 430×932 px. เปิด Mock Ad ในสภาพแวดล้อมทดสอบ; ไม่มี Live Ad หรือการเปลี่ยน provider. ไม่แตะ Production หรือ Staging.

ภาพก่อน/หลังที่ 320 และ 390 px สำหรับเจ้าของทั้งสี่ประเภท และที่ 390 px สำหรับผู้เช่าทั้งหกเมนูอยู่ใน [`screenshots/mobile-final-audit/`](screenshots/mobile-final-audit/). ผลวัดดิบอยู่ใน `before-findings.json` และ `after-findings.json` ในโฟลเดอร์เดียวกัน.

## ผลตรวจจริง

| รายการ | ผล | หลักฐาน/ขอบเขต |
| --- | --- | --- |
| หน้าเจ้าของ 4 ประเภทและแท็บหลักทุกแท็บ | PASS ในขอบเขตที่ตรวจ | เปิดและกดแท็บบน Chromium ทั้ง 5 ขนาด; ไม่มี JavaScript error หรือ horizontal overflow ทั้งหน้า |
| การ์ดห้อง | PASS | ห้อง 6 สถานะจากฐานทดสอบ: ว่าง, เข้าพัก, จองแล้ว, ปิดซ่อม, ทำความสะอาด, ปิดใช้งาน; 3 ช่องต่อแถว, ชื่อห้องยาวไม่ล้น, กดห้อง A101 แล้วเปิดห้องที่เลือกจริง |
| พื้นที่กดและข้อความ | PASS ในส่วนที่ตรวจ | ก่อนแก้พบปุ่มออกจากระบบสูง 42px, ช่องวันตารางจองกว้าง 39px, ปุ่มเดือนกว้าง 37px และปุ่มสร้าง QR สูง 43px; หลังแก้ `after-findings.json` มี 0 รายการจากการตรวจปุ่มที่อยู่ใน viewport และ heading/button ที่ถูกตัด |
| ผู้เช่า 6 เมนู | PASS ในขอบเขตที่ตรวจ | Billing, Repairs, Parcels, Announcements, Vehicles, Documents เปิดที่ 5 ขนาด; ไม่มี horizontal overflow/heading หรือปุ่มฟอร์มถูกตัด; ตรวจ empty/error/loading, ส่งคำขอซ่อม/รถ, สัญญา PDF และการแยกสิทธิ์ที่พัก |
| โฆษณา | PASS เฉพาะ Mock | รอ Mock Bottom Ad ขณะเปิดหน้าเจ้าของ, ตรวจตำแหน่งที่อยู่ใน viewport ไม่ซ้อนปุ่ม, แทรก Dialog ทดสอบแล้ว Ad ถูกซ่อนและกลับมาเมื่อปิด Dialog, ไม่มี request ไปผู้ให้บริการโฆษณาจริง |
| TypeScript | PASS | `npm run typecheck` |
| Build | PASS | `npm run build`; มี warning เดิมจาก Autoprefixer เรื่อง `end` ใน `guesthouse.module.css` |
| Regression | PASS เฉพาะส่วนที่แก้ | `scripts/p3-mobile-final-audit.mjs` และ `scripts/audit-tenant-menus.mjs` ผ่านบนฐานทดสอบ |

## สิ่งที่แก้

- `app/cloud/dashboard.module.css`: ปุ่มออกจากระบบและปุ่มในพื้นที่จัดการมีพื้นที่กดขั้นต่ำ 44px บนมือถือ
- `app/cloud/guesthouse.module.css`: ขยายช่องวันในตารางจองและปุ่มเปลี่ยนเดือนเป็นอย่างน้อย 44px
- `app/globals.css`: ปุ่มร่วม `.btn` มีความสูงขั้นต่ำ 44px บนมือถือ
- `scripts/p3-mobile-final-audit.mjs`: เพิ่มชุดตรวจเจ้าของ 4 ประเภท, ห้อง 6 สถานะ, 5 ขนาดจอ และบันทึกภาพ/ผลวัด
- `scripts/audit-tenant-menus.mjs`: เพิ่มโหมดตรวจมือถือ 5 ขนาดและภาพก่อน/หลัง

## ยังไม่ผ่านการยืนยัน

- ยังไม่ได้ทดสอบทุกปุ่มย่อย ฟอร์ม และ Dialog ของเจ้าของทุกแท็บ; ชุดนี้ตรวจการเปิดแท็บ ขนาดปุ่มที่มองเห็นบน viewport และการ์ดห้องเป็นหลัก
- ยังไม่ได้จำลองกรณีโหลด Mock Ad ล้มเหลวด้วย Browser Test
- ยังไม่ได้ทดสอบบนอุปกรณ์มือถือจริงหรือ Railway Staging; ผล Chromium นี้มาจาก localhost และฐานทดสอบแยก
- ไม่มีการ Deploy; รอตรวจรับ Commit และภาพก่อน Deploy ตามคำขอ

ดังนั้นผลนี้ยืนยันการแก้จุดที่พบและขอบเขต Browser Test ข้างต้น แต่ **ยังไม่ถือว่า Full Mobile Audit ผ่านครบทุก Control และ Dialog**.
