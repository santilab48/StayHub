const known:Record<string,string>={
  'Please sign in':'กรุณาเข้าสู่ระบบ',
  'Forbidden':'คุณไม่มีสิทธิ์ทำรายการนี้',
  'Not found':'ไม่พบข้อมูลที่ต้องการ',
  'Invalid credentials':'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'Bill list unavailable':'โหลดรายการบิลไม่สำเร็จ กรุณาลองใหม่',
  'Billing service unavailable':'บริการบิลไม่พร้อมใช้งาน กรุณาลองใหม่',
  'Module unavailable':'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่',
  'Module action unavailable':'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่',
}

/** Keep technical details in logs and API responses, away from user-visible alerts. */
export function userFacingError(value:unknown,fallback='ดำเนินการไม่สำเร็จ กรุณาลองใหม่'):string{
  const message=value instanceof Error?value.message:typeof value==='string'?value:''
  if(!message)return fallback
  if(known[message])return known[message]
  if(/PostgreSQL|Neon|Railway|Database|Migration|\bAPI\b|Staging|Server|SQL|stack|constraint|duplicate key/i.test(message))return fallback
  return /[ก-๙]/.test(message)?message:fallback
}
