alter table apps add column form_factor text check (form_factor in ('mobile', 'desktop'));
