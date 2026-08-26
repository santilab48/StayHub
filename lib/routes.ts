export const stayhubRoutes = {
  public:{home:'/',tenantEntry:(s:string)=>`/t/${s}`,blocked:(s:string)=>`/t/${s}/blocked`},
  access:{
    home:(s:string)=>`/t/${s}/access`,
    myKey:(s:string)=>`/t/${s}/access/my-key`
  },
  resident:{
    home:(s:string)=>`/t/${s}/app`,
    room:(s:string)=>`/t/${s}/app/room`,
    contract:(s:string)=>`/t/${s}/app/room/contract`,
    occupants:(s:string)=>`/t/${s}/app/room/occupants`,
    vehicles:(s:string)=>`/t/${s}/app/room/vehicles`,
    documents:(s:string)=>`/t/${s}/app/room/documents`,
    billing:(s:string)=>`/t/${s}/app/billing`,
    billingCurrent:(s:string)=>`/t/${s}/app/billing/current`,
    billingInvoice:(s:string,id:string)=>`/t/${s}/app/billing/invoices/${id}`,
    billingPay:(s:string)=>`/t/${s}/app/billing/pay`,
    billingHistory:(s:string)=>`/t/${s}/app/billing/history`,
    billingReceipts:(s:string)=>`/t/${s}/app/billing/receipts`,
    repairs:(s:string)=>`/t/${s}/app/repair`,
    services:(s:string)=>`/t/${s}/app/services`,
    news:(s:string)=>`/t/${s}/app/news`
  },
  admin:{
    home:(s:string)=>`/t/${s}/admin`,
    rooms:(s:string)=>`/t/${s}/admin/rooms`,
    roomSource:(s:string)=>`/t/${s}/admin/rooms/my-room-source`,
    roomOccupancy:(s:string)=>`/t/${s}/admin/rooms/occupancy`,
    roomVehicles:(s:string)=>`/t/${s}/admin/rooms/vehicles`,
    roomDocuments:(s:string)=>`/t/${s}/admin/rooms/documents`,
    tenants:(s:string)=>`/t/${s}/admin/tenants`,contracts:(s:string)=>`/t/${s}/admin/contracts`,finance:(s:string)=>`/t/${s}/admin/finance`,
    financeInvoices:(s:string)=>`/t/${s}/admin/finance/invoices`,
    financePayments:(s:string)=>`/t/${s}/admin/finance/payments`,
    financeReceipts:(s:string)=>`/t/${s}/admin/finance/receipts`,
    financeSettings:(s:string)=>`/t/${s}/admin/finance/settings`,
    financeBillDesigner:(s:string)=>`/t/${s}/admin/finance/bill-designer`,
    meters:(s:string)=>`/t/${s}/admin/meters`,repairs:(s:string)=>`/t/${s}/admin/repairs`,parcels:(s:string)=>`/t/${s}/admin/parcels`,rides:(s:string)=>`/t/${s}/admin/rides`,news:(s:string)=>`/t/${s}/admin/news`,reports:(s:string)=>`/t/${s}/admin/reports`,settings:(s:string)=>`/t/${s}/admin/settings`,
    access:(s:string)=>`/t/${s}/admin/access`,accessIssue:(s:string)=>`/t/${s}/admin/access/issue`,accessHolders:(s:string)=>`/t/${s}/admin/access/holders`,accessZones:(s:string)=>`/t/${s}/admin/access/zones`,accessReaders:(s:string)=>`/t/${s}/admin/access/readers`,accessCredentials:(s:string)=>`/t/${s}/admin/access/credentials`,accessLogs:(s:string)=>`/t/${s}/admin/access/logs`,accessProducts:(s:string)=>`/t/${s}/admin/access/products`,accessProvider:(s:string)=>`/t/${s}/admin/access/provider`
  },
  platform:{home:'/platform',oas:'/platform/oas',billing:'/platform/billing',reports:'/platform/reports',settings:'/platform/settings',tenant:(id:string)=>`/platform/oas/${id}`}
} as const

export function tenantRoutes(s:string){return {
  home:stayhubRoutes.resident.home(s),room:stayhubRoutes.resident.room(s),contract:stayhubRoutes.resident.contract(s),occupants:stayhubRoutes.resident.occupants(s),vehicles:stayhubRoutes.resident.vehicles(s),documents:stayhubRoutes.resident.documents(s),billing:stayhubRoutes.resident.billing(s),billingCurrent:stayhubRoutes.resident.billingCurrent(s),billingInvoice:(id:string)=>stayhubRoutes.resident.billingInvoice(s,id),billingPay:stayhubRoutes.resident.billingPay(s),billingHistory:stayhubRoutes.resident.billingHistory(s),billingReceipts:stayhubRoutes.resident.billingReceipts(s),repair:stayhubRoutes.resident.repairs(s),services:stayhubRoutes.resident.services(s),news:stayhubRoutes.resident.news(s),
  access:stayhubRoutes.access.home(s),myAccessKey:stayhubRoutes.access.myKey(s),
  admin:stayhubRoutes.admin.home(s),adminRooms:stayhubRoutes.admin.rooms(s),adminRoomSource:stayhubRoutes.admin.roomSource(s),adminRoomOccupancy:stayhubRoutes.admin.roomOccupancy(s),adminRoomVehicles:stayhubRoutes.admin.roomVehicles(s),adminRoomDocuments:stayhubRoutes.admin.roomDocuments(s),adminTenants:stayhubRoutes.admin.tenants(s),adminContracts:stayhubRoutes.admin.contracts(s),adminFinance:stayhubRoutes.admin.finance(s),adminFinanceInvoices:stayhubRoutes.admin.financeInvoices(s),adminFinancePayments:stayhubRoutes.admin.financePayments(s),adminFinanceReceipts:stayhubRoutes.admin.financeReceipts(s),adminFinanceSettings:stayhubRoutes.admin.financeSettings(s),adminFinanceBillDesigner:stayhubRoutes.admin.financeBillDesigner(s),adminMeters:stayhubRoutes.admin.meters(s),adminRepairs:stayhubRoutes.admin.repairs(s),adminParcels:stayhubRoutes.admin.parcels(s),adminRides:stayhubRoutes.admin.rides(s),adminNews:stayhubRoutes.admin.news(s),adminReports:stayhubRoutes.admin.reports(s),adminSettings:stayhubRoutes.admin.settings(s),
  adminAccess:stayhubRoutes.admin.access(s),adminAccessIssue:stayhubRoutes.admin.accessIssue(s),adminAccessHolders:stayhubRoutes.admin.accessHolders(s),adminAccessZones:stayhubRoutes.admin.accessZones(s),adminAccessReaders:stayhubRoutes.admin.accessReaders(s),adminAccessCredentials:stayhubRoutes.admin.accessCredentials(s),adminAccessLogs:stayhubRoutes.admin.accessLogs(s),adminAccessProducts:stayhubRoutes.admin.accessProducts(s),adminAccessProvider:stayhubRoutes.admin.accessProvider(s)
}}
