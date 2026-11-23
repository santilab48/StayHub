'use client'
import {useRouter} from 'next/navigation'
import {accommodationTypes,type AccommodationType} from '../lib/accommodation-types'
const choices:{id:AccommodationType;icon:string;description:string}[]=[
 {id:'apartment',icon:'🏢',description:'หอพัก ห้องเช่า และอพาร์ตเมนต์รายเดือน'},
 {id:'guesthouse',icon:'🛎️',description:'เกสต์เฮาส์และที่พักขนาดเล็ก'},
 {id:'daily',icon:'🛏️',description:'ห้องพักรายวันและที่พักระยะสั้น'},
 {id:'homestay',icon:'🏡',description:'บ้านพักส่วนตัวและโฮมสเตย์'}
]
export default function Home(){
 const router=useRouter()
 return <main className="welcomePage">
  <header className="welcomeHeader">
   <div className="welcomeBrand"><span className="welcomeBrandMark">S</span><span>StayHub</span></div>
   <a className="welcomeLogin" href="/cloud?login=1">มีบัญชีแล้ว? เข้าสู่ระบบ</a>
  </header>
  <section className="welcomeBody" aria-labelledby="welcomeTitle">
   <div className="welcomeIntro"><span className="welcomeEyebrow">เริ่มต้นใช้งาน STAYHUB</span>
    <h1 id="welcomeTitle">เลือกประเภทที่พักของคุณ</h1>
    <p>เลือกหนึ่งประเภทเพื่อเริ่มสมัครสมาชิกก่อนเข้าสู่ระบบจัดการที่พัก</p></div>
   <div className="welcomeGrid">
    {choices.map(choice=><button type="button" key={choice.id} className="welcomeChoice"
     onClick={()=>router.push('/cloud?type='+encodeURIComponent(choice.id))}>
     <span className="welcomeChoiceIcon" aria-hidden="true">{choice.icon}</span>
     <span className="welcomeChoiceCopy"><strong>{accommodationTypes[choice.id].label}</strong><small>{choice.description}</small></span>
     <span className="welcomeChoiceArrow" aria-hidden="true">↗</span>
    </button>)}
   </div>
  </section>
  <footer className="welcomeFooter">เลือกประเภท → สมัครสมาชิก → ตั้งค่าที่พัก</footer>
 </main>
}
