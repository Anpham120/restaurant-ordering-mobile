-- V6: two ready-made campaigns for a store that runs without demo data (production), so the home-screen banner and the
-- promotion pop-up have something to show from day one. Each is added only when what it links to exists (the
-- WELCOME10 voucher, the "Đồ uống" category) and no campaign with the same title is there yet. A fresh database has
-- neither at this point (the demo seeder runs later), so nothing is added twice. The manager can edit or delete them.
insert into promotions (title, subtitle, image_url, target_type, voucher_id, sort_order, is_active, created_at)
select 'Giảm 10% đơn đầu tiên', 'Nhập mã WELCOME10 – giảm tối đa 30.000đ cho đơn từ 100.000đ',
       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bowl_of_Meatball_pho.jpg/500px-Bowl_of_Meatball_pho.jpg',
       'VOUCHER', v.id, 1, true, localtimestamp
from vouchers v
where v.code = 'WELCOME10' and v.is_active
  and not exists (select 1 from promotions p where p.title = 'Giảm 10% đơn đầu tiên');

insert into promotions (title, subtitle, image_url, target_type, category_id, sort_order, is_active, created_at)
select 'Đồ uống mát lạnh giao tận nơi', 'Cà phê sữa đá, trà sữa trân châu, nước cam ép – đặt kèm bữa trưa cho cả nhóm',
       'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Bubble_Tea.png/500px-Bubble_Tea.png',
       'CATEGORY', c.id, 2, true, localtimestamp
from categories c
where c.name = 'Đồ uống'
  and not exists (select 1 from promotions p where p.title = 'Đồ uống mát lạnh giao tận nơi');
