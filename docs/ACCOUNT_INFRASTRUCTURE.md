# StayHub — ทะเบียนบัญชีบริการและโครงสร้างระบบ (ฉบับเผยแพร่ได้)
ตรวจสอบ 27 พฤศจิกายน 2026

เอกสารนี้เป็นสารบัญสำหรับผู้ดูแลและผู้รับช่วงงาน ไม่ใช่ที่เก็บข้อมูลเข้าสู่ระบบ
Repository นี้เป็น Public ห้ามบันทึกอีเมลส่วนตัว รายชื่อบัญชีผู้ดูแล รหัสผ่าน Token API Key Database URL ที่มี credentials หรือข้อมูลลูกค้า
เก็บทะเบียนบัญชีจริง อีเมล ทีม สิทธิ์ และข้อมูลกู้คืนไว้ในพื้นที่ส่วนตัวที่จำกัดสิทธิ์เท่านั้น

## บริการหลัก
| ระบบ | หน้าที่ | จุดตรวจสอบ |
|---|---|---|
| GitHub | Source code, CI, ประวัติการเปลี่ยนแปลง | https://github.com/santilab48/StayHub |
| Railway | Web/API และ PostgreSQL ข้อมูลดำเนินงาน | https://railway.com/dashboard |
| Neon | PostgreSQL สำหรับสมาชิก แพ็กเกจ วันหมดอายุ สิทธิพิเศษ และ audit | https://console.neon.tech/ |
| Production | เว็บไซต์ใช้งานจริง | https://stayhub.tushub.com |
| Staging | ทดสอบก่อนปล่อย Production | https://stayhub-fsd-staging.up.railway.app |
| DNS/Domain | tushub.com | ผู้ดูแลต้องตรวจบัญชี registrar/DNS ที่ได้รับอนุญาต |
| โฆษณา | ผู้ดูแลตรวจบัญชีผู้ให้บริการที่ได้รับอนุมัติ | ไม่ระบุบัญชีที่ยังไม่ยืนยัน |

## GitHub
- Repository owner: `santilab48` (ชื่อบัญชีสาธารณะ ไม่ใช่หลักฐานอีเมลเจ้าของ)
- Default branch: `main`
- Development/release branch: `feat/stayhub-p26-readiness`
- [GitHub Actions](https://github.com/santilab48/StayHub/actions)
- ต้องตรวจ Remote HEAD และผล CI ทั้ง Build/Security และ isolated E2E ก่อน Deploy
- ตรวจ Repository Settings > Collaborators เพื่อยืนยันสิทธิ์ของผู้ดูแลจริง

## Railway / Neon
- Railway เก็บบัญชีล็อกอิน/session ห้องพัก ผู้เช่า การจอง สัญญา บิล ใบเสร็จ และข้อมูลดำเนินงาน
- Neon เก็บข้อมูลสมาชิกและสิทธิพิเศษแยกจาก Railway; ตรวจสิทธิ์ผ่านบัญชี runtime แบบ read-only
- ชื่อบริการและโครงการที่ตรวจสอบได้: อ้างอิง [เอกสารแยกฐานสมาชิก](P60_NEON_MEMBERSHIP_SPLIT.md) และ [เอกสารตั้งค่า Staging](RAILWAY_STAGING_SETUP.md)
- ตรวจทีมและบัญชีที่ใช้งานจริงจาก dashboard ของแต่ละผู้ให้บริการก่อนดำเนินการ
- แยก Production/Staging และฐานทดสอบเสมอ ห้ามนำ credentials ของ admin ไปใช้เป็น runtime reader
- ห้ามเปลี่ยนหรือลบฐานเดิมโดยไม่ได้รับอนุมัติ
- Health check: `/api/health/db` (ไม่ใช่หลักฐานว่าได้ทดสอบการเข้าสู่ระบบจริงทุกประเภท)

## ทะเบียนบัญชีส่วนตัวที่ต้องจัดทำแยก
ใช้ password manager แบบทีม หรือ Private Repository ที่จำกัดสมาชิกและเปิด MFA
บันทึกเป็นรายบริการ: ชื่อบัญชีงาน / อีเมลเข้าสู่ระบบ / ชื่อทีม / บทบาท / ผู้รับผิดชอบ / ผู้สำรอง / ช่องทางกู้คืน / วันที่ตรวจสิทธิ์
รายการ: GitHub, Railway, Neon, Domain/DNS, บัญชีอีเมลธุรกิจ, ผู้ให้บริการโฆษณา (ถ้ามี), บัญชีสำรองข้อมูล
ไม่คัดลอก secrets ลงไฟล์ทะเบียน ใช้ชื่อรายการอ้างอิงใน password manager เท่านั้น
ยังไม่ได้ยืนยันอีเมลเข้าสู่ระบบและสิทธิ์ทีมทั้งหมด จึงไม่เดาหรือระบุว่าเป็นเจ้าของบัญชี

## เอกสารส่งต่องาน
- [Final Cutover Handover](FINAL_CUTOVER_HANDOVER.md)
- [Membership split](P60_NEON_MEMBERSHIP_SPLIT.md)
- [Membership status](P61_MEMBERSHIP_STATUS_PRODUCTION.md)
- [Production preflight](P28F1_PRODUCTION_PREFLIGHT.md)
- [Print audit](P43_PRINT_AUDIT.md)
- เอกสารเก่าเป็นหลักฐานตามเวลาที่บันทึก ไม่ใช้แทนการตรวจสถานะสด
- อัปเดตทะเบียนเมื่อเปลี่ยนทีม เจ้าของโดเมน ผู้ดูแล หรือบริการ และตรวจสิทธิ์ทุกครั้งก่อนส่งต่องาน

การเพิ่มเอกสารนี้ไม่อนุญาตให้ Deploy หรือแก้ไข Production โดยอัตโนมัติ
