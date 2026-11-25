import AdFrame from './AdFrame'
export default function ContentBanner({live=false,onFailed}:{live?:boolean;onFailed?:(kind:'content'|'right'|'bottom')=>void}){return <AdFrame title="โฆษณาด้านซ้าย" kind="content" width={300} height={250} live={live} onFailed={onFailed}/>}
