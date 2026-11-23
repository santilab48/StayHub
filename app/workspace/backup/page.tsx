'use client'

import { useEffect, useState } from 'react'
import { createBackup, inspectBackup, lastBackupSaved, localStorageSummary, recordBackupSaved, restoreBackup, type BackupPreview } from '../../../lib/local-db/backup'

type Summary = Awaited<ReturnType<typeof localStorageSummary>>

export default function BackupPage() {
  const [password, setPassword] = useState('')
  const [restorePassword, setRestorePassword] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [lastSaved, setLastSaved] = useState<string | undefined>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setSummary(await localStorageSummary())
    setLastSaved(await lastBackupSaved())
  }
  useEffect(() => { void refresh().catch(failure => setError(String(failure))) }, [])
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try { await action() } catch (failure) { setError(failure instanceof Error ? failure.message : 'ทำรายการไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  async function download() {
    const result = await createBackup(password)
    if ('showSaveFilePicker' in window) {
      const picker = window.showSaveFilePicker as (options: object) => Promise<FileSystemFileHandle>
      const handle = await picker({ suggestedName: result.filename, types: [{ description: 'StayHub backup', accept: { 'application/octet-stream': ['.shbackup'] } }] })
      const writer = await handle.createWritable()
      await writer.write(result.blob)
      await writer.close()
      await recordBackupSaved()
      setMessage(`บันทึกไฟล์ ${result.filename} แล้ว · ${result.preview.createdAt}`)
    } else {
      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.filename
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setMessage(`เริ่มดาวน์โหลด ${result.filename} แล้ว โปรดตรวจว่าไฟล์ถูกบันทึกในเครื่อง`)
    }
    await refresh()
  }
  return <main className="wrap" style={{ maxWidth: 760 }}>
    <a href="/workspace">← พื้นที่ใช้งาน</a>
    <h1>ข้อมูลและการสำรอง</h1>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {lastSaved && Date.now() - Date.parse(lastSaved) > 7 * 86400_000 && <p role="status">คุณไม่ได้สำรองข้อมูลมานานกว่า 7 วัน แนะนำให้บันทึกไฟล์สำรองไว้ในที่ปลอดภัย</p>}
    <section className="card section"><h2>สำรองข้อมูลลงเครื่อง</h2>
      <label>รหัสสำหรับไฟล์สำรอง <input type="password" autoComplete="new-password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <p className="muted">ใช้รหัสอย่างน้อย 12 ตัวอักษร และเก็บแยกจากไฟล์สำรอง</p>
      <button disabled={busy || password.length < 12} onClick={() => void run(download)}>สำรองข้อมูลลงเครื่อง</button>
    </section>
    <section className="card section"><h2>กู้คืนข้อมูล</h2>
      <label>ไฟล์ .shbackup <input type="file" accept=".shbackup" onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null) }} /></label>
      <label>รหัสไฟล์สำรอง <input type="password" value={restorePassword} onChange={event => { setRestorePassword(event.target.value); setPreview(null) }} /></label>
      <button disabled={busy || !file || !restorePassword} onClick={() => void run(async () => { setPreview(await inspectBackup(file!, restorePassword)) })}>ตรวจไฟล์และดูตัวอย่าง</button>
      {preview && <div><p>สำรองเมื่อ {preview.createdAt} · ห้อง {preview.counts.units ?? 0} · ผู้เช่า {preview.counts.residents ?? 0} · บิล {preview.counts.bills ?? 0} · รวม {preview.totalRecords} รายการ</p>
        <p>ที่พักในไฟล์ {preview.propertyIds.length} แห่ง</p>
        {preview.currentDataIsNewer && <p role="alert">ข้อมูลในเครื่องบางรายการใหม่กว่าไฟล์นี้</p>}
        <p>การกู้คืนจะแทนที่ข้อมูลในเครื่อง และต้องตรวจการเชื่อมที่พักกับ Server ใหม่ก่อนซิงก์</p>
        <button disabled={busy} onClick={() => void run(async () => {
          if (!window.confirm('ยืนยันกู้คืนและแทนที่ข้อมูลในเครื่องทั้งหมดหรือไม่')) return
          await restoreBackup(file!, restorePassword, true)
          setPreview(null)
          setMessage('กู้คืนข้อมูลในเครื่องสำเร็จ')
          await refresh()
        })}>ยืนยัน Restore</button></div>}
    </section>
    <section className="card section"><h2>ดูข้อมูลที่จัดเก็บ</h2>
      <button disabled={busy} onClick={() => void run(refresh)}>อัปเดตจำนวนข้อมูล</button>
      {summary && <p>ห้อง {summary.counts.units ?? 0} · ผู้เช่า {summary.counts.residents ?? 0} · บิล {summary.counts.bills ?? 0} · รอซิงก์ {summary.pendingSync} · ประมาณ {(summary.approximateBytes / 1024).toFixed(1)} KB</p>}
    </section>
  </main>
}
