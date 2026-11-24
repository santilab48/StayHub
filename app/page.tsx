import {accommodationTypes,type AccommodationType} from '../lib/accommodation-types'

const choices:{id:AccommodationType;icon:string}[]=[
 {id:'apartment',icon:'🏢'},
 {id:'guesthouse',icon:'🛎️'},
 {id:'daily',icon:'🛏️'},
 {id:'homestay',icon:'🏡'}
]

export default function Home(){
 return <main className="floatingHome" aria-label="เลือกประเภทที่พัก">
  <nav className="floatingHomeGrid" aria-label="ประเภทที่พักทั้ง 4 แบบ">
   {choices.map((choice,index)=><a
    key={choice.id}
    href={'/cloud?type='+encodeURIComponent(choice.id)}
    className={'floatingHomeButton floatingHomeButton'+(index+1)}
    aria-label={'เลือก'+accommodationTypes[choice.id].label}>
    <span className="floatingHomeIcon" aria-hidden="true">{choice.icon}</span>
    <span className="floatingHomeLabel">{accommodationTypes[choice.id].label}</span>
    <span className="floatingHomeArrow" aria-hidden="true">↗</span>
   </a>)}
  </nav>
 </main>
}
