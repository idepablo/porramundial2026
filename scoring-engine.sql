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

insert into settings (key, value) values ('real_bota',''), ('real_balon','')
on conflict (key) do nothing;
alter table scores add column if not exists prev_rank int;

create or replace function recalculate_all_scores() returns void language plpgsql
security definer set search_path = public as $$
declare
  u record;
  v_grp int; v_exact int; v_stand int;
  v_r32 int; v_r16 int; v_qf int; v_sf int; v_fin int; v_hon int; v_total int;
  real_bota text; real_balon text; champ text; runnerup text;
begin
  select nullif(value,'') into real_bota  from settings where key='real_bota';
  select nullif(value,'') into real_balon from settings where key='real_balon';
  select case when real_home>real_away then home_team else away_team end,
         case when real_home>real_away then away_team else home_team end
    into champ, runnerup
  from matches where phase='final' and real_home is not null order by id limit 1;

  -- snapshot previous standing so the leaderboard can show movement
  update scores set prev_rank = rank;

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

    select coalesce(count(*),0)*4 into v_r32 from (
      select distinct t from (select home_team t from matches where phase='r32' and home_team is not null
        union select away_team from matches where phase='r32' and away_team is not null) rt
      where t in (select home_team from ko_predictions where user_id=u.id and slot_id like 'r32%'
                  union select away_team from ko_predictions where user_id=u.id and slot_id like 'r32%')) x;
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

  with ranked as (select user_id, row_number() over (order by total desc) rk from scores)
  update scores s set rank=r.rk from ranked r where r.user_id=s.user_id;
end$$;

grant execute on function recalculate_all_scores() to anon, authenticated;
