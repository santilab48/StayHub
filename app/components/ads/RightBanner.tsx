import AdFrame from './AdFrame'
export default function RightBanner({live=false,url,onFailed}:{live?:boolean;url?:string;onFailed?:(kind:'content'|'right'|'bottom')=>void}){return <AdFrame title="โฆษณาด้านขวา" kind="right" width={300} height={250} live={live} url={url} onFailed={onFailed}/>}
