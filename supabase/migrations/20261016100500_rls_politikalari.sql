-- =====================================================================
-- 06 · RLS POLİTİKALARI, TABLO YETKİLERİ, GÖRÜNÜMLER  (plan 5.3, 9.1)
--
-- Savunma katmanları (dıştan içe):
--   1) GRANT: istemci rollerine yalnızca gereken tablo/sütun yetkisi.
--      "anon" hiçbir şey alamaz. Yazma yetkileri sütun bazlıdır.
--   2) RLS: her tabloda AÇIK; politika yoksa = erişim yok (varsayılan ret).
--   3) Tetikleyiciler (05): rol/durum/değiştirilemezlik korumaları.
--
-- Matriste "RPC ile" geçen veya plan 6'da RPC olarak listelenen yazma
-- işlemleri için doğrudan tablo politikası AÇILMAZ (soru, mesaj, ek,
-- plan, eşleşme, ders, bildirim ekleme...). O işlemleri `backend`
-- ajanının yazacağı SECURITY DEFINER RPC'ler yapar.
--
-- Politikalarda auth.uid() ve yardımcılar `(select ...)` içinde yazılır:
-- Postgres sonucu sorgu başına bir kez hesaplar (performans).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tüm public tablolarında RLS'yi aç (döngü: unutulan tablo kalmasın).
--    Sonraki migration'larda eklenen her tablo için bu satır tekrarlanmalı;
--    supabase/tests/database/001_sema_korumalari.test.sql bunu denetler.
-- ---------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select c.relname
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) Yetkileri sıfırla, sonra yalnızca gerekenleri ver.
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;

-- Servis rolü (Edge Function'lar, secret key): RLS'yi atlar ama tablo yetkisi ister.
-- TRUNCATE ve şema değiştirme yetkisi verilmez.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
-- Denetim kaydı değiştirilemez: servis rolü bile güncelleyemez/silemez.
revoke update, delete on public.audit_log from service_role;
-- Silinen gönüllü bağlantıları (SK-16): yalnızca tetikleyici yazar; servis rolü okuyup süresi dolanı SİLEBİLİR, değiştiremez.
revoke insert, update on public.deleted_volunteer_links from service_role;

-- ---------- authenticated: okuma ----------
grant select on
  public.subjects, public.academic_years, public.academic_weeks, public.curriculum_versions,
  public.grade_programs, public.units, public.topics, public.weekly_topics, public.resources,
  public.consent_types,
  public.profiles, public.students, public.guardian_students, public.student_features, public.consents,
  public.volunteers, public.volunteer_documents, public.volunteer_subjects,
  public.training_questions, public.training_answer_keys, public.training_attempts,
  public.recovery_plans, public.plan_items,
  public.questions, public.question_messages, public.attachments, public.moderation_flags,
  public.availability_slots, public.matches, public.sessions, public.session_events,
  public.reports, public.notifications, public.push_subscriptions, public.audit_log,
  public.volunteer_blocks, public.deleted_volunteer_links
to authenticated;

-- Hukuki metinler giriş yapmadan da (kayıt ekranında) okunabilir: tek anon yetkisi budur.
grant select on public.legal_documents to anon, authenticated;

-- ---------- authenticated: yazma (SÜTUN bazlı; listede olmayan sütun yazılamaz) ----------
grant update (display_name)                                         on public.profiles          to authenticated;
grant update (grade, prefs)                                         on public.students          to authenticated;  -- sınıfı yalnızca veli: tetikleyici
grant insert (user_id, student_id, type, doc_version, granted, channel, app_version)
                                                                    on public.consents          to authenticated;  -- doc_sha256 / accepted_at / subject_hash sunucuda
grant update (qa_enabled, voice_enabled, video_enabled)             on public.student_features  to authenticated;  -- yalnızca veli (politika)
grant update (reviewed_at)                                          on public.volunteer_blocks  to authenticated;  -- yalnızca yönetici (politika)
grant update (withdrawn_at)                                         on public.consents          to authenticated;
grant insert (profile_id, given_name, family_name, university, department, class_year)
                                                                    on public.volunteers        to authenticated;  -- status varsayılan 'basvuru'
grant update (given_name, family_name, university, department, class_year)
                                                                    on public.volunteers        to authenticated;  -- yalnızca başvuru aşamasında (politika + tetikleyici)
grant insert (volunteer_id, storage_path)                           on public.volunteer_documents to authenticated;
grant insert (volunteer_id, subject_id, grade)                      on public.volunteer_subjects  to authenticated;
grant delete                                                        on public.volunteer_subjects  to authenticated;
grant update (hidden_at)                                            on public.question_messages to authenticated;  -- yalnızca yönetici (politika)
grant insert (user_id, weekday, start_time, end_time)               on public.availability_slots to authenticated;
grant update (weekday, start_time, end_time)                        on public.availability_slots to authenticated;
grant delete                                                        on public.availability_slots to authenticated;
grant update (volunteer_note)                                       on public.sessions          to authenticated;  -- gönüllü ders notu
grant insert (reporter_id, target_type, target_id, target_user_id, category, description)
                                                                    on public.reports           to authenticated;
grant update (status, action_taken)                                 on public.reports           to authenticated;  -- yalnızca yönetici (politika)
grant update (read_at)                                              on public.notifications     to authenticated;
-- push_subscriptions: ekleme / güncelleme YOK (yalnızca register_push_subscription RPC'si); silme: kendi aboneliği (çıkış)
grant delete                                                        on public.push_subscriptions to authenticated;

-- =====================================================================
-- 3) POLİTİKALAR
-- =====================================================================

-- ---------------------------------------------------------------------
-- Müfredat ve kaynaklar: giriş yapmış herkes okur (herkese açık içerik).
-- Yazma politikası YOK: içerik yalnızca migration/seed ile yüklenir.
-- ---------------------------------------------------------------------
create policy subjects_select on public.subjects for select to authenticated using (true);
create policy academic_years_select on public.academic_years for select to authenticated using (true);
create policy academic_weeks_select on public.academic_weeks for select to authenticated using (true);
create policy curriculum_versions_select on public.curriculum_versions for select to authenticated using (true);
create policy grade_programs_select on public.grade_programs for select to authenticated using (true);
create policy units_select on public.units for select to authenticated using (true);
create policy topics_select on public.topics for select to authenticated using (true);
create policy weekly_topics_select on public.weekly_topics for select to authenticated using (true);
create policy resources_select on public.resources for select to authenticated
  using (is_active or (select private.is_admin()));
create policy consent_types_select on public.consent_types for select to authenticated using (true);

-- Hukuki metinler herkese açık (kayıttan önce de gösterilir); henüz yayın tarihi gelmemiş sürüm görünmez.
-- Yazma politikası YOK: yeni sürüm yalnızca migration ile eklenir.
create policy legal_documents_select on public.legal_documents for select to anon, authenticated
  using (published_at <= now());

-- ---------------------------------------------------------------------
-- profiles
--   Herkes kendi satırını okur (askıdaysa bile: uygulama "hesabınız askıda" gösterebilsin).
--   Veli, çocuğunun profilini (rumuz) okur. Yönetici hepsini okur.
--   Gönüllü, eşleşmiş öğrencinin profilini DOĞRUDAN okuyamaz; yalnızca
--   matched_students görünümünü kullanır.
--   Güncelleme: yalnızca display_name (sütun yetkisi); role/status tetikleyiciyle de korunur.
--   ÖĞRENCİ kendi rumuzunu DEĞİŞTİREMEZ (rumuz gönüllüye gösterilir; filtreyi atlatan bir iletişim kanalı
--   olmasın): öğrencinin rumuzunu yalnızca VELİSİ değiştirebilir. Veli / gönüllü / yönetici kendi adını değiştirir.
-- ---------------------------------------------------------------------
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_guardian on public.profiles for select to authenticated
  using (role = 'ogrenci' and (select private.is_guardian_of(id)));
create policy profiles_select_admin on public.profiles for select to authenticated
  using ((select private.is_admin()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and status = 'aktif' and role <> 'ogrenci')
  with check (id = (select auth.uid()));
create policy profiles_update_guardian_child on public.profiles for update to authenticated
  using (role = 'ogrenci' and (select private.is_guardian_of(id)))
  with check (role = 'ogrenci' and (select private.is_guardian_of(id)));

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------
create policy students_select_own on public.students for select to authenticated
  using (profile_id = (select auth.uid()) and (select private.active_role()) = 'ogrenci');
create policy students_select_guardian on public.students for select to authenticated
  using ((select private.is_guardian_of(profile_id)));
create policy students_select_admin on public.students for select to authenticated
  using ((select private.is_admin()));
create policy students_update_own on public.students for update to authenticated
  using (profile_id = (select auth.uid()) and (select private.active_role()) = 'ogrenci')
  with check (profile_id = (select auth.uid()));
create policy students_update_guardian on public.students for update to authenticated
  using ((select private.is_guardian_of(profile_id)))
  with check ((select private.is_guardian_of(profile_id)));

-- ---------------------------------------------------------------------
-- guardian_students: veli kendi bağlantılarını görür. Yazma: yalnızca
-- create-child-account Edge Function'ı (servis rolü).
-- ---------------------------------------------------------------------
create policy guardian_students_select_own on public.guardian_students for select to authenticated
  using (guardian_id = (select auth.uid()) and (select private.active_role()) = 'veli');
create policy guardian_students_select_admin on public.guardian_students for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- consents: kullanıcı kendi rızalarını okur/ekler/geri çeker; çocuğa ait rızaları
-- (AR-1 gibi) çocuğun HER İKİ velisi de görür ve geri çekebilir; yönetici okur.
-- Ekleme: tür-rol uyumu, çocuk-bazlı tür için student_id ve çocuğun velisi/kendisi olma
-- kuralı consent_allowed() içindedir. doc_sha256 ve zaman sunucuda yazılır.
-- ---------------------------------------------------------------------
-- N4: ÇOCUĞA BAĞLI rıza satırı (student_id dolu) yalnızca çocuğun HÂLÂ velisi olanlarca okunur / geri çekilir.
-- Velilikten çıkarılan kişi (bağı silinen) eski rıza satırından çocuğun kimliğini göremez ve rızayı geri çekip
-- çocuğun hesabını askıya alamaz. Çocuğa bağlı olmayan satırlar (aydınlatma teyidi vb.) sahibinindir.
create policy consents_select_own on public.consents for select to authenticated
  using (user_id = (select auth.uid()) and (student_id is null or (select private.has_guardian_link(student_id))));
create policy consents_select_guardian on public.consents for select to authenticated
  using (student_id is not null and (select private.is_guardian_of(student_id)));
create policy consents_select_admin on public.consents for select to authenticated
  using ((select private.is_admin()));
create policy consents_insert_own on public.consents for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.consent_allowed(type, student_id))
  );
create policy consents_update_withdraw on public.consents for update to authenticated
  using (
    case when student_id is null then user_id = (select auth.uid())
         else (select private.has_guardian_link(student_id)) end
  )
  with check (
    case when student_id is null then user_id = (select auth.uid())
         else (select private.has_guardian_link(student_id)) end
  );

-- ---------------------------------------------------------------------
-- student_features: çocuk başına özellik anahtarları. Okuma: öğrenci (arayüzü ayarlasın),
-- veli, yönetici. Değiştirme: YALNIZCA o çocuğun velisi (öğrenci kendi kısıtını kaldıramaz).
-- ---------------------------------------------------------------------
create policy student_features_select_student on public.student_features for select to authenticated
  using (student_id = (select auth.uid()) and (select private.active_role()) = 'ogrenci');
create policy student_features_select_guardian on public.student_features for select to authenticated
  using ((select private.is_guardian_of(student_id)));
create policy student_features_select_admin on public.student_features for select to authenticated
  using ((select private.is_admin()));
create policy student_features_update_guardian on public.student_features for update to authenticated
  using ((select private.is_guardian_of(student_id)))
  with check ((select private.is_guardian_of(student_id)));

-- ---------------------------------------------------------------------
-- volunteer_blocks: engelleyen, çocuk, çocuğun velileri ve yönetici okur. GÖNÜLLÜ GÖREMEZ.
-- Ekleme yalnızca block_volunteer RPC'siyle. Yönetici yalnızca "incelendi" işaretler.
-- ---------------------------------------------------------------------
create policy volunteer_blocks_select_blocker on public.volunteer_blocks for select to authenticated
  using (blocked_by = (select auth.uid()));
create policy volunteer_blocks_select_student on public.volunteer_blocks for select to authenticated
  using (student_id = (select auth.uid()) and (select private.active_role()) = 'ogrenci');
create policy volunteer_blocks_select_guardian on public.volunteer_blocks for select to authenticated
  using ((select private.is_guardian_of(student_id)));
create policy volunteer_blocks_select_admin on public.volunteer_blocks for select to authenticated
  using ((select private.is_admin()));
create policy volunteer_blocks_update_admin on public.volunteer_blocks for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- deleted_volunteer_links (SK-16): silinen gönüllünün kimlik bağlantısı YALNIZCA yöneticiye (aal2) görünür.
-- Yazma yalnızca tetikleyici; istemci yazamaz. Süresi dolanı cleanup siler.
-- ---------------------------------------------------------------------
create policy deleted_volunteer_links_select_admin on public.deleted_volunteer_links for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- volunteers: kendi başvurusunu açar/düzenler (durum alanları hariç); yönetici okur.
-- Onay/ret yalnızca review_volunteer RPC'si ile.
-- ---------------------------------------------------------------------
create policy volunteers_select_own on public.volunteers for select to authenticated
  using (profile_id = (select auth.uid()));
create policy volunteers_select_admin on public.volunteers for select to authenticated
  using ((select private.is_admin()));
create policy volunteers_insert_own on public.volunteers for insert to authenticated
  with check (profile_id = (select auth.uid()) and (select private.active_role()) = 'gonullu');
-- Profil alanları (ad, soyad, üniversite, bölüm, sınıf yılı) çocuğa ve veliye gösterilir. Bu yüzden YALNIZCA
-- yönetici kararından ÖNCE ('basvuru', 'egitim', 'inceleme') düzenlenebilir; onay / ret / askıdan sonra kilitlidir
-- (güvenlik denetimi Y2/S2). Değişiklik gerekirse yönetici RPC'si / SQL ile yapılır. Değişiklikler audit_log'a yazılır.
create policy volunteers_update_own on public.volunteers for update to authenticated
  using (
    profile_id = (select auth.uid())
    and status in ('basvuru', 'egitim', 'inceleme')
    and (select private.active_role()) = 'gonullu'
  )
  with check (profile_id = (select auth.uid()));

-- volunteer_documents: gönüllü yükler (ve kendi kaydını görür); yönetici okur.
-- Silme/işaretleme yalnızca cleanup / review_volunteer (servis/RPC).
create policy volunteer_documents_select_own on public.volunteer_documents for select to authenticated
  using (volunteer_id = (select auth.uid()));
create policy volunteer_documents_select_admin on public.volunteer_documents for select to authenticated
  using ((select private.is_admin()));
create policy volunteer_documents_insert_own on public.volunteer_documents for insert to authenticated
  with check (volunteer_id = (select auth.uid()) and (select private.volunteer_application_open()));

-- volunteer_subjects: başvuru aşamasında gönüllü kendi ders/sınıf seçimini yönetir;
-- onaydan sonra kilitlenir (havuz erişimi yöneticinin kontrolünde kalsın).
create policy volunteer_subjects_select_own on public.volunteer_subjects for select to authenticated
  using (volunteer_id = (select auth.uid()));
create policy volunteer_subjects_select_admin on public.volunteer_subjects for select to authenticated
  using ((select private.is_admin()));
create policy volunteer_subjects_insert_own on public.volunteer_subjects for insert to authenticated
  with check (volunteer_id = (select auth.uid()) and (select private.volunteer_application_open()));
create policy volunteer_subjects_delete_own on public.volunteer_subjects for delete to authenticated
  using (volunteer_id = (select auth.uid()) and (select private.volunteer_application_open()));

-- Eğitim quiz'i: sorular gönüllülere açık; DOĞRU CEVAPLAR yalnızca yöneticiye.
create policy training_questions_select on public.training_questions for select to authenticated
  using ((is_active and (select private.active_role()) = 'gonullu') or (select private.is_admin()));
create policy training_answer_keys_select_admin on public.training_answer_keys for select to authenticated
  using ((select private.is_admin()));
create policy training_attempts_select_own on public.training_attempts for select to authenticated
  using (volunteer_id = (select auth.uid()));
create policy training_attempts_select_admin on public.training_attempts for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- Telafi planı: öğrenci kendi, veli çocuğunun, yönetici hepsini OKUR.
-- GÖNÜLLÜ tabloyu DOĞRUDAN OKUYAMAZ: devamsızlık tarihleri (absence_start/end) dolaylı
-- sağlık verisi riski taşır (hukuk: veri-envanteri.md §3). Gönüllü yalnızca
-- matched_student_plan_items görünümünden konu listesi + ilerlemeyi görür.
-- Yazma: create_recovery_plan / complete_plan_item RPC'leri.
-- ---------------------------------------------------------------------
create policy recovery_plans_select_student on public.recovery_plans for select to authenticated
  using (student_id = (select auth.uid()) and (select private.active_role()) = 'ogrenci');
create policy recovery_plans_select_guardian on public.recovery_plans for select to authenticated
  using ((select private.is_guardian_of(student_id)));
create policy recovery_plans_select_admin on public.recovery_plans for select to authenticated
  using ((select private.is_admin()));

-- Plan maddeleri: üst planı görebilen herkes maddelerini de görür (üst tablonun RLS'si uygulanır).
create policy plan_items_select on public.plan_items for select to authenticated
  using (exists (select 1 from public.recovery_plans rp where rp.id = plan_items.plan_id));

-- ---------------------------------------------------------------------
-- Soru-cevap: okuma için tek kural can_access_question(). Yazma yalnızca RPC
-- (ask_question, post_message, claim_question, close_question).
-- ---------------------------------------------------------------------
-- İki katmanlı: (1) ucuz ön süzgeç, (2) kesin kural. Ön süzgeç kesin kuralın ÜST KÜMESİDİR (her erişilebilir
-- satırı içerir); yalnızca "satır başına fonksiyon çağrısı" maliyetini azaltmak için vardır ve güvenlik
-- kararını VERMEZ. Kesin karar can_access_question()'dadır. Ölçüm (10.000 soru): filtresiz "tüm görünen
-- sorular" sorgusu ~1,7-2,5 sn -> ön süzgeçle ms düzeyi (bkz. docs/veri-modeli.md).
create policy questions_select on public.questions for select to authenticated
  using (
    (
      student_id = (select auth.uid())
      or assigned_volunteer_id = (select auth.uid())
      or (status = 'havuzda' and (subject_id, grade) in (
            select vs.subject_id, vs.grade from public.volunteer_subjects vs where vs.volunteer_id = (select auth.uid())))
      or student_id in (select gs.student_id from public.guardian_students gs where gs.guardian_id = (select auth.uid()))
      or student_id in (select m.student_id from public.matches m where m.volunteer_id = (select auth.uid()) and m.status = 'aktif')
      or (select private.is_admin())
    )
    and private.can_access_question(id)
  );

-- Gizlenmiş mesajı yalnızca yönetici görür.
-- "Mesajı görebilir" = "sorusunu görebilir": soru tablosunun RLS'si (questions_select) alt sorguda uygulanır.
-- Böylece mesaj taramalarında satır başına fonksiyon çağrısı yerine tek bir yarı-birleştirme (semi join) kullanılır.
-- N3: engellenen gönüllünün mesajı, yönetici engeli inceleyene kadar yalnızca öğrenci / veli / yönetici tarafından
-- görülür (private.message_hidden_from_me); havuzdan üstlenen yeni gönüllü onu okuyamaz. Ekler ve Storage nesneleri
-- bu politikayı izler (attachments_select -> question_messages).
create policy question_messages_select on public.question_messages for select to authenticated
  using (
    exists (select 1 from public.questions q where q.id = question_messages.question_id)
    and (hidden_at is null or (select private.is_admin()))
    and not (
      sender_id in (select v from private.embargoed_volunteers() v)      -- ucuz ön süzgeç (bir kez hesaplanır)
      and private.message_hidden_from_me(question_id, sender_id)         -- kesin karar, yalnızca ön süzgeçten geçen satırlar için
    )
  );
-- Yönetici gizleme: yalnızca hidden_at (sütun yetkisi + tetikleyici başka alanı engeller).
create policy question_messages_hide_admin on public.question_messages for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Ek: mesajı görebilen eki de görür.
create policy attachments_select on public.attachments for select to authenticated
  using (exists (select 1 from public.question_messages m where m.id = attachments.message_id));

-- Moderasyon bayrakları ve denetim kaydı: yalnızca yönetici okur; ekleme yalnızca sistemden.
create policy moderation_flags_select_admin on public.moderation_flags for select to authenticated
  using ((select private.is_admin()));
create policy audit_log_select_admin on public.audit_log for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- availability_slots
--   Öğrenci/gönüllü kendi uygunluğunu, veli çocuğununkini yönetir.
--   Eşleşmiş gönüllü öğrencinin uygunluğunu OKUR. Yönetici okur.
-- ---------------------------------------------------------------------
create policy availability_slots_select on public.availability_slots for select to authenticated
  using (
    (user_id = (select auth.uid()) and (select private.active_role()) in ('ogrenci', 'gonullu'))
    or (select private.is_guardian_of(user_id))
    or (select private.is_matched_volunteer(user_id))
    or (select private.is_admin())
  );
create policy availability_slots_insert on public.availability_slots for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and (select private.active_role()) in ('ogrenci', 'gonullu'))
    or (select private.is_guardian_of(user_id))
  );
create policy availability_slots_update on public.availability_slots for update to authenticated
  using (
    (user_id = (select auth.uid()) and (select private.active_role()) in ('ogrenci', 'gonullu'))
    or (select private.is_guardian_of(user_id))
  )
  with check (
    (user_id = (select auth.uid()) and (select private.active_role()) in ('ogrenci', 'gonullu'))
    or (select private.is_guardian_of(user_id))
  );
create policy availability_slots_delete on public.availability_slots for delete to authenticated
  using (
    (user_id = (select auth.uid()) and (select private.active_role()) in ('ogrenci', 'gonullu'))
    or (select private.is_guardian_of(user_id))
  );

-- ---------------------------------------------------------------------
-- matches: yazma yalnızca RPC (propose_match, decide_match, end_match).
--   Öğrenci: kendi eşleşmesi (veli kararı beklerken GÖRMEZ).
--   Veli: çocuğunun tüm eşleşmeleri. Gönüllü: veli onayından sonra kendi eşleşmeleri.
-- ---------------------------------------------------------------------
create policy matches_select_student on public.matches for select to authenticated
  using (
    student_id = (select auth.uid())
    and status <> 'onerildi'
    and (select private.active_role()) = 'ogrenci'
  );
create policy matches_select_guardian on public.matches for select to authenticated
  using ((select private.is_guardian_of(student_id)));
create policy matches_select_volunteer on public.matches for select to authenticated
  using (
    volunteer_id = (select auth.uid())
    and status in ('veli_onayi', 'aktif', 'bitti')
    and (select private.is_approved_volunteer())
    and not (select private.is_blocked_for_me(student_id))   -- engellendiyse eşleşme (ve dersleri) görünmez
  );
create policy matches_select_admin on public.matches for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- sessions / session_events: eşleşmeyi görebilen dersi de görür.
-- Randevu al/iptal: RPC. Gönüllü yalnızca kendi derslerinin NOTUNU yazar.
-- ---------------------------------------------------------------------
create policy sessions_select on public.sessions for select to authenticated
  using (exists (select 1 from public.matches m where m.id = sessions.match_id));
-- Ders notu (çocuğun/velinin gördüğü SERBEST METİN) için dar kanal (güvenlik denetimi Y1/S1):
--   * ders TAMAMLANMIŞ ve bitişinden en çok 48 saat geçmiş,
--   * anonimleştirilmemiş,
--   * gönüllü ile çocuk arasında ENGEL yok,
--   * TEK SEFERLİK yazım: yalnızca not henüz boşken (USING: volunteer_note is null); sonradan değiştirilemez,
--   * yazım audit_log'a işlenir (uzunluk). İçerik filtresi (mask_contact_info) backend'in tetikleyicisidir.
create policy sessions_update_note_volunteer on public.sessions for update to authenticated
  using (
    status = 'tamamlandi'
    and anonymized_at is null
    and volunteer_note is null
    and starts_at + duration_min * interval '1 minute' > now() - interval '48 hours'
    and (select private.is_approved_volunteer())
    and exists (
      select 1 from public.matches m
      where m.id = sessions.match_id
        and m.volunteer_id = (select auth.uid())
        and m.status in ('aktif', 'bitti')
        and not (select private.is_blocked_for_me(m.student_id))
    )
  )
  with check (
    volunteer_note is not null
    and status = 'tamamlandi'
    and anonymized_at is null
    and (select private.is_approved_volunteer())
    and exists (
      select 1 from public.matches m
      where m.id = sessions.match_id
        and m.volunteer_id = (select auth.uid())
        and m.status in ('aktif', 'bitti')
        and not (select private.is_blocked_for_me(m.student_id))
    )
  );
create policy session_events_select on public.session_events for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_events.session_id));

-- ---------------------------------------------------------------------
-- reports: aktif öğrenci/veli/gönüllü bildirir ve kendi bildirimlerini görür;
-- yönetici hepsini görür ve işler (durum + not; handled_by/at tetikleyici yazar).
-- ---------------------------------------------------------------------
create policy reports_select_own on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy reports_select_admin on public.reports for select to authenticated
  using ((select private.is_admin()));
create policy reports_insert on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select private.active_role()) in ('ogrenci', 'veli', 'gonullu')
  );
create policy reports_update_admin on public.reports for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- notifications / push_subscriptions: herkes yalnızca KENDİ satırlarını görür.
-- Bildirim ekleme yalnızca sistemden (tetikleyici / RPC / servis rolü).
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Web Push abonelikleri: kendi satırını okur ve siler (çıkışta / bildirimi kapatırken). EKLEME ve GÜNCELLEME
-- yalnızca register_push_subscription RPC'siyle (aşağıda): askıdaki / beklemedeki kullanıcı abone OLAMAZ
-- (push almaya devam etmesin) ama kendi aboneliklerini okuyup SİLEBİLİR.
-- backend send-push da askıdaki kullanıcıya göndermemelidir.
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Web Push RPC'leri (public şemada: PostgREST'ten çağrılır). EKLEME / GÜNCELLEME yolu YALNIZCA budur.
--
-- register_push_subscription(p_endpoint, p_p256dh, p_auth, p_device_label default null) -> abonelik kimliği
--   * oturum şart; hesap AKTİF olmalı (askıdaki / beklemedeki kullanıcı abone olamaz),
--   * endpoint / anahtar biçimi tablo CHECK kısıtlarıyla doğrulanır (izinli push servisi alan adları: SSRF),
--   * AYNI endpoint başka hesaba geçerse (aynı tarayıcıda hesap değişti) satır YENİ kullanıcıya TAŞINIR:
--     eski kullanıcı o tarayıcıya push almaz. Yeni anahtarlar eskisinin yerine yazılır,
--   * her çağrıda updated_at tazelenir (SK-17: 60 gün tazelenmeyen abonelik silinir),
--   * kullanıcı başına en çok 10 abonelik: fazlası (en az yakın zamanda tazelenenler) silinir,
--   * eşzamanlı çağrılar kullanıcı bazında sıraya girer (10 sınırı yarışta aşılamaz).
-- remove_push_subscription(p_endpoint) -> silindi mi
--   * yalnızca ÇAĞIRANIN kendi aboneliğini siler (başkasınınkini silemez; yoksa false). Askıdaki kullanıcı da çağırabilir.
-- ---------------------------------------------------------------------
create or replace function public.register_push_subscription(
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_device_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'register_push_subscription: oturum gerekli' using errcode = '42501';
  end if;
  if (select private.active_role()) is null then
    raise exception 'register_push_subscription: hesap aktif değil' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('push_abonelik:' || v_uid::text, 0));

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
  values (v_uid, p_endpoint, p_p256dh, p_auth, p_device_label)
  on conflict (endpoint) do update
     set user_id    = excluded.user_id,
         p256dh     = excluded.p256dh,
         auth       = excluded.auth,
         device_label = excluded.device_label,
         updated_at = now()
  returning id into v_id;

  delete from public.push_subscriptions
  where id in (select s.id from public.push_subscriptions s
               where s.user_id = v_uid
               order by s.updated_at desc, s.id
               offset 10);

  return v_id;
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n bigint;
begin
  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and user_id = (select auth.uid());
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.remove_push_subscription(text) from public, anon, authenticated, service_role;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

comment on function public.register_push_subscription(text, text, text, text) is
  'Web Push aboneliğini kaydeder / tazeler; aynı endpoint başka hesaptaysa çağırana TAŞIR. Aktif hesap şart. Kullanıcı başına en çok 10 abonelik.';
comment on function public.remove_push_subscription(text) is
  'Çağıranın kendi Web Push aboneliğini siler (çıkış / bildirimi kapatma). Silindiyse true.';

-- =====================================================================
-- 4) GÖRÜNÜMLER: kısıtlı alan açığa çıkarma
--
-- Neden güvenli görünüm (security_invoker DEĞİL)?
--   Gönüllü, eşleşmiş öğrenci için YALNIZCA rumuz + sınıf görmeli. RLS satır
--   filtreler, sütun filtrelemez: gönüllüye students/profiles satırı
--   açsaydık kullanıcı adı, tercihler, oluşturma tarihi gibi sütunlar da
--   görünürdü. security_invoker=true bir görünüm tabloların RLS'sine bağlı
--   olurdu ve tam da bu sızıntıyı yaratırdı. Bu yüzden görünümler tablo
--   sahibi (postgres) yetkisiyle çalışır; satır kapsamı görünümün WHERE
--   koşulunda yardımcı fonksiyonlarla (is_matched_volunteer, is_guardian_of)
--   sınırlanır ve yalnızca izin verilen sütunlar seçilir.
--   security_barrier=true: kullanıcı filtrelerinin bu koşuldan önce
--   değerlendirilip satır sızdırmasını (sızdıran fonksiyon saldırısı) önler.
--   Supabase Advisor "Security Definer View" uyarısı verir; bilinçli tercihtir.
-- =====================================================================

-- Gönüllü -> eşleşmiş öğrencilerim: yalnızca rumuz + sınıf (+ velinin açtığı/kapattığı özellikler,
-- arayüzde "sesli cevap kaydet" gibi düğmeleri doğru göstermek için).
-- prefs, kullanıcı adı, devamsızlık tarihleri BİLEREK yoktur.
create view public.matched_students
with (security_barrier = true) as
select
  m.id           as match_id,
  m.subject_id   as subject_id,
  s.profile_id   as student_id,
  p.display_name as nickname,
  s.grade        as grade,
  coalesce(f.voice_enabled, true) as voice_enabled,
  coalesce(f.video_enabled, true) as video_enabled
from public.matches m
join public.students s on s.profile_id = m.student_id
join public.profiles p on p.id = s.profile_id
left join public.student_features f on f.student_id = s.profile_id
where m.volunteer_id = (select auth.uid())
  and m.status = 'aktif'
  and (select private.is_matched_volunteer(m.student_id));

comment on view public.matched_students is
  'Gönüllünün AKTİF eşleşmesindeki öğrenciler: yalnızca rumuz ve sınıf. Soyad/okul/kullanıcı adı/tercihler yoktur ve tabloda da yoktur.';

-- Gönüllü -> eşleşmiş öğrencinin DAR plan görünümü (güvenlik denetimi O2):
--   * yalnızca SIRADAKİ 3 bekleyen konu (upcoming_rank 1-3) + eşleşilen dersteki TAMAMLANAN KONU SAYISI,
--   * mutlak sıra numarası (seq), plan kimliği, tamamlanan konuların kendisi, tarihler, günlük hedef, mod YOK.
-- Neden dar? Konu listesi herkese açık weekly_topics / academic_weeks ile birleştirilince, tamamlanmış ve
-- bekleyen konuların tümü bilinirse çocuğun devamsızlık aralığı geri hesaplanabilirdi (dolaylı sağlık verisi
-- çıkarımı). Yalnızca "şimdi sırada ne var" bilgisi gönüllünün işi için yeterlidir.
create view public.matched_student_plan_items
with (security_barrier = true) as
select
  x.match_id,
  x.student_id,
  x.topic_id,
  x.upcoming_rank,
  x.completed_count
from (
  select
    m.id          as match_id,
    rp.student_id as student_id,
    pi.topic_id   as topic_id,
    (row_number() over (partition by m.id order by pi.seq))::smallint as upcoming_rank,
    (select count(*)
       from public.plan_items c
       join public.topics ct on ct.id = c.topic_id
       join public.units cu on cu.id = ct.unit_id
       join public.curriculum_versions ccv on ccv.id = cu.curriculum_version_id and ccv.subject_id = m.subject_id
      where c.plan_id = rp.id and c.status = 'tamamlandi') as completed_count
  from public.matches m
  join public.recovery_plans rp on rp.student_id = m.student_id and rp.status = 'aktif'
  join public.plan_items pi on pi.plan_id = rp.id and pi.status = 'bekliyor'
  join public.topics t on t.id = pi.topic_id
  join public.units u on u.id = t.unit_id
  join public.curriculum_versions cv on cv.id = u.curriculum_version_id and cv.subject_id = m.subject_id
  where m.volunteer_id = (select auth.uid())
    and m.status = 'aktif'
    and (select private.is_matched_volunteer(m.student_id))
) x
where x.upcoming_rank <= 3;

comment on view public.matched_student_plan_items is
  'Gönüllü için eşleşilen dersin SIRADAKİ 3 bekleyen konusu ve tamamlanan konu sayısı. Tarih, mutlak sıra, plan kimliği ve tamamlanan konuların listesi yoktur.';

-- ÖĞRENCİ -> eşleşmiş gönüllü: yalnızca "Ad S." (adı + soyadın baş harfi). Üniversite/bölüm
-- öğrenciye gösterilmez. Veli onayından sonraki eşleşmeler görünür.
create view public.matched_volunteers_for_student
with (security_barrier = true) as
select
  m.id         as match_id,
  m.student_id as student_id,
  m.subject_id as subject_id,
  m.status     as match_status,
  v.profile_id as volunteer_id,
  private.short_name(v.given_name, v.family_name) as volunteer_name
from public.matches m
join public.volunteers v on v.profile_id = m.volunteer_id
where m.student_id = (select auth.uid())
  and m.status <> 'onerildi'
  and (select private.active_role()) = 'ogrenci';

comment on view public.matched_volunteers_for_student is
  'Öğrenci için eşleşmiş gönüllünün kartı: yalnızca "Ad S." biçiminde kısa ad.';

-- VELİ -> çocuğunun eşleşmiş/önerilmiş gönüllüsü: "Ad S." + üniversite + bölüm + verdiği dersler.
-- Öneri aşaması dahil (onay kararı için kartı görmeli). Tam ad (given_name + family_name), sınıf yılı,
-- onay durumu, ret nedeni, eğitim sonucu GÖSTERİLMEZ.
create view public.matched_volunteers_for_guardian
with (security_barrier = true) as
select
  m.id         as match_id,
  m.student_id as student_id,
  m.subject_id as subject_id,
  m.status     as match_status,
  v.profile_id as volunteer_id,
  private.short_name(v.given_name, v.family_name) as volunteer_name,
  v.university as university,
  v.department as department,
  coalesce((
    select jsonb_agg(jsonb_build_object('subject_id', vs.subject_id, 'grade', vs.grade)
                     order by vs.subject_id, vs.grade)
    from public.volunteer_subjects vs
    where vs.volunteer_id = v.profile_id
  ), '[]'::jsonb) as teaches
from public.matches m
join public.volunteers v on v.profile_id = m.volunteer_id
where (select private.is_guardian_of(m.student_id));

comment on view public.matched_volunteers_for_guardian is
  'Veli için gönüllü kartı: "Ad S.", üniversite, bölüm, verdiği dersler.';

revoke all on
  public.matched_students, public.matched_student_plan_items,
  public.matched_volunteers_for_student, public.matched_volunteers_for_guardian
from anon, authenticated, service_role;
grant select on
  public.matched_students, public.matched_student_plan_items,
  public.matched_volunteers_for_student, public.matched_volunteers_for_guardian
to authenticated, service_role;

-- =====================================================================
-- 5) BEKLEYEN RIZA GÖRÜNÜMÜ: "en güncel yayımlanmış sürümü henüz onaylamadım mı?"
--
-- Hukuki metin yeni sürüme geçince (ör. gönüllü taahhüdü ve davranış kuralları v0.2) kullanıcıdan YENİDEN onay
-- alınması gerekir. Bu görünüm, ÇAĞIRANIN onaylaması gereken ama onaylamadığı rızaları listeler; satır yoksa her şey güncel.
-- Zorlama (uygulamada engelleme / yönlendirme) backend'indir; şema yalnızca soruyu cevaplar.
--
-- Kural:
--   * "en güncel sürüm" = legal_documents'ta published_at <= now() olanlardan published_at'i en yeni olan
--     (gelecek tarihli, henüz yayında olmayan sürüm sayılmaz; eşitlikte sürüm adı büyük olan),
--   * onay = granted = true VE withdrawn_at boş bir consents satırı o sürüm için,
--   * yalnızca çağıranın rolüne uygun (consent_types.audiences) ve etkin (is_active) türler,
--   * çocuğa bağlı türler (student_scoped, ör. AR-1) VELİ için ÇOCUK BAŞINA listelenir: çocuğun HÂLÂ velisi olan birinin
--     verdiği geçerli kayıt yeterlidir (biri onaylayınca iki veliden de kalkar),
--   * askıdaki / beklemedeki kullanıcı ve yönetici satır görmez.
-- Sütunlar:
--   consent_type          rıza türü kodu
--   student_id            çocuğa bağlı tür ise çocuk, değilse NULL
--   current_version       en güncel yayımlanmış sürüm; current_published_at yayın zamanı
--   last_accepted_version kullanıcının bu tür için EN SON verdiği (granted) sürüm; hiç vermediyse NULL (geri çekilmiş olsa da)
--   reason                'geri_cekildi_veya_reddedildi' (bu sürüm için kayıt var ama geçerli değil: geri çekilmiş ya da "vermiyorum")
--                         · 'hic_onaylanmadi' (ilk onay) · 'yeni_surum' (eski sürümü onaylamış: YENİDEN ONAY)
-- =====================================================================
create view public.my_pending_consents
with (security_barrier = true) as
select
  ct.code        as consent_type,
  null::uuid     as student_id,
  d.version      as current_version,
  d.published_at as current_published_at,
  lg.doc_version as last_accepted_version,
  case
    when exists (select 1 from public.consents x
                 where x.user_id = (select auth.uid()) and x.type = ct.code and x.student_id is null
                   and x.doc_version = d.version) then 'geri_cekildi_veya_reddedildi'
    when lg.doc_version is null then 'hic_onaylanmadi'
    else 'yeni_surum'
  end            as reason
from public.consent_types ct
cross join lateral (
  select ld.version, ld.published_at
  from public.legal_documents ld
  where ld.doc_type = ct.code and ld.published_at <= now()
  order by ld.published_at desc, ld.version desc
  limit 1
) d
left join lateral (
  select c.doc_version
  from public.consents c
  where c.user_id = (select auth.uid()) and c.type = ct.code and c.student_id is null and c.granted
  order by c.accepted_at desc, c.id
  limit 1
) lg on true
where ct.is_active
  and not ct.student_scoped
  and (select private.active_role()) = any (ct.audiences)
  and not exists (
    select 1 from public.consents c
    where c.user_id = (select auth.uid()) and c.type = ct.code and c.student_id is null
      and c.doc_version = d.version and c.granted and c.withdrawn_at is null)
union all
select
  ct.code,
  gs.student_id,
  d.version,
  d.published_at,
  lg.doc_version,
  case
    when exists (select 1 from public.consents x
                 join public.guardian_students g3 on g3.guardian_id = x.user_id and g3.student_id = x.student_id
                 where x.student_id = gs.student_id and x.type = ct.code and x.doc_version = d.version) then 'geri_cekildi_veya_reddedildi'
    when lg.doc_version is null then 'hic_onaylanmadi'
    else 'yeni_surum'
  end
from public.guardian_students gs
join public.consent_types ct on ct.is_active and ct.student_scoped
cross join lateral (
  select ld.version, ld.published_at
  from public.legal_documents ld
  where ld.doc_type = ct.code and ld.published_at <= now()
  order by ld.published_at desc, ld.version desc
  limit 1
) d
left join lateral (
  select c.doc_version
  from public.consents c
  join public.guardian_students g2 on g2.guardian_id = c.user_id and g2.student_id = c.student_id
  where c.student_id = gs.student_id and c.type = ct.code and c.granted
  order by c.accepted_at desc, c.id
  limit 1
) lg on true
where gs.guardian_id = (select auth.uid())
  and (select private.active_role()) = any (ct.audiences)
  and not exists (
    select 1
    from public.consents c
    join public.guardian_students g2 on g2.guardian_id = c.user_id and g2.student_id = c.student_id
    where c.student_id = gs.student_id and c.type = ct.code
      and c.doc_version = d.version and c.granted and c.withdrawn_at is null);

comment on view public.my_pending_consents is
  'Çağıranın onaylaması gereken ama onaylamadığı rızalar (en güncel yayımlanmış sürüm için). Satır yoksa güncel. Zorlama backend''indir.';

revoke all on public.my_pending_consents from anon, authenticated, service_role;
grant select on public.my_pending_consents to authenticated;
