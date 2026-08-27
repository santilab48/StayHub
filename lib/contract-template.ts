export type ContractSnapshotInput={
 ownerName:string
 ownerAddress:string
 tenantName:string
 tenantPhone?:string|null
 tenantAddress:string
 roomNo:string
 startDate:string
 endDate?:string|null
 rentAmount:number
 depositAmount:number
}

export function buildResidentialLeaseSnapshot(v:ContractSnapshotInput){
 const terms=[
  'ผู้ให้เช่าตกลงให้เช่า และผู้เช่าตกลงเช่าห้องพักตามที่ระบุในสัญญานี้เพื่อใช้เป็นที่พักอาศัยเท่านั้น',
  `กำหนดระยะเวลาเช่าตั้งแต่วันที่ ${v.startDate}${v.endDate?` ถึงวันที่ ${v.endDate}`:''}`,
  `ค่าเช่าเดือนละ ${Number(v.rentAmount||0).toLocaleString('th-TH')} บาท ชำระตามรอบและวิธีที่ผู้ให้เช่ากำหนด`,
  `เงินประกันจำนวน ${Number(v.depositAmount||0).toLocaleString('th-TH')} บาท ใช้เป็นหลักประกันความเสียหายและภาระค้างชำระตามสัญญา`,
  'ผู้เช่าต้องดูแลห้องและทรัพย์สินภายในห้องให้อยู่ในสภาพเรียบร้อย และรับผิดชอบความเสียหายที่เกิดจากการใช้งานของผู้เช่าหรือผู้พักร่วม',
  'ค่าน้ำ ค่าไฟ อินเทอร์เน็ต ค่าจอดรถ และค่าใช้จ่ายอื่น ให้เป็นไปตามอัตราและรายการที่แสดงในบิลของรอบนั้น',
  'ผู้เช่าต้องปฏิบัติตามกฎระเบียบของหอพัก และไม่กระทำการที่รบกวนผู้อื่นหรือผิดกฎหมาย',
  'การย้ายออก การคืนห้อง การตรวจสภาพ และการคืนเงินประกัน ให้เป็นไปตามข้อมูลและเงื่อนไขที่บันทึกไว้ในระบบของห้องนี้',
  'คู่สัญญายืนยันว่าข้อมูลในสัญญานี้ถูกดึงจากข้อมูลห้องและผู้เช่าที่บันทึกไว้ใน StayHub และยอมรับการลงลายเซ็นอิเล็กทรอนิกส์เป็นหลักฐานการยอมรับสัญญา'
 ]
 return {
  title:'สัญญาเช่าห้องพักอาศัย',
  lessor:{name:v.ownerName,address:v.ownerAddress},
  lessee:{name:v.tenantName,phone:v.tenantPhone||'',address:v.tenantAddress},
  room:{room_no:v.roomNo,address:v.tenantAddress},
  start_date:v.startDate,
  end_date:v.endDate||null,
  rent_amount:Number(v.rentAmount||0),
  deposit_amount:Number(v.depositAmount||0),
  terms,
  generated_from:'stayhub_room_active_lease'
 }
}
