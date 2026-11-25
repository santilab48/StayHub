'use client'
import GuesthouseDashboard from '../../cloud/guesthouse-dashboard'
import {accommodationLabel} from '../../../lib/accommodation-types'
export default function Preview({type='guesthouse'}:{type?:'guesthouse'|'daily'|'homestay'}){
 return <GuesthouseDashboard key={type} property={{id:type==='guesthouse'?'preview':'preview-'+type,name:accommodationLabel(type)+' — ตัวอย่าง',property_type:type,role:'owner'}} onLogout={()=>{}} logoutBusy={false} logoutError="" preview/>
}
