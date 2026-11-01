-- V4: delivery priced by distance from the restaurant instead of fixed districts.
-- The restaurant has one location; each address carries a map position; the fee grows with the distance.
-- (District names no longer exist as a unit after the 2025 administrative merger, so they are not modelled at all.)

-- Restaurant location and the pricing rules (all editable by the manager).
alter table store_settings add column latitude  numeric(9,6);
alter table store_settings add column longitude numeric(9,6);
alter table store_settings add column delivery_base_km          numeric(4,1)  not null default 5;      -- radius covered by the base fee
alter table store_settings add column delivery_base_fee         numeric(12,2) not null default 15000;  -- fee inside that radius
alter table store_settings add column delivery_extra_fee_per_km numeric(12,2) not null default 5000;   -- per started km beyond it
alter table store_settings add column delivery_max_km           numeric(4,1)  not null default 15;     -- farther than this is not delivered
alter table store_settings add column prep_minutes   integer not null default 15;                      -- kitchen time in the delivery estimate
alter table store_settings add column minutes_per_km integer not null default 4;                       -- travel time in the delivery estimate
alter table store_settings add constraint ck_store_settings_location
    check ((latitude is null) = (longitude is null) and (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180)));
alter table store_settings add constraint ck_store_settings_delivery
    check (delivery_base_km > 0 and delivery_max_km >= delivery_base_km and delivery_base_fee >= 0 and delivery_extra_fee_per_km >= 0
           and prep_minutes between 0 and 240 and minutes_per_km between 1 and 30);
update store_settings
   set store_address = 'Trường Đại học CMC - Cơ sở 2, Vạn Phúc Building, P. Tố Hữu, Hà Đông, Hà Nội',
       latitude = 20.983310, longitude = 105.772724;

-- A customer address is a street line plus a position (null only for addresses saved before this version:
-- the app asks the customer to set the position before ordering).
alter table addresses add column latitude  numeric(9,6);
alter table addresses add column longitude numeric(9,6);
alter table addresses add constraint ck_addresses_location
    check ((latitude is null) = (longitude is null) and (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180)));
alter table addresses drop column zone_id;

-- An order keeps the distance and the delivery estimate of the moment it was placed.
alter table orders add column distance_km        numeric(5,1) not null default 0;
alter table orders add column estimated_minutes  integer      not null default 30;
alter table orders add constraint ck_orders_distance check (distance_km >= 0 and estimated_minutes > 0);
alter table orders drop column zone_id;

drop table delivery_zones;
