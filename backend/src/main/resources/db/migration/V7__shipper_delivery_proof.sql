-- V7: shippers. A SHIPPER account claims a READY order (orders.shipper_id) and can only mark it delivered with a photo
-- taken at the door (delivery_proofs, one per order). Orders delivered before V7 keep shipper_id null and have no photo.
alter table users drop constraint ck_users_role;
alter table users add constraint ck_users_role check (role in ('CUSTOMER','STAFF','KITCHEN','MANAGER','SHIPPER'));

alter table orders add column shipper_id bigint;
alter table orders add constraint fk_orders_shipper foreign key (shipper_id) references users (id);
create index ix_orders_shipper on orders (shipper_id, status);

create table delivery_proofs (
    order_id     bigint       primary key,
    photo        bytea        not null,
    content_type varchar(20)  not null,
    taken_at     timestamp(6) not null,
    constraint fk_delivery_proofs_order foreign key (order_id) references orders (id) on delete cascade,
    constraint ck_delivery_proofs_type check (content_type in ('image/jpeg','image/png','image/webp')),
    constraint ck_delivery_proofs_size check (octet_length(photo) between 1 and 716800)
);
