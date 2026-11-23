import {redirect} from 'next/navigation'
// NFC hardware provisioning is not supported by Cloud. Hide prototype controls.
export default function LegacyAccessLayout(){redirect('/my')}
