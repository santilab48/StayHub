import AdminShell from '../../../../../components/AdminShell'
import EmptyState from '../../../../../components/EmptyState'
export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){const {tenantSlug}=await params;return <AdminShell slug={tenantSlug} title="ห้องพัก"><div className="toolbar"><div className="muted">อาคาร → ชั้น → ห้อง → สถานะ</div><button className="btn">+ เพิ่มห้อง</button></div><EmptyState title="ยังไม่มีห้อง" detail="ห้องแต่ละห้องผูก tenant_id + building_id และ room_no ห้ามใช้เลขห้องอย่างเดียวเป็น key"/></AdminShell>}
