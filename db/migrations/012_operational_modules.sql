-- StayHub operational modules. Server-only and property-scoped; no public grants.
-- Runner owns transaction and checksum ledger.
CREATE TABLE IF NOT EXISTS stayhub.property_settings(
 property_id uuid PRIMARY KEY REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 water_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK(water_rate>=0),
 electric_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK(electric_rate>=0),
 due_day integer NOT NULL DEFAULT 5 CHECK(due_day BETWEEN 1 AND 28),
 late_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK(late_fee>=0),
 updated_by uuid REFERENCES stayhub.accounts(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stayhub.announcements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 unit_id uuid,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 4000),
 pinned boolean NOT NULL DEFAULT false,
 archived_at timestamptz,
 expires_at timestamptz,
 created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id,id),
 CONSTRAINT announcement_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS announcements_scope ON stayhub.announcements(property_id,created_at DESC);
CREATE TABLE IF NOT EXISTS stayhub.parcels(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 unit_id uuid NOT NULL,
 carrier text NOT NULL CHECK(length(trim(carrier)) BETWEEN 1 AND 100),
 tracking text NOT NULL DEFAULT '' CHECK(length(tracking)<=160),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','picked_up','returned')),
 received_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 updated_by uuid REFERENCES stayhub.accounts(id),
 UNIQUE(property_id,id),
 CONSTRAINT parcel_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS parcels_property ON stayhub.parcels(property_id,received_at DESC);
CREATE TABLE IF NOT EXISTS stayhub.vehicles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 unit_id uuid NOT NULL,
 plate text NOT NULL CHECK(length(trim(plate)) BETWEEN 2 AND 30),
 vehicle_type text NOT NULL CHECK(length(trim(vehicle_type)) BETWEEN 1 AND 60),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),
 created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 reviewed_by uuid REFERENCES stayhub.accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id,id),
 CONSTRAINT vehicle_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS vehicles_property ON stayhub.vehicles(property_id,unit_id,created_at DESC);
CREATE TABLE IF NOT EXISTS stayhub.drivers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 phone text NOT NULL CHECK(length(trim(phone)) BETWEEN 5 AND 30),
 vehicle_type text NOT NULL CHECK(length(trim(vehicle_type)) BETWEEN 1 AND 60),
 active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id,id)
);
CREATE TABLE IF NOT EXISTS stayhub.ride_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 driver_id uuid,
 unit_id uuid NOT NULL,
 account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=500),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','on_the_way','arrived','completed','cancelled')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id,id),
 CONSTRAINT ride_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id),
 CONSTRAINT ride_driver_scope FOREIGN KEY(property_id,driver_id) REFERENCES stayhub.drivers(property_id,id)
);
CREATE INDEX IF NOT EXISTS rides_property ON stayhub.ride_requests(property_id,requested_at DESC);
CREATE TABLE IF NOT EXISTS stayhub.room_documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 unit_id uuid NOT NULL,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
 description text NOT NULL CHECK(length(description)<=4000),
 created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id,id),
 CONSTRAINT room_document_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS documents_property ON stayhub.room_documents(property_id,unit_id,created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
