export const stayhubRoutes = {
  public:{home:'/',tenantEntry:(s:string)=>`/t/${s}`,blocked:(s:string)=>`/t/${s}/blocked`},
  resident:{
    home:(s:string)=>`/t/${s}/app`,
    room:(s:string)=>`/t/${s}/app/room`,
    roomProfile:(s:string)=>`/t/${s}/app/room/profile`,
    contract:(s:string)=>`/t/${s}/app/room/contract`,
    occupants:(s:string)=>`/t/${s}/app/room/occupants`,
    vehicles:(s:string)=>`/t/${s}/app/room/vehicles`,
    documents:(s:string)=>`/t/${s}/app/room/documents`,
    billing:(s:string)=>`/t/${s}/app/billing`,
    repairs:(s:string)=>`/t/${s}/app/repair`,
    services:(s:string)=>`/t/${s}/app/services`,
    news:(s:string)=>`/t/${s}/app/news`
  },
  admin:{home:(s:string)=>`/t/${s}/admin`,rooms:(s:string)=>`/t/${s}/admin/rooms`,tenants:(s:string)=>`/t/${s}/admin/tenants`,contracts:(s:string)=>`/t/${s}/admin/contracts`,finance:(s:string)=>`/t/${s}/admin/finance`,meters:(s:string)=>`/t/${s}/admin/meters`,repairs:(s:string)=>`/t/${s}/admin/repairs`,parcels:(s:string)=>`/t/${s}/admin/parcels`,rides:(s:string)=>`/t/${s}/admin/rides`,news:(s:string)=>`/t/${s}/admin/news`,reports:(s:string)=>`/t/${s}/admin/reports`,settings:(s:string)=>`/t/${s}/admin/settings`},
  platform:{home:'/platform',oas:'/platform/oas',billing:'/platform/billing',reports:'/platform/reports',settings:'/platform/settings',tenant:(id:string)=>`/platform/oas/${id}`}
} as const

export function tenantRoutes(s:string){return {
  home:stayhubRoutes.resident.home(s),
  room:stayhubRoutes.resident.room(s),
  roomProfile:stayhubRoutes.resident.roomProfile(s),
  contract:stayhubRoutes.resident.contract(s),
  occupants:stayhubRoutes.resident.occupants(s),
  vehicles:stayhubRoutes.resident.vehicles(s),
  documents:stayhubRoutes.resident.documents(s),
  billing:stayhubRoutes.resident.billing(s),
  repair:stayhubRoutes.resident.repairs(s),
  services:stayhubRoutes.resident.services(s),
  news:stayhubRoutes.resident.news(s),
  admin:stayhubRoutes.admin.home(s),adminRooms:stayhubRoutes.admin.rooms(s),adminTenants:stayhubRoutes.admin.tenants(s),adminContracts:stayhubRoutes.admin.contracts(s),adminFinance:stayhubRoutes.admin.finance(s),adminMeters:stayhubRoutes.admin.meters(s),adminRepairs:stayhubRoutes.admin.repairs(s),adminParcels:stayhubRoutes.admin.parcels(s),adminRides:stayhubRoutes.admin.rides(s),adminNews:stayhubRoutes.admin.news(s),adminReports:stayhubRoutes.admin.reports(s),adminSettings:stayhubRoutes.admin.settings(s)
}}
