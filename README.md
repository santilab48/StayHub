# StayHub — LINE OA + Web App

Core starter สำหรับระบบหอพักแบบ Rich Menu 6 ช่อง: 5 ผู้เช่า + 1 Admin

## Rich Menu
1. ห้องของฉัน — ข้อมูลห้อง, ผู้เช่า, Paperless Contract
2. บิล & ชำระ — ค่าเช่า, น้ำไฟ, สลิป, ใบเสร็จ
3. แจ้งซ่อม — ticket + รูป + นัดหมาย + สถานะ
4. บริการ — พัสดุ + เรียกรถ/Grab
5. ข่าวสาร — ประกาศ/กฎ/แจ้งเตือน
6. จัดการหอ — Admin Dashboard

## External connections needed
- LINE Developers: LINE Login / LIFF / Messaging API
- LINE OA: Rich Menu + OA ID + Channel access token
- Supabase: Postgres + Storage
- Vercel: hosting + environment variables
- Meter OCR/AI: adapter point; always require human confirmation before saving
- Grab: phase 1 uses outbound app/deep link; no private API dependency in Core

## Multi-tenant rule
Every operational table carries `tenant_id`; never query tenant data without tenant scoping.

## Security rules to add before production
- Verify LINE ID token server-side
- Resolve `line_user_id -> tenant -> role`
- Block `/admin` unless role is admin/staff
- Enable Supabase RLS on all tenant tables
- Keep service-role key server-only
- Signed URLs for private documents, slips, meter photos
- Contract audit trail and immutable signed version

## Meter flow
Select room -> camera/photo -> OCR/AI candidate -> show candidate -> human confirms/edits -> save reading -> calculate usage -> generate/update bill.

## Contract flow
Generate contract snapshot -> tenant reads -> signs -> timestamp/audit -> admin countersigns/approves -> render final PDF -> immutable archive.

## Start
Copy `.env.example` to `.env.local`, install dependencies, then `npm run dev`.
