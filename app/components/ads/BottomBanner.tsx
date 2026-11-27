import AdFrame from './AdFrame'
export default function BottomBanner({live=false,url,allowedHosts,onFailed}:{live?:boolean;url?:string;allowedHosts?:readonly string[];onFailed?:(kind:'content'|'right'|'bottom')=>void}){return <AdFrame title="โฆษณาด้านล่าง" kind="bottom" width={300} height={250} live={live} url={url} allowedHosts={allowedHosts} onFailed={onFailed}/>}
