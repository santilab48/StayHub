const labels:Record<string,string>={
  unpaid:'ยังไม่ชำระ',partial:'ชำระบางส่วน',paid:'ชำระครบ',void:'ยกเลิก',
  waiting:'รอรับ',picked_up:'รับแล้ว',returned:'ส่งคืน',submitted:'ส่งเรื่องแล้ว',
  accepted:'รับงานแล้ว',scheduled:'นัดหมายแล้ว',in_progress:'กำลังดำเนินการ',
  completed:'เสร็จแล้ว',closed:'ปิดงาน',pending:'รออนุมัติ',approved:'อนุมัติแล้ว',
  revoked:'ยกเลิกสิทธิ์',requested:'ส่งคำขอแล้ว',on_the_way:'กำลังเดินทาง',
  arrived:'ถึงแล้ว',cancelled:'ยกเลิก',rejected:'ไม่อนุมัติ',
}
export function recordStatusLabel(value:string):string{return labels[value]||'รอตรวจสอบสถานะ'}
