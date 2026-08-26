export const tenantModules={room:['profiles','rooms','leases','vehicles'],billing:['invoices','invoice_items','payments','payment_receipts','meter_readings'],repair:['maintenance_tickets','maintenance_events','ticket_images'],services:['parcels','drivers','ride_requests'],news:['announcements']} as const
export const privateBuckets={contracts:'stayhub-contracts',payments:'stayhub-payments',meters:'stayhub-meters',maintenance:'stayhub-maintenance',parcels:'stayhub-parcels'} as const
export const repairStatus=['submitted','accepted','scheduled','in_progress','completed','cancelled'] as const
export const rideStatus=['requested','accepted','on_the_way','arrived','completed','cancelled'] as const
