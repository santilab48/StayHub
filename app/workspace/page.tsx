'use client'

import { useEffect, useState } from 'react'
import { getActiveWorkspace, type DeviceWorkspace } from '../../lib/local-workspace'
import { accommodationLabel } from '../../lib/accommodation-types'
import type { LocalRecord } from '../../lib/local-db'
import { getPropertyLink, savePropertyLink, type PropertyLink } from '../../lib/local-db/property-link'
import { listSyncQueue, resolveSyncConflict, syncNow, type SyncOperation } from '../../lib/local-db/sync'
import { getBillItems, listAllLocal, removeRoom, saveBillDraft, saveMeter, saveRoom } from '../../lib/local-db/offline'

type Room = LocalRecord<'units'>
type Meter = LocalRecord<'meter_readings'>
type Bill = LocalRecord<'bills'>

export default function WorkspacePage() {
  const [workspace, setWorkspace] = useState<DeviceWorkspace | null>(null)
  const [link, setLink] = useState<PropertyLink | null>(null)
  const [serverProperties, setServerProperties] = useState<{ id: string; name: string }[]>([])
  const [serverAccountId, setServerAccountId] = useState('')
  const [selectedProperty, setSelectedProperty] = useState('')
  const [queue, setQueue] = useState<SyncOperation[]>([])
  const [showQueue, setShowQueue] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [meters, setMeters] = useState<Meter[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [online, setOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [roomName, setRoomName] = useState('')
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [unitId, setUnitId] = useState('')
  const [meterType, setMeterType] = useState<'water' | 'electric'>('water')
  const [reading, setReading] = useState('')
  const [readOn, setReadOn] = useState(new Date().toISOString().slice(0, 10))
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null)
  const [billUnit, setBillUnit] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [billDescriptions, setBillDescriptions] = useState<Record<string, string>>({})

  async function refresh(id: string) {
    const [nextRooms, nextMeters, nextBills] = await Promise.all([
      listAllLocal('units', id), listAllLocal('meter_readings', id), listAllLocal('bills', id),
    ])
    setQueue(await listSyncQueue(id))
    setRooms(nextRooms)
    setMeters(nextMeters)
    setBills(nextBills)
    const descriptions = await Promise.all(nextBills.map(async bill => [bill.id, (await getBillItems(id, bill.id)).map(item => item.description).join(', ')] as const))
    setBillDescriptions(Object.fromEntries(descriptions))
  }

  useEffect(() => {
    const status = () => setOnline(navigator.onLine)
    status()
    window.addEventListener('online', status)
    window.addEventListener('offline', status)
    getActiveWorkspace().then(async found => {
      setWorkspace(found)
      if (found) {
        await refresh(found.id)
        setLink(await getPropertyLink(found.id) ?? null)
      }
    }).catch(failure => setError(String(failure))).finally(() => setLoading(false))
    return () => {
      window.removeEventListener('online', status)
      window.removeEventListener('offline', status)
    }
  }, [])

  async function loadServerProperties() {
    try {
      const response = await fetch('/api/v2/sync/properties', { credentials: 'same-origin' })
      if (!response.ok) throw new Error('กรุณาเข้าสู่ระบบ Staging ก่อนเชื่อมที่พัก')
      const data = await response.json()
      setServerProperties(data.properties)
      setServerAccountId(data.accountId)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'โหลดที่พักไม่สำเร็จ') }
  }

  async function commit(action: () => Promise<unknown>) {
    if (!workspace || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await action()
      await refresh(workspace.id)
      setNotice('บันทึกในเครื่องแล้ว')
    } catch (failure) {
      setError(failure instanceof DOMException && failure.name === 'QuotaExceededError'
        ? 'พื้นที่จัดเก็บในเครื่องเต็ม กรุณาเพิ่มพื้นที่ว่างแล้วลองอีกครั้ง'
        : failure instanceof Error ? failure.message : 'บันทึกในเครื่องไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return <main className="wrap" style={{ maxWidth: 980 }}>
    <div className="toolbar"><a href="/" className="muted">StayHub</a><span className="pill">{online ? 'ออนไลน์' : 'ออฟไลน์'}</span></div>
    {loading ? <section className="card">กำลังเปิดพื้นที่ใช้งาน...</section> : !workspace ?
      <section className="card"><h1>ยังไม่มีพื้นที่ใช้งาน</h1><a className="btn" href="/start">เริ่มต้นใช้งาน</a></section> : <>
        <section className="card"><a href="/workspace/backup">ข้อมูลและการสำรอง</a><h1>{workspace.dormName}</h1><p className="muted">{accommodationLabel(workspace.accommodationType)} · ผู้ดูแล {workspace.ownerName}</p><span className="pill">บันทึกในเครื่อง</span></section>
        {error && <p role="alert">บันทึกไม่สำเร็จ · {error}</p>}
        {notice && <p role="status">{notice}</p>}
        <section className="card section"><h2>สถานะการซิงก์</h2>
          {!link && <p role="status">ต้องเชื่อมที่พักก่อนซิงก์</p>}
          <button onClick={() => void loadServerProperties()}>เลือกที่พักจากบัญชี Staging</button>
          {serverProperties.length > 0 && <><select value={selectedProperty} onChange={event => setSelectedProperty(event.target.value)}><option value="">เลือกที่พัก</option>{serverProperties.map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select><button disabled={!selectedProperty || saving} onClick={() => void commit(async () => {
            if (!serverProperties.some(property => property.id === selectedProperty)) throw new Error('ที่พักไม่อยู่ในบัญชีนี้')
            const checked = await fetch('/api/v2/sync/properties', { credentials: 'same-origin' })
            if (!checked.ok) throw new Error('ตรวจสิทธิ์ที่พักไม่สำเร็จ')
            const current = await checked.json()
            if (current.accountId !== serverAccountId || !current.properties.some((property: { id: string }) => property.id === selectedProperty)) throw new Error('สิทธิ์ที่พักเปลี่ยนไป')
            const next = { localPropertyId: workspace.id, serverPropertyId: selectedProperty, accountId: serverAccountId, linkedAt: new Date().toISOString() }
            await savePropertyLink(next)
            setLink(next)
          })}>เชื่อมที่พัก</button></>}
          <p>รอซิงก์ {queue.filter(item => item.status === 'pending').length} · กำลังซิงก์ {queue.filter(item => item.status === 'syncing').length} · ซิงก์สำเร็จ {queue.filter(item => item.status === 'synced').length} · มีข้อขัดแย้ง {queue.filter(item => item.status === 'conflict').length} · ซิงก์ไม่สำเร็จ {queue.filter(item => item.status === 'failed').length}</p>
          <button disabled={saving || !online || !link} onClick={() => void commit(() => syncNow(workspace.id, async operation => {
            if (!link) throw new Error('ต้องเชื่อมที่พักก่อนซิงก์')
            const checked = await fetch('/api/v2/sync/properties', { credentials: 'same-origin' })
            if (!checked.ok) throw new Error('กรุณาเข้าสู่ระบบ Staging')
            const current = await checked.json()
            if (current.accountId !== link.accountId || !current.properties.some((property: { id: string }) => property.id === link.serverPropertyId)) throw new Error('ไม่มีสิทธิ์ในที่พักที่เชื่อมไว้')
            const response = await fetch('/api/v2/sync', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...operation, propertyId: link.serverPropertyId }) })
            if (response.status >= 500) throw new Error('บริการซิงก์ยังไม่พร้อม')
            const result = await response.json()
            if (!['accepted', 'duplicate', 'conflict', 'rejected'].includes(result.result)) throw new Error('ผลตอบกลับไม่ถูกต้อง')
            return result
          }))}>ซิงก์ตอนนี้</button>{' '}
          <button onClick={() => setShowQueue(!showQueue)}>ดูรายการรอซิงก์</button>{' '}
          <button onClick={() => setShowConflicts(!showConflicts)}>ดูข้อขัดแย้ง</button>
          {showQueue && <ul>{queue.filter(item => item.status !== 'synced' && item.status !== 'conflict').map(item => <li key={item.operationId}>{item.entityType} · {item.status} · {item.error}</li>)}</ul>}
          {showConflicts && <ul>{queue.filter(item => item.status === 'conflict').map(item => <li key={item.operationId}>{item.entityType} · ข้อมูลในเครื่องและ Server แตกต่างกัน กรุณาตรวจสอบก่อนดำเนินการต่อ <button onClick={() => void commit(() => resolveSyncConflict(workspace.id, item.operationId, 'keep_local'))}>เก็บข้อมูลในเครื่อง</button> <button onClick={() => void commit(() => resolveSyncConflict(workspace.id, item.operationId, 'use_server'))}>ใช้ข้อมูลจาก Server</button> <button onClick={() => void commit(() => resolveSyncConflict(workspace.id, item.operationId, 'cancel'))}>ยกเลิกการซิงก์</button></li>)}</ul>}
        </section>
        <section className="card section"><h2>ห้องพัก</h2>
          <form onSubmit={event => { event.preventDefault(); void commit(async () => { await saveRoom(workspace.id, roomName, editingRoom ?? undefined); setRoomName(''); setEditingRoom(null) }) }}>
            <label>ชื่อห้อง <input required value={roomName} onChange={event => setRoomName(event.target.value)} /></label>
            <button disabled={saving}>{editingRoom ? 'บันทึกการแก้ไข' : 'เพิ่มห้อง'}</button>
          </form>
          {rooms.length === 0 ? <p className="muted">ยังไม่มีห้องพักในเครื่อง</p> : <ul>{rooms.map(room => <li key={room.id}>{room.name} · บันทึกในเครื่อง <button disabled={saving} onClick={() => { setEditingRoom(room); setRoomName(room.name) }}>แก้ไข</button> <button disabled={saving} onClick={() => void commit(() => removeRoom(workspace.id, room))}>ลบ</button></li>)}</ul>}
        </section>
        <section className="card section"><h2>มิเตอร์น้ำและไฟ</h2>
          <form onSubmit={event => { event.preventDefault(); void commit(async () => { await saveMeter(workspace.id, unitId, meterType, reading === '' ? NaN : Number(reading), readOn, editingMeter ?? undefined); setReading(''); setEditingMeter(null) }) }}>
            <label>ห้อง <select required value={unitId} onChange={event => setUnitId(event.target.value)}><option value="">เลือกห้อง</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
            <label>ประเภท <select value={meterType} onChange={event => setMeterType(event.target.value as 'water' | 'electric')}><option value="water">น้ำ</option><option value="electric">ไฟ</option></select></label>
            <label>เลขมิเตอร์ <input required type="number" min="0" step="any" value={reading} onChange={event => setReading(event.target.value)} /></label>
            <label>วันที่อ่าน <input required type="date" value={readOn} onChange={event => setReadOn(event.target.value)} /></label>
            <button disabled={saving || rooms.length === 0}>{editingMeter ? 'บันทึกการแก้ไข' : 'บันทึกมิเตอร์'}</button>
          </form>
          {meters.length === 0 ? <p className="muted">ยังไม่มีข้อมูลมิเตอร์ในเครื่อง</p> : <ul>{meters.map(meter => <li key={meter.id}>{rooms.find(room => room.id === meter.unitId)?.name ?? 'ห้องที่ถูกลบ'} · {meter.meter === 'water' ? 'น้ำ' : 'ไฟ'} {meter.reading} · {meter.readOn} · บันทึกในเครื่อง <button disabled={saving} onClick={() => { setEditingMeter(meter); setUnitId(meter.unitId); setMeterType(meter.meter as 'water' | 'electric'); setReading(String(meter.reading)); setReadOn(meter.readOn) }}>แก้ไข</button></li>)}</ul>}
        </section>
        <section className="card section"><h2>บิลรายเดือนในเครื่อง</h2><p className="muted">รายการเหล่านี้เป็น Draft ยังไม่ได้ส่งให้ผู้เช่าและยังไม่รับชำระเงินจริง</p>
          <form onSubmit={event => { event.preventDefault(); void commit(async () => { await saveBillDraft(workspace.id, billUnit, period, description, amount === '' ? NaN : Math.round(Number(amount) * 100), editingBill ?? undefined); setDescription(''); setAmount(''); setEditingBill(null) }) }}>
            <label>ห้อง <select required value={billUnit} onChange={event => setBillUnit(event.target.value)}><option value="">เลือกห้อง</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
            <label>รอบบิล <input required type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>
            <label>รายการ <input required value={description} onChange={event => setDescription(event.target.value)} /></label>
            <label>จำนวนเงิน (บาท) <input required type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
            <button disabled={saving || rooms.length === 0}>{editingBill ? 'บันทึก Draft' : 'สร้าง Draft'}</button>
          </form>
          {bills.length === 0 ? <p className="muted">ยังไม่มีบิลในเครื่อง</p> : <ul>{bills.map(bill => <li key={bill.id}>{rooms.find(room => room.id === bill.unitId)?.name ?? 'ห้องที่ถูกลบ'} · {bill.period} · {billDescriptions[bill.id]} · {(bill.totalMinor / 100).toFixed(2)} บาท · Draft บันทึกในเครื่อง <button disabled={saving} onClick={() => { setEditingBill(bill); setBillUnit(bill.unitId); setPeriod(bill.period); setDescription(billDescriptions[bill.id] ?? ''); setAmount((bill.totalMinor / 100).toFixed(2)) }}>แก้ไข</button></li>)}</ul>}
        </section>
      </>}
  </main>
}
