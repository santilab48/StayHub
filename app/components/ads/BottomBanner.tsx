import AdFrame from './AdFrame'
export default function BottomBanner({live=false,onFailed}:{live?:boolean;onFailed?:(kind:'content'|'right'|'bottom')=>void}){return <AdFrame title="โฆษณาด้านล่าง" kind="bottom" width={300} height={100} live={live} onFailed={onFailed}/>}
