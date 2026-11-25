import AdFrame from './AdFrame'
export default function ContentBanner({live=false,url,onFailed}:{live?:boolean;url?:string;onFailed?:(kind:'content'|'right'|'bottom')=>void}){return <AdFrame title="โฆษณาด้านซ้าย" kind="content" width={300} height={250} live={live} url={url} onFailed={onFailed}/>}
