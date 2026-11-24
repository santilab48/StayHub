'use client'
import GuesthouseDashboard from '../../cloud/guesthouse-dashboard'
export default function Preview(){
 return <GuesthouseDashboard property={{id:'preview',name:'Guesthouse — ตัวอย่าง',property_type:'guesthouse',role:'owner'}} onLogout={()=>{}} logoutBusy={false} logoutError="" preview/>
}
