-- ============================================================================
-- PORRA MUNDIAL 2026 — SCORING ENGINE
-- Run this in Supabase → SQL Editor. Re-runnable (replaces the function).
-- Call it anytime after entering results:  select recalculate_all_scores();
-- (the admin "Recalcular puntuaciones" button calls it for you)
--
-- Scoring (cumulative):
--   Group match:  1X2 +1 · goal-diff +2 · exact +3   (max 6)
--   Group standings: +5 per correct final position (only once a group is complete)
--   KO qualified team: R32 +4 · R16 +6 · QF +8 · SF +10 · Final +12
--   KO match score (only if the matchup teams are right): R32 2/3/4 · R16 3/4/5 · QF 4/5/6 · SF 5/6/7 · Final 10/15/20
--   Champion +35 · Runner-up +20 · Bota de Oro +10 · Balón de Oro +10
-- Real Bota/Balón winners live in settings (keys real_bota / real_balon),
-- set from the admin panel. Champion/runner-up come from the real Final result.
-- ============================================================================

insert into settings (key, value) values ('real_bota',''), ('real_balon',''), ('real_champion',''), ('real_runnerup','')
on conflict (key) do nothing;
alter table scores add column if not exists prev_rank int;

-- ── Eliminatorias: ganador de cruce (con penaltis) + avance de bracket ──
create or replace function ko_winner_of(p text, idx int)
returns text language plpgsql stable security definer set search_path=public as $kw$
declare m record;
begin
  select * into m from public.matches where id = p||'_'||idx;
  if not found or m.real_home is null or m.real_away is null then return null; end if;
  if    m.real_home > m.real_away then return m.home_team;
  elsif m.real_away > m.real_home then return m.away_team;
  else  return nullif(m.ko_winner,'');
  end if;
end$kw$;

create or replace function advance_bracket()
returns void language plpgsql security definer set search_path=public as $ab$
declare rounds text[] := array['r32','r16','qf','sf','final']; ri int; cur text; nxt text; k int; n_next int;
begin
  for ri in 1..4 loop
    cur := rounds[ri]; nxt := rounds[ri+1];
    n_next := case nxt when 'r16' then 8 when 'qf' then 4 when 'sf' then 2 else 1 end;
    for k in 0..(n_next-1) loop
      update public.matches set home_team=ko_winner_of(cur,2*k), away_team=ko_winner_of(cur,2*k+1)
       where id = nxt||'_'||k;
    end loop;
  end loop;
end$ab$;

create or replace function recalculate_all_scores() returns void language plpgsql
security definer set search_path = public as $$
declare
  u record;
  v_grp int; v_exact int; v_stand int;
  v_r32 int; v_r16 int; v_qf int; v_sf int; v_fin int; v_hon int; v_total int;
  real_bota text; real_balon text; champ text; runnerup text; champ_ovr text; runner_ovr text;
begin
  perform advance_bracket();
  select nullif(value,'') into real_bota  from settings where key='real_bota';
  select nullif(value,'') into real_balon from settings where key='real_balon';
  select case when real_home>real_away then home_team when real_away>real_home then away_team else nullif(ko_winner,'') end,
         case when real_home>real_away then away_team when real_away>real_home then home_team when nullif(ko_winner,'') is null then null when ko_winner=home_team then away_team else home_team end
    into champ, runnerup
  from matches where phase='final' and real_home is not null order by id limit 1;
  -- manual override from admin (Premios reales), if provided
  select nullif(value,'') into champ_ovr  from settings where key='real_champion';
  select nullif(value,'') into runner_ovr from settings where key='real_runnerup';
  if champ_ovr  is not null then champ    := champ_ovr;  end if;
  if runner_ovr is not null then runnerup := runner_ovr; end if;

  -- snapshot previous standing so the leaderboard can show movement
  update scores set prev_rank = rank where true;

  for u in select id from users loop
    v_grp:=0; v_exact:=0; v_stand:=0; v_r32:=0; v_r16:=0; v_qf:=0; v_sf:=0; v_fin:=0; v_hon:=0;

    select
      coalesce(sum(
          (case when sign(p.predicted_home-p.predicted_away)=sign(m.real_home-m.real_away) then 1 else 0 end)
        + (case when (p.predicted_home-p.predicted_away)=(m.real_home-m.real_away) then 2 else 0 end)
        + (case when p.predicted_home=m.real_home and p.predicted_away=m.real_away then 3 else 0 end)),0),
      coalesce(sum(case when p.predicted_home=m.real_home and p.predicted_away=m.real_away then 1 else 0 end),0)
    into v_grp, v_exact
    from predictions p join matches m on m.id=p.match_id
    where p.user_id=u.id and m.phase='group' and m.real_home is not null;

    with complete as (
      select group_letter from matches where phase='group'
      group by group_letter having count(*)=count(real_home)
    ),
    real_rows as (
      select group_letter, home_team team, real_home gf, real_away ga,
             case when real_home>real_away then 3 when real_home=real_away then 1 else 0 end pts
        from matches where phase='group' and group_letter in (select group_letter from complete)
      union all
      select group_letter, away_team, real_away, real_home,
             case when real_away>real_home then 3 when real_home=real_away then 1 else 0 end
        from matches where phase='group' and group_letter in (select group_letter from complete)
    ),
    real_tbl as (
      select group_letter, team,
             row_number() over (partition by group_letter order by sum(pts) desc, sum(gf-ga) desc, sum(gf) desc, team) pos
        from real_rows group by group_letter, team
    ),
    pred_rows as (
      select m.group_letter, m.home_team team, p.predicted_home gf, p.predicted_away ga,
             case when p.predicted_home>p.predicted_away then 3 when p.predicted_home=p.predicted_away then 1 else 0 end pts
        from predictions p join matches m on m.id=p.match_id
       where p.user_id=u.id and m.phase='group' and m.group_letter in (select group_letter from complete)
      union all
      select m.group_letter, m.away_team, p.predicted_away, p.predicted_home,
             case when p.predicted_away>p.predicted_home then 3 when p.predicted_home=p.predicted_away then 1 else 0 end
        from predictions p join matches m on m.id=p.match_id
       where p.user_id=u.id and m.phase='group' and m.group_letter in (select group_letter from complete)
    ),
    pred_tbl as (
      select group_letter, team,
             row_number() over (partition by group_letter order by sum(pts) desc, sum(gf-ga) desc, sum(gf) desc, team) pos
        from pred_rows group by group_letter, team
    )
    select coalesce(sum(case when r.team=pp.team then 5 else 0 end),0) into v_stand
      from real_tbl r join pred_tbl pp on pp.group_letter=r.group_letter and pp.pos=r.pos;

    -- R32 qualified team +4 — AUTOMÁTICO al cerrarse cada grupo (no espera al sorteo
    -- oficial del cuadro). Un equipo está clasificado a dieciseisavos si: queda 1.º/2.º
    -- en un grupo ya terminado, o es uno de los 8 mejores terceros (cuando los 12 grupos
    -- han terminado), o ya figura en una fila r32 de la BD (tras el sorteo).
    with gc as (
      select group_letter from matches where phase='group'
      group by group_letter having count(*)=count(real_home)
    ),
    gr as (
      select group_letter, home_team team, real_home gf, real_away ga,
             case when real_home>real_away then 3 when real_home=real_away then 1 else 0 end pts
        from matches where phase='group' and group_letter in (select group_letter from gc)
      union all
      select group_letter, away_team, real_away, real_home,
             case when real_away>real_home then 3 when real_home=real_away then 1 else 0 end
        from matches where phase='group' and group_letter in (select group_letter from gc)
    ),
    gt as (
      select group_letter, team,
             row_number() over (partition by group_letter order by sum(pts) desc, sum(gf-ga) desc, sum(gf) desc, team) pos,
             sum(pts) tpts, sum(gf-ga) tgd, sum(gf) tgf
        from gr group by group_letter, team
    ),
    top2 as (select team from gt where pos<=2),
    thirds as (
      select team from (
        select team, row_number() over (order by tpts desc, tgd desc, tgf desc, team) tr
          from gt where pos=3
      ) z where (select count(*) from gc) >= 12 and tr<=8
    ),
    r32rows as (
      select home_team team from matches where phase='r32' and home_team is not null
      union select away_team from matches where phase='r32' and away_team is not null
    ),
    qualified as (select team from top2 union select team from thirds union select team from r32rows)
    select coalesce(count(distinct q.team),0)*4 into v_r32
      from qualified q
     where q.team in (select home_team from ko_predictions where user_id=u.id and slot_id like 'r32%'
                      union select away_team from ko_predictions where user_id=u.id and slot_id like 'r32%');
    select v_r16 + coalesce(count(*),0)*6 into v_r16 from (
      select distinct t from (select home_team t from matches where phase='r16' and home_team is not null
        union select away_team from matches where phase='r16' and away_team is not null) rt
      where t in (select advanced from ko_predictions where user_id=u.id and slot_id like 'r32%')) x;
    select v_qf + coalesce(count(*),0)*8 into v_qf from (
      select distinct t from (select home_team t from matches where phase='qf' and home_team is not null
        union select away_team from matches where phase='qf' and away_team is not null) rt
      where t in (select advanced from ko_predictions where user_id=u.id and slot_id like 'r16%')) x;
    select v_sf + coalesce(count(*),0)*10 into v_sf from (
      select distinct t from (select home_team t from matches where phase='sf' and home_team is not null
        union select away_team from matches where phase='sf' and away_team is not null) rt
      where t in (select advanced from ko_predictions where user_id=u.id and slot_id like 'qf%')) x;
    select v_fin + coalesce(count(*),0)*12 into v_fin from (
      select distinct t from (select home_team t from matches where phase='final' and home_team is not null
        union select away_team from matches where phase='final' and away_team is not null) rt
      where t in (select advanced from ko_predictions where user_id=u.id and slot_id like 'sf%')) x;

    v_r32 := v_r32 + coalesce((select sum(
        (case when sign(kp.pred_home-kp.pred_away)=sign(m.real_home-m.real_away) then 2 else 0 end)
      + (case when (kp.pred_home-kp.pred_away)=(m.real_home-m.real_away) then 3 else 0 end)
      + (case when kp.pred_home=m.real_home and kp.pred_away=m.real_away then 4 else 0 end))
      from matches m join ko_predictions kp on kp.user_id=u.id and kp.home_team=m.home_team and kp.away_team=m.away_team
      where m.phase='r32' and m.real_home is not null and kp.pred_home is not null),0);
    v_r16 := v_r16 + coalesce((select sum(
        (case when sign(kp.pred_home-kp.pred_away)=sign(m.real_home-m.real_away) then 3 else 0 end)
      + (case when (kp.pred_home-kp.pred_away)=(m.real_home-m.real_away) then 4 else 0 end)
      + (case when kp.pred_home=m.real_home and kp.pred_away=m.real_away then 5 else 0 end))
      from matches m join ko_predictions kp on kp.user_id=u.id and kp.home_team=m.home_team and kp.away_team=m.away_team
      where m.phase='r16' and m.real_home is not null and kp.pred_home is not null),0);
    v_qf := v_qf + coalesce((select sum(
        (case when sign(kp.pred_home-kp.pred_away)=sign(m.real_home-m.real_away) then 4 else 0 end)
      + (case when (kp.pred_home-kp.pred_away)=(m.real_home-m.real_away) then 5 else 0 end)
      + (case when kp.pred_home=m.real_home and kp.pred_away=m.real_away then 6 else 0 end))
      from matches m join ko_predictions kp on kp.user_id=u.id and kp.home_team=m.home_team and kp.away_team=m.away_team
      where m.phase='qf' and m.real_home is not null and kp.pred_home is not null),0);
    v_sf := v_sf + coalesce((select sum(
        (case when sign(kp.pred_home-kp.pred_away)=sign(m.real_home-m.real_away) then 5 else 0 end)
      + (case when (kp.pred_home-kp.pred_away)=(m.real_home-m.real_away) then 6 else 0 end)
      + (case when kp.pred_home=m.real_home and kp.pred_away=m.real_away then 7 else 0 end))
      from matches m join ko_predictions kp on kp.user_id=u.id and kp.home_team=m.home_team and kp.away_team=m.away_team
      where m.phase='sf' and m.real_home is not null and kp.pred_home is not null),0);
    v_fin := v_fin + coalesce((select sum(
        (case when sign(kp.pred_home-kp.pred_away)=sign(m.real_home-m.real_away) then 10 else 0 end)
      + (case when (kp.pred_home-kp.pred_away)=(m.real_home-m.real_away) then 15 else 0 end)
      + (case when kp.pred_home=m.real_home and kp.pred_away=m.real_away then 20 else 0 end))
      from matches m join ko_predictions kp on kp.user_id=u.id and kp.home_team=m.home_team and kp.away_team=m.away_team
      where m.phase='final' and m.real_home is not null and kp.pred_home is not null),0);

    if champ is not null then
      v_fin := v_fin + coalesce((select 35 from ko_predictions where user_id=u.id and slot_id like 'final%' and advanced=champ limit 1),0);
      v_fin := v_fin + coalesce((select 20 from ko_predictions where user_id=u.id and slot_id like 'final%'
                 and ((home_team=runnerup and advanced<>home_team) or (away_team=runnerup and advanced<>away_team)) limit 1),0);
    end if;
    if real_bota  is not null then v_hon := v_hon + coalesce((select 10 from honours_predictions where user_id=u.id and boot_1=real_bota),0); end if;
    if real_balon is not null then v_hon := v_hon + coalesce((select 10 from honours_predictions where user_id=u.id and ball_1=real_balon),0); end if;

    v_total := v_grp+v_stand+v_r32+v_r16+v_qf+v_sf+v_fin+v_hon;
    insert into scores(user_id,total,group_match_pts,standings_pts,r32_pts,r16_pts,qf_pts,sf_pts,final_pts,honours_pts,exact_scores,updated_at)
    values(u.id,v_total,v_grp,v_stand,v_r32,v_r16,v_qf,v_sf,v_fin,v_hon,v_exact,now())
    on conflict(user_id) do update set total=excluded.total,group_match_pts=excluded.group_match_pts,
      standings_pts=excluded.standings_pts,r32_pts=excluded.r32_pts,r16_pts=excluded.r16_pts,
      qf_pts=excluded.qf_pts,sf_pts=excluded.sf_pts,final_pts=excluded.final_pts,
      honours_pts=excluded.honours_pts,exact_scores=excluded.exact_scores,updated_at=now();
  end loop;

  with ranked as (select user_id, row_number() over (order by total desc, exact_scores desc) rk from scores)
  update scores s set rank=r.rk from ranked r where r.user_id=s.user_id;
end$$;

grant execute on function recalculate_all_scores() to anon, authenticated;
grant execute on function ko_winner_of(text,int) to anon, authenticated;
grant execute on function advance_bracket() to anon, authenticated;
