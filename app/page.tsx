import {accommodationTypes,type AccommodationType} from '../lib/accommodation-types'

const choices:AccommodationType[]=['apartment','guesthouse','daily','homestay']

function StayTypeIcon({type}:{type:AccommodationType}){
 const common={fill:'none',stroke:'currentColor',strokeWidth:1.65,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
 return <svg aria-hidden="true" viewBox="0 0 48 48" width="48" height="48" {...common}>
  {type==='apartment' && <>
   <path d="M11 40V10a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v30M7 40h34M21 40V30h6v10"/>
   <path d="M17 15h4m6 0h4M17 22h4m6 0h4" />
  </>}
  {type==='guesthouse' && <>
   <path d="M7 35h34M11 35V16h26v19M9 16l15-9 15 9M18 35V24h12v11"/>
   <path d="M22 14h4M23 27h2" />
  </>}
  {type==='daily' && <>
   <path d="M8 37V18m0 14h32v5M8 26h32v6M16 26v-8h10a4 4 0 0 1 4 4v4M40 26v-8"/>
   <path d="M14 37v3m26-3v3"/>
  </>}
  {type==='homestay' && <>
   <path d="m6 23 18-15 18 15M11 21v19h26V21M20 40V28h8v12"/>
   <path d="M33 11c3-3 6-3 9-3 0 5-3 8-8 8" />
  </>}
 </svg>
}

export default function Home(){
 return <main className="floatingHome" aria-label="เลือกประเภทที่พัก">
  <nav className="floatingHomeGrid" aria-label="เลือกประเภทที่พัก">
   {choices.map((type,index)=><a
    key={type}
    className={'floatingHomeButton floatingHomeButton'+(index+1)}
    href={'/cloud?type='+encodeURIComponent(type)}
    aria-label={'เลือก'+accommodationTypes[type].label}>
     <span className="floatingHomeIcon"><StayTypeIcon type={type}/></span>
     <span className="floatingHomeLabel">{accommodationTypes[type].label}</span>
     <span className="floatingHomeArrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
     </span>
   </a>)}
  </nav>
 </main>
}
