import AdFrame from './AdFrame'
export default function BottomBanner({live=false,url,onFailed}:{live?:boolean;url?:string;onFailed?:(kind:'content'|'right'|'bottom')=>void}){return <AdFrame title="โฆษณาด้านล่าง" kind="bottom" width={300} height={250} live={live} url={url} onFailed={onFailed}/>}
