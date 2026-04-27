-- =============================================================================
-- 066_demo_seed.sql
-- Datos de showroom para la sección "Explorar" de LeGoodAnfitrión
-- Idempotente: se puede ejecutar N veces sin duplicar datos.
-- Demo user: demo@legoodanfitrion.com / LGA1234-FTW!
-- Demo UUID: de300000-0000-4000-a000-000000000001
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. USUARIO DEMO
-- =============================================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  role, aud, raw_app_meta_data, raw_user_meta_data, is_super_admin,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  'de300000-0000-4000-a000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'demo@legoodanfitrion.com',
  crypt('LGA1234-FTW!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Anfitrión Demo"}'::jsonb,
  false, now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, preferred_language, created_at, updated_at)
VALUES ('de300000-0000-4000-a000-000000000001', 'Anfitrión Demo', 'es', now(), now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. EVENTOS (6 total: 3 showcase + 3 personales)
-- =============================================================================

-- Showcase 1 — B2B Networking Cocktail
INSERT INTO public.events (
  id, host_user_id, title, description, event_type, status,
  start_at, end_at, timezone, location_name, location_address,
  max_guests, allow_plus_one, auto_reminders, dress_code, playlist_mode,
  active_modules, modules_version, created_at, updated_at
) VALUES (
  'e7e41000-0000-0000-0000-000000000001',
  'de300000-0000-4000-a000-000000000001',
  'Tech Networking Cocktail Q2 · LeGood',
  'Cóctel ejecutivo para profesionales del sector tech. Una velada íntima y sofisticada pensada para conectar, compartir ideas y explorar sinergias.',
  'networking', 'published',
  '2026-05-15 19:00:00+02', '2026-05-15 21:00:00+02',
  'Europe/Madrid', 'Espai Movistar Centre', 'Carrer de Fontanella 2, 08010 Barcelona',
  20, true, true, 'elegant', 'host_only',
  '{"date_poll":false,"finance":true,"tasks":true,"megaphone":true,"gallery":true,"spotify":false,"venues":false,"spaces":false,"shared_tasks":false,"meals":true,"ai_planner":true,"icebreaker":true,"accommodation":true,"transport":true}'::jsonb,
  1, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Showcase 2 — B2C Cumpleaños
INSERT INTO public.events (
  id, host_user_id, title, description, event_type, status,
  start_at, end_at, timezone, location_name, location_address,
  max_guests, allow_plus_one, auto_reminders, dress_code, playlist_mode,
  active_modules, modules_version, created_at, updated_at
) VALUES (
  'e7e41000-0000-0000-0000-000000000002',
  'de300000-0000-4000-a000-000000000001',
  'Cumpleaños de Marta · 35',
  'Celebración íntima del 35 cumpleaños de Marta con los amigos más cercanos. Noche de tapas, risas y buena música.',
  'party', 'published',
  '2026-06-07 20:00:00+02', '2026-06-08 01:00:00+02',
  'Europe/Madrid', 'Casa de Marta', 'Carrer de Còrsega 248, 08036 Barcelona',
  25, true, true, 'casual', 'spotify_collaborative',
  '{"date_poll":false,"finance":false,"tasks":true,"megaphone":true,"gallery":true,"spotify":true,"venues":false,"spaces":false,"shared_tasks":false,"meals":true,"ai_planner":true,"icebreaker":true,"accommodation":false,"transport":false}'::jsonb,
  1, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Showcase 3 — BBQ Familiar / Community
INSERT INTO public.events (
  id, host_user_id, title, description, event_type, status,
  start_at, end_at, timezone, location_name, location_address,
  max_guests, allow_plus_one, auto_reminders, dress_code, playlist_mode,
  active_modules, modules_version, created_at, updated_at
) VALUES (
  'e7e41000-0000-0000-0000-000000000003',
  'de300000-0000-4000-a000-000000000001',
  'Gran BBQ de Verano · Familia Hernández',
  'La barbacoa anual más esperada. Tres generaciones, dos barbacoas y muchas historias por compartir.',
  'bbq', 'published',
  '2026-07-12 14:00:00+02', '2026-07-12 21:00:00+02',
  'Europe/Madrid', 'Mas Can Riera', 'Carretera de les Fonts km 3, 08222 Terrassa',
  40, true, false, 'casual', 'collaborative',
  '{"date_poll":false,"finance":true,"tasks":true,"megaphone":true,"gallery":true,"spotify":false,"venues":false,"spaces":false,"shared_tasks":true,"meals":true,"ai_planner":true,"icebreaker":false,"accommodation":false,"transport":true}'::jsonb,
  1, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Personal 4 — Cena equipo (completada)
INSERT INTO public.events (
  id, host_user_id, title, description, event_type, status,
  start_at, end_at, timezone, location_name, location_address,
  allow_plus_one, auto_reminders, dress_code, playlist_mode,
  active_modules, modules_version, created_at, updated_at
) VALUES (
  'e7e41000-0000-0000-0000-000000000004',
  'de300000-0000-4000-a000-000000000001',
  'Cena de Equipo · Lanzamiento V2',
  'Cena del equipo para celebrar el lanzamiento de la nueva versión de la app.',
  'dinner', 'completed',
  '2026-04-10 21:00:00+02', '2026-04-11 00:00:00+02',
  'Europe/Madrid', 'Bodega 1900', 'Carrer de Tamarit 91, 08015 Barcelona',
  false, false, 'elegant', 'host_only',
  '{"date_poll":false,"finance":true,"tasks":false,"megaphone":false,"gallery":false,"spotify":false,"venues":false,"spaces":false,"shared_tasks":false,"meals":false,"ai_planner":true,"icebreaker":false,"accommodation":false,"transport":false}'::jsonb,
  1, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Personal 5 — Brunch (borrador)
INSERT INTO public.events (
  id, host_user_id, title, description, event_type, status,
  start_at, end_at, timezone,
  allow_plus_one, dress_code, playlist_mode,
  active_modules, modules_version, created_at, updated_at
) VALUES (
  'e7e41000-0000-0000-0000-000000000005',
  'de300000-0000-4000-a000-000000000001',
  'Brunch de Primavera',
  'Brunch relajado en terraza para arrancar el fin de semana con el mejor grupo.',
  'brunch', 'draft',
  '2026-05-03 12:00:00+02', '2026-05-03 15:00:00+02',
  'Europe/Madrid',
  true, 'none', 'collaborative',
  '{"date_poll":false,"finance":false,"tasks":false,"megaphone":true,"gallery":false,"spotify":false,"venues":false,"spaces":false,"shared_tasks":false,"meals":true,"ai_planner":true,"icebreaker":false,"accommodation":false,"transport":false}'::jsonb,
  1, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Personal 6 — Reunión máster (borrador)
INSERT INTO public.events (
  id, host_user_id, title, description, event_type, status,
  start_at, timezone, allow_plus_one, dress_code, playlist_mode,
  active_modules, modules_version, created_at, updated_at
) VALUES (
  'e7e41000-0000-0000-0000-000000000006',
  'de300000-0000-4000-a000-000000000001',
  'Reunión de Amigos del Máster',
  'Quedada anual del grupo del MBA. Ponerse al día, comer bien y recordar viejos tiempos.',
  'after_school_reunion', 'draft',
  '2026-06-20 19:00:00+02', 'Europe/Madrid',
  false, 'casual', 'collaborative',
  '{"date_poll":true,"finance":false,"tasks":false,"megaphone":true,"gallery":false,"spotify":false,"venues":true,"spaces":false,"shared_tasks":false,"meals":false,"ai_planner":true,"icebreaker":true,"accommodation":false,"transport":false}'::jsonb,
  1, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. INVITADOS (20 perfiles variados)
-- =============================================================================

INSERT INTO public.guests (id, host_user_id, first_name, last_name, email, city, country, relationship, notes, source, created_at, updated_at) VALUES
  ('90010000-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'Marc',       'Ferrer',     'marc.ferrer@email.com',      'Barcelona', 'España',  'friend',     'Amigo de la uni, muy puntual',             'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'Laura',      'Puig',       'laura.puig@email.com',        'Madrid',    'España',  'colleague',  'Compañera de trabajo, vegetariana',        'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'David',      'García',     'david.garcia@email.com',      'Barcelona', 'España',  'friend',     'Gran aficionado al deporte',               'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'Ana',        'Rodríguez',  'ana.rodriguez@email.com',     'Valencia',  'España',  'family',     'Prima, intolerante al gluten',             'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'Carlos',     'López',      'carlos.lopez@email.com',      'Barcelona', 'España',  'friend',     'Muy fan de la tecnología',                 'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'Isabel',     'Martín',     'isabel.martin@email.com',     'Madrid',    'España',  'colleague',  'Vegana estricta, le encanta el yoga',      'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000007', 'de300000-0000-4000-a000-000000000001', 'Roberto',    'Sánchez',    'roberto.sanchez@email.com',   'Bilbao',    'España',  'friend',     'Viene desde Bilbao, necesita alojamiento', 'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000008', 'de300000-0000-4000-a000-000000000001', 'Elena',      'Torres',     'elena.torres@email.com',      'Barcelona', 'España',  'friend',     'Bailarina, gran energía en los eventos',   'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000009', 'de300000-0000-4000-a000-000000000001', 'Jordi',      'Vall',       'jordi.vall@email.com',        'Barcelona', 'España',  'friend',     'Fotógrafo, siempre hace fotos geniales',   'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000010', 'de300000-0000-4000-a000-000000000001', 'Núria',      'Vilarrasa',  'nuria.vilarrasa@email.com',   'Barcelona', 'España',  'friend',     'Intolerante a la lactosa',                 'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000011', 'de300000-0000-4000-a000-000000000001', 'Alex',       'Kim',        'alex.kim@techcorp.com',       'Madrid',    'España',  'client',     'CTO de TechCorp, contacto clave',          'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000012', 'de300000-0000-4000-a000-000000000001', 'Sofía',      'Chen',       'sofia.chen@designhub.com',    'Barcelona', 'España',  'client',     'Directora de Diseño en DesignHub',         'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000013', 'de300000-0000-4000-a000-000000000001', 'Miguel Ángel','Ruiz',      'miguel.ruiz@ventures.com',    'Madrid',    'España',  'client',     'Inversor, viene en AVE',                   'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000014', 'de300000-0000-4000-a000-000000000001', 'Patricia',   'Herrero',    'patricia.herrero@green.com',  'Barcelona', 'España',  'client',     'Directora de Sostenibilidad, vegetariana', 'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000015', 'de300000-0000-4000-a000-000000000001', 'Thomas',     'Weber',      'thomas.weber@innovate.de',    'Madrid',    'España',  'client',     'VP Innovation, alemán viviendo en Madrid', 'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000016', 'de300000-0000-4000-a000-000000000001', 'Carmen',     'Flores',     'carmen.flores@email.com',     'Sevilla',   'España',  'family',     'Tía Carmen, viene con el tío Pepe',        'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000017', 'de300000-0000-4000-a000-000000000001', 'Pau',        'Hernández',  'pau.hernandez@email.com',     'Terrassa',  'España',  'friend',     'Vecino de toda la vida',                   'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000018', 'de300000-0000-4000-a000-000000000001', 'Montse',     'Vidal',      'montse.vidal@email.com',      'Terrassa',  'España',  'friend',     'Gran cocinera, siempre trae algo rico',    'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000019', 'de300000-0000-4000-a000-000000000001', 'Àlex',       'Bosch',      'alex.bosch@email.com',        'Barcelona', 'España',  'friend',     'DJ amateur en sus ratos libres',           'manual', now(), now()),
  ('90010000-0000-0000-0000-000000000020', 'de300000-0000-4000-a000-000000000001', 'Sandra',     'Oliva',      'sandra.oliva@email.com',      'Barcelona', 'España',  'colleague',  'Pescatariana, fan del yoga',               'manual', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Preferencias de invitados
INSERT INTO public.guest_preferences (
  guest_id, diet_type, tasting_preferences, food_likes, food_dislikes,
  drink_likes, music_genres, last_talk_topic, updated_at
) VALUES
  ('90010000-0000-0000-0000-000000000001', 'omnivore', ARRAY['carnes','marisco'], ARRAY['paella','pulpo'], ARRAY[]::text[], ARRAY['vino tinto','cerveza'], ARRAY['indie','rock'], 'Serie Succession', now()),
  ('90010000-0000-0000-0000-000000000002', 'vegetarian', ARRAY['verduras','pasta'], ARRAY['setas','quesos'], ARRAY['carne roja'], ARRAY['vino blanco','agua con gas'], ARRAY['jazz','bossa nova'], 'Sostenibilidad en el trabajo', now()),
  ('90010000-0000-0000-0000-000000000003', 'omnivore', ARRAY['carnes','tapas'], ARRAY['chuletón','patatas bravas'], ARRAY[]::text[], ARRAY['cerveza','whisky'], ARRAY['pop','reggaeton'], 'Champions League', now()),
  ('90010000-0000-0000-0000-000000000004', 'gluten_free', ARRAY['arroces','pescados'], ARRAY['arroz','ensalada','gambas'], ARRAY['pan','pasta'], ARRAY['agua','zumos'], ARRAY['pop español','flamenco'], 'Viaje a Japón', now()),
  ('90010000-0000-0000-0000-000000000005', 'omnivore', ARRAY['tecnología gastronómica','tapas'], ARRAY['ramen','sushi'], ARRAY[]::text[], ARRAY['gin tonic','cola zero'], ARRAY['electrónica','indie'], 'Modelos de lenguaje IA', now()),
  ('90010000-0000-0000-0000-000000000006', 'vegan', ARRAY['ensaladas','legumbres'], ARRAY['hummus','falafel','aguacate'], ARRAY['carne','pescado','lácteos','huevos'], ARRAY['kombucha','agua','vino natural'], ARRAY['ambient','yoga playlists'], 'Retiro de meditación en Toscana', now()),
  ('90010000-0000-0000-0000-000000000007', 'omnivore', ARRAY['carnes','pintxos'], ARRAY['txuleta','bacalao al pil-pil'], ARRAY[]::text[], ARRAY['vino tinto','txakoli'], ARRAY['rock clásico','folk'], 'Athletic Club', now()),
  ('90010000-0000-0000-0000-000000000008', 'omnivore', ARRAY['tapas','cocina internacional'], ARRAY['croquetas','hummus','tartares'], ARRAY[]::text[], ARRAY['rosado','gin tonic'], ARRAY['pop','R&B','dance'], 'Festival Sónar', now()),
  ('90010000-0000-0000-0000-000000000009', 'omnivore', ARRAY['cocina mediterránea'], ARRAY['mejillones','pizza','ensaladas'], ARRAY[]::text[], ARRAY['cerveza craft','sidra'], ARRAY['folk','indie','jazz'], 'Fotografía analógica', now()),
  ('90010000-0000-0000-0000-000000000010', 'lactose_free', ARRAY['pescados','ensaladas','pasta'], ARRAY['salmón','gazpacho','espaguetis sin queso'], ARRAY['queso','nata','mantequilla'], ARRAY['vino blanco','agua'], ARRAY['clásica','jazz'], 'Exposición de arte contemporáneo', now()),
  ('90010000-0000-0000-0000-000000000011', 'omnivore', ARRAY['cocina asiática','tapas'], ARRAY['sushi','pad thai'], ARRAY[]::text[], ARRAY['gin tonic','agua'], ARRAY['electrónica','hip-hop'], 'IA generativa en enterprise', now()),
  ('90010000-0000-0000-0000-000000000012', 'omnivore', ARRAY['cocina mediterránea','fusión'], ARRAY['ceviche','poke','tapas creativas'], ARRAY[]::text[], ARRAY['cava','vino blanco'], ARRAY['lounge','jazz','pop'], 'Diseño de experiencias digitales', now()),
  ('90010000-0000-0000-0000-000000000013', 'omnivore', ARRAY['carnes','cocina tradicional'], ARRAY['chuletón','cocido madrileño'], ARRAY['cocina picante'], ARRAY['vino tinto Rioja','agua'], ARRAY['clásica','pop'], 'Rondas de inversión en startups', now()),
  ('90010000-0000-0000-0000-000000000014', 'vegetarian', ARRAY['verduras','cereales'], ARRAY['buddha bowl','wok de verduras'], ARRAY['carne','pescado'], ARRAY['vino ecológico','kombucha'], ARRAY['indie','folk'], 'Certificaciones B-Corp', now()),
  ('90010000-0000-0000-0000-000000000015', 'omnivore', ARRAY['cocina alemana','española'], ARRAY['jamón','paella','bratwurst'], ARRAY['muy picante'], ARRAY['cerveza','vino tinto'], ARRAY['techno','jazz'], 'Innovación en automoción eléctrica', now()),
  ('90010000-0000-0000-0000-000000000016', 'omnivore', ARRAY['cocina andaluza','familiar'], ARRAY['gazpacho','pescaíto frito','salmorejo'], ARRAY[]::text[], ARRAY['manzanilla','rebujito'], ARRAY['flamenco','pop español'], 'Recetas de la abuela', now()),
  ('90010000-0000-0000-0000-000000000017', 'omnivore', ARRAY['carnes a la brasa','tapas'], ARRAY['butifarra','pan con tomate'], ARRAY[]::text[], ARRAY['cerveza','cava'], ARRAY['rock catalán','pop'], 'Trail running por Collserola', now()),
  ('90010000-0000-0000-0000-000000000018', 'omnivore', ARRAY['cocina catalana','repostería'], ARRAY['crema catalana','fideuà','pa amb tomàquet'], ARRAY[]::text[], ARRAY['cava','vino blanco'], ARRAY['pop catalán','jazz'], 'Taller de cocina en Boqueria', now()),
  ('90010000-0000-0000-0000-000000000019', 'omnivore', ARRAY['cocina mediterránea','street food'], ARRAY['kebab','sushi','tacos'], ARRAY[]::text[], ARRAY['gin','cervezas craft'], ARRAY['electrónica','house','drum and bass'], 'Próximo viaje a Tokio', now()),
  ('90010000-0000-0000-0000-000000000020', 'pescatarian', ARRAY['pescados','verduras','sushi'], ARRAY['salmón','espárragos','aguacate'], ARRAY['carne roja'], ARRAY['té matcha','agua','vino blanco'], ARRAY['ambient','yoga playlists','bossa nova'], 'Clases de acroyoga', now())
ON CONFLICT (guest_id) DO NOTHING;

-- Preferencias sensibles (sólo invitados con restricciones reales)
INSERT INTO public.guest_sensitive_preferences (
  guest_id, allergies, intolerances, pet_allergies, consent_granted, consent_version, consent_granted_at, updated_at
) VALUES
  ('90010000-0000-0000-0000-000000000004', ARRAY['gluten']::text[], ARRAY['gluten']::text[], ARRAY[]::text[], true, 'v1', now(), now()),
  ('90010000-0000-0000-0000-000000000006', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], true, 'v1', now(), now()),
  ('90010000-0000-0000-0000-000000000010', ARRAY[]::text[], ARRAY['lactosa']::text[], ARRAY[]::text[], true, 'v1', now(), now())
ON CONFLICT (guest_id) DO NOTHING;

-- =============================================================================
-- 4. INVITACIONES
-- =============================================================================

-- Evento 1: Tech Networking (10 invitados)
INSERT INTO public.invitations (
  id, host_user_id, event_id, guest_id, invite_channel, invitee_email,
  guest_display_name, public_token, status, responded_at,
  rsvp_plus_one, rsvp_dietary_needs, rsvp_interests, rsvp_group_tag,
  rsvp_needs_accommodation, rsvp_transport_mode, created_at, updated_at
) VALUES
  ('44440001-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000011', 'email', 'alex.kim@techcorp.com', 'Alex Kim', 'demo_tok_e1g11', 'yes', now() - interval '5 days', false, ARRAY[]::text[], ARRAY['tech','emprendimiento'], 'Clientes Tech', false, 'public_transport', now(), now()),
  ('44440001-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000012', 'email', 'sofia.chen@designhub.com', 'Sofía Chen', 'demo_tok_e1g12', 'yes', now() - interval '4 days', false, ARRAY[]::text[], ARRAY['diseño','tech'], 'Clientes Tech', false, 'own_car', now(), now()),
  ('44440001-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000013', 'email', 'miguel.ruiz@ventures.com', 'Miguel Ángel Ruiz', 'demo_tok_e1g13', 'yes', now() - interval '6 days', false, ARRAY[]::text[], ARRAY['finanzas','innovación'], 'Clientes Tech', false, 'flight', now(), now()),
  ('44440001-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000014', 'email', 'patricia.herrero@green.com', 'Patricia Herrero', 'demo_tok_e1g14', 'yes', now() - interval '3 days', false, ARRAY[]::text[], ARRAY['sostenibilidad','tech'], 'Clientes Tech', false, 'public_transport', now(), now()),
  ('44440001-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000015', 'email', 'thomas.weber@innovate.de', 'Thomas Weber', 'demo_tok_e1g15', 'yes', now() - interval '7 days', false, ARRAY[]::text[], ARRAY['innovación','automoción'], 'Clientes Tech', false, 'flight', now(), now()),
  ('44440001-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000003', 'email', 'david.garcia@email.com', 'David García', 'demo_tok_e1g03', 'yes', now() - interval '2 days', false, ARRAY[]::text[], ARRAY['deporte','tech'], 'Equipo Interno', false, 'own_car', now(), now()),
  ('44440001-0000-0000-0000-000000000007', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000005', 'email', 'carlos.lopez@email.com', 'Carlos López', 'demo_tok_e1g05', 'yes', now() - interval '1 day', false, ARRAY[]::text[], ARRAY['tech','cine'], 'Equipo Interno', false, 'public_transport', now(), now()),
  ('44440001-0000-0000-0000-000000000008', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000009', 'email', 'jordi.vall@email.com', 'Jordi Vall', 'demo_tok_e1g09', 'yes', now() - interval '3 days', false, ARRAY[]::text[], ARRAY['fotografía','tech'], 'Equipo Interno', false, 'own_car', now(), now()),
  ('44440001-0000-0000-0000-000000000009', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000006', 'email', 'isabel.martin@email.com', 'Isabel Martín', 'demo_tok_e1g06', 'maybe', now() - interval '2 days', false, ARRAY['vegano']::text[], ARRAY['yoga','tech'], 'Equipo Interno', false, 'public_transport', now(), now()),
  ('44440001-0000-0000-0000-000000000010', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000001', '90010000-0000-0000-0000-000000000001', 'email', 'marc.ferrer@email.com', 'Marc Ferrer', 'demo_tok_e1g01', 'pending', NULL, false, ARRAY[]::text[], ARRAY[]::text[], NULL, NULL, NULL, now(), now())
ON CONFLICT (event_id, guest_id) DO NOTHING;

-- Evento 2: Cumpleaños (12 invitados)
INSERT INTO public.invitations (
  id, host_user_id, event_id, guest_id, invite_channel, invitee_email,
  guest_display_name, public_token, status, responded_at,
  rsvp_plus_one, rsvp_dietary_needs, rsvp_interests, rsvp_group_tag,
  created_at, updated_at
) VALUES
  ('44440002-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000001', 'whatsapp', 'marc.ferrer@email.com', 'Marc', 'demo_tok_e2g01', 'yes', now() - interval '10 days', true, ARRAY[]::text[], ARRAY['música','fotografía'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000002', 'whatsapp', 'laura.puig@email.com', 'Laura', 'demo_tok_e2g02', 'yes', now() - interval '8 days', false, ARRAY['vegetariano']::text[], ARRAY['cocina','viajes'], 'Trabajo', now(), now()),
  ('44440002-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000003', 'whatsapp', 'david.garcia@email.com', 'David', 'demo_tok_e2g03', 'yes', now() - interval '9 days', true, ARRAY[]::text[], ARRAY['deporte','música'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000004', 'email', 'ana.rodriguez@email.com', 'Ana', 'demo_tok_e2g04', 'yes', now() - interval '7 days', false, ARRAY['sin gluten']::text[], ARRAY['viajes','familia'], 'Familia', now(), now()),
  ('44440002-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000005', 'whatsapp', 'carlos.lopez@email.com', 'Carlos', 'demo_tok_e2g05', 'yes', now() - interval '6 days', false, ARRAY[]::text[], ARRAY['tech','cine'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000006', 'whatsapp', 'isabel.martin@email.com', 'Isabel', 'demo_tok_e2g06', 'yes', now() - interval '5 days', false, ARRAY['vegano']::text[], ARRAY['yoga','naturaleza'], 'Trabajo', now(), now()),
  ('44440002-0000-0000-0000-000000000007', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000007', 'whatsapp', 'roberto.sanchez@email.com', 'Roberto', 'demo_tok_e2g07', 'yes', now() - interval '4 days', false, ARRAY[]::text[], ARRAY['deporte','música'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000008', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000008', 'whatsapp', 'elena.torres@email.com', 'Elena', 'demo_tok_e2g08', 'yes', now() - interval '3 days', true, ARRAY[]::text[], ARRAY['música','danza'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000009', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000009', 'whatsapp', 'jordi.vall@email.com', 'Jordi', 'demo_tok_e2g09', 'yes', now() - interval '2 days', false, ARRAY[]::text[], ARRAY['fotografía','música'], 'Trabajo', now(), now()),
  ('44440002-0000-0000-0000-000000000010', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000010', 'whatsapp', 'nuria.vilarrasa@email.com', 'Núria', 'demo_tok_e2g10', 'maybe', now() - interval '1 day', false, ARRAY['sin lactosa']::text[], ARRAY['arte','teatro'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000011', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000019', 'whatsapp', 'alex.bosch@email.com', 'Àlex', 'demo_tok_e2g19', 'maybe', now() - interval '1 day', true, ARRAY[]::text[], ARRAY['música','viajes'], 'Uni', now(), now()),
  ('44440002-0000-0000-0000-000000000012', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000002', '90010000-0000-0000-0000-000000000020', 'email', 'sandra.oliva@email.com', 'Sandra', 'demo_tok_e2g20', 'pending', NULL, false, ARRAY[]::text[], ARRAY[]::text[], NULL, now(), now())
ON CONFLICT (event_id, guest_id) DO NOTHING;

-- Evento 3: Gran BBQ (12 invitados)
INSERT INTO public.invitations (
  id, host_user_id, event_id, guest_id, invite_channel, invitee_email,
  guest_display_name, public_token, status, responded_at,
  rsvp_plus_one, rsvp_dietary_needs, rsvp_interests, rsvp_group_tag,
  rsvp_needs_accommodation, rsvp_transport_mode, created_at, updated_at
) VALUES
  ('44440003-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000016', 'whatsapp', 'carmen.flores@email.com', 'Carmen', 'demo_tok_e3g16', 'yes', now() - interval '14 days', true, ARRAY[]::text[], ARRAY['cocina','familia'], 'Familia', true, 'own_car', now(), now()),
  ('44440003-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000017', 'whatsapp', 'pau.hernandez@email.com', 'Pau', 'demo_tok_e3g17', 'yes', now() - interval '12 days', true, ARRAY[]::text[], ARRAY['deporte','naturaleza'], 'Amigos barrio', false, 'own_car', now(), now()),
  ('44440003-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000018', 'whatsapp', 'montse.vidal@email.com', 'Montse', 'demo_tok_e3g18', 'yes', now() - interval '10 days', false, ARRAY[]::text[], ARRAY['cocina','arte'], 'Amigos barrio', false, 'own_car', now(), now()),
  ('44440003-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000001', 'whatsapp', 'marc.ferrer@email.com', 'Marc', 'demo_tok_e3g01', 'yes', now() - interval '8 days', true, ARRAY[]::text[], ARRAY['música','fotografía'], 'Amigos uni', false, 'public_transport', now(), now()),
  ('44440003-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000003', 'whatsapp', 'david.garcia@email.com', 'David', 'demo_tok_e3g03', 'yes', now() - interval '6 days', true, ARRAY[]::text[], ARRAY['deporte','música'], 'Amigos uni', false, 'own_car', now(), now()),
  ('44440003-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000007', 'whatsapp', 'roberto.sanchez@email.com', 'Roberto', 'demo_tok_e3g07', 'yes', now() - interval '5 days', false, ARRAY[]::text[], ARRAY['deporte','cocina'], 'Amigos uni', true, 'flight', now(), now()),
  ('44440003-0000-0000-0000-000000000007', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000008', 'whatsapp', 'elena.torres@email.com', 'Elena', 'demo_tok_e3g08', 'yes', now() - interval '4 days', false, ARRAY[]::text[], ARRAY['música','danza'], 'Amigos uni', false, 'shared_car', now(), now()),
  ('44440003-0000-0000-0000-000000000008', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000002', 'email', 'laura.puig@email.com', 'Laura', 'demo_tok_e3g02', 'yes', now() - interval '3 days', false, ARRAY['vegetariano']::text[], ARRAY['cocina','viajes'], 'Trabajo', false, 'public_transport', now(), now()),
  ('44440003-0000-0000-0000-000000000009', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000006', 'whatsapp', 'isabel.martin@email.com', 'Isabel', 'demo_tok_e3g06', 'yes', now() - interval '2 days', false, ARRAY['vegano']::text[], ARRAY['yoga','naturaleza'], 'Trabajo', false, 'public_transport', now(), now()),
  ('44440003-0000-0000-0000-000000000010', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000010', 'whatsapp', 'nuria.vilarrasa@email.com', 'Núria', 'demo_tok_e3g10', 'maybe', now() - interval '1 day', false, ARRAY['sin lactosa']::text[], ARRAY['arte'], 'Amigos uni', false, NULL, now(), now()),
  ('44440003-0000-0000-0000-000000000011', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000019', 'whatsapp', 'alex.bosch@email.com', 'Àlex', 'demo_tok_e3g19', 'maybe', now() - interval '12 hours', true, ARRAY[]::text[], ARRAY['música','viajes'], 'Amigos uni', false, NULL, now(), now()),
  ('44440003-0000-0000-0000-000000000012', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000003', '90010000-0000-0000-0000-000000000020', 'email', 'sandra.oliva@email.com', 'Sandra', 'demo_tok_e3g20', 'pending', NULL, false, ARRAY[]::text[], ARRAY[]::text[], NULL, NULL, NULL, now(), now())
ON CONFLICT (event_id, guest_id) DO NOTHING;

-- Evento 4: Cena equipo (6 invitados, todos confirmados — evento pasado)
INSERT INTO public.invitations (
  id, host_user_id, event_id, guest_id, invite_channel, invitee_email,
  guest_display_name, public_token, status, responded_at,
  rsvp_dietary_needs, rsvp_interests, created_at, updated_at
) VALUES
  ('44440004-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000004', '90010000-0000-0000-0000-000000000012', 'email', 'sofia.chen@designhub.com', 'Sofía', 'demo_tok_e4g12', 'yes', now() - interval '20 days', ARRAY[]::text[], ARRAY['diseño'], now(), now()),
  ('44440004-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000004', '90010000-0000-0000-0000-000000000014', 'email', 'patricia.herrero@green.com', 'Patricia', 'demo_tok_e4g14', 'yes', now() - interval '18 days', ARRAY['vegetariano']::text[], ARRAY['diseño','sostenibilidad'], now(), now()),
  ('44440004-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000004', '90010000-0000-0000-0000-000000000009', 'email', 'jordi.vall@email.com', 'Jordi', 'demo_tok_e4g09', 'yes', now() - interval '15 days', ARRAY[]::text[], ARRAY['fotografía'], now(), now()),
  ('44440004-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000004', '90010000-0000-0000-0000-000000000005', 'email', 'carlos.lopez@email.com', 'Carlos', 'demo_tok_e4g05', 'yes', now() - interval '14 days', ARRAY[]::text[], ARRAY['tech'], now(), now()),
  ('44440004-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000004', '90010000-0000-0000-0000-000000000020', 'email', 'sandra.oliva@email.com', 'Sandra', 'demo_tok_e4g20', 'yes', now() - interval '13 days', ARRAY[]::text[], ARRAY['diseño'], now(), now()),
  ('44440004-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000004', '90010000-0000-0000-0000-000000000008', 'email', 'elena.torres@email.com', 'Elena', 'demo_tok_e4g08', 'yes', now() - interval '12 days', ARRAY[]::text[], ARRAY['diseño','música'], now(), now())
ON CONFLICT (event_id, guest_id) DO NOTHING;

-- Evento 5: Brunch (6 invitados, mix de estados)
INSERT INTO public.invitations (
  id, host_user_id, event_id, guest_id, invite_channel, invitee_email,
  guest_display_name, public_token, status, responded_at,
  rsvp_dietary_needs, rsvp_interests, created_at, updated_at
) VALUES
  ('44440005-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000005', '90010000-0000-0000-0000-000000000001', 'whatsapp', 'marc.ferrer@email.com', 'Marc', 'demo_tok_e5g01', 'yes', now() - interval '3 days', ARRAY[]::text[], ARRAY['música'], now(), now()),
  ('44440005-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000005', '90010000-0000-0000-0000-000000000002', 'whatsapp', 'laura.puig@email.com', 'Laura', 'demo_tok_e5g02', 'yes', now() - interval '2 days', ARRAY['vegetariano']::text[], ARRAY['cocina'], now(), now()),
  ('44440005-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000005', '90010000-0000-0000-0000-000000000003', 'whatsapp', 'david.garcia@email.com', 'David', 'demo_tok_e5g03', 'yes', now() - interval '1 day', ARRAY[]::text[], ARRAY['deporte'], now(), now()),
  ('44440005-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000005', '90010000-0000-0000-0000-000000000008', 'whatsapp', 'elena.torres@email.com', 'Elena', 'demo_tok_e5g08', 'maybe', now() - interval '1 day', ARRAY[]::text[], ARRAY['música'], now(), now()),
  ('44440005-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000005', '90010000-0000-0000-0000-000000000010', 'whatsapp', 'nuria.vilarrasa@email.com', 'Núria', 'demo_tok_e5g10', 'pending', NULL, ARRAY[]::text[], ARRAY[]::text[], now(), now()),
  ('44440005-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000005', '90010000-0000-0000-0000-000000000019', 'whatsapp', 'alex.bosch@email.com', 'Àlex', 'demo_tok_e5g19', 'pending', NULL, ARRAY[]::text[], ARRAY[]::text[], now(), now())
ON CONFLICT (event_id, guest_id) DO NOTHING;

-- Evento 6: Reunión máster (6 invitados)
INSERT INTO public.invitations (
  id, host_user_id, event_id, guest_id, invite_channel, invitee_email,
  guest_display_name, public_token, status, responded_at,
  rsvp_dietary_needs, rsvp_interests, created_at, updated_at
) VALUES
  ('44440006-0000-0000-0000-000000000001', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000006', '90010000-0000-0000-0000-000000000005', 'email', 'carlos.lopez@email.com', 'Carlos', 'demo_tok_e6g05', 'yes', now() - interval '1 day', ARRAY[]::text[], ARRAY['tech'], now(), now()),
  ('44440006-0000-0000-0000-000000000002', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000006', '90010000-0000-0000-0000-000000000007', 'email', 'roberto.sanchez@email.com', 'Roberto', 'demo_tok_e6g07', 'yes', now() - interval '12 hours', ARRAY[]::text[], ARRAY['deporte'], now(), now()),
  ('44440006-0000-0000-0000-000000000003', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000006', '90010000-0000-0000-0000-000000000009', 'email', 'jordi.vall@email.com', 'Jordi', 'demo_tok_e6g09', 'pending', NULL, ARRAY[]::text[], ARRAY[]::text[], now(), now()),
  ('44440006-0000-0000-0000-000000000004', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000006', '90010000-0000-0000-0000-000000000015', 'email', 'thomas.weber@innovate.de', 'Thomas', 'demo_tok_e6g15', 'pending', NULL, ARRAY[]::text[], ARRAY[]::text[], now(), now()),
  ('44440006-0000-0000-0000-000000000005', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000006', '90010000-0000-0000-0000-000000000011', 'email', 'alex.kim@techcorp.com', 'Alex', 'demo_tok_e6g11', 'pending', NULL, ARRAY[]::text[], ARRAY[]::text[], now(), now()),
  ('44440006-0000-0000-0000-000000000006', 'de300000-0000-4000-a000-000000000001', 'e7e41000-0000-0000-0000-000000000006', '90010000-0000-0000-0000-000000000013', 'email', 'miguel.ruiz@ventures.com', 'Miguel Ángel', 'demo_tok_e6g13', 'pending', NULL, ARRAY[]::text[], ARRAY[]::text[], now(), now())
ON CONFLICT (event_id, guest_id) DO NOTHING;

-- =============================================================================
-- 5. PLANES IA PRECARGADOS (3 eventos showcase)
-- =============================================================================

-- Plan snapshot Evento 1: Tech Networking Cocktail
INSERT INTO public.event_host_plans (
  host_user_id, event_id, version, generated_at, source, plan_context, plan_snapshot, model_meta
) VALUES (
  'de300000-0000-4000-a000-000000000001',
  'e7e41000-0000-0000-0000-000000000001',
  3,
  '2026-05-08 10:00:00+00',
  'gemini-2.0-flash',
  '{"eventType":"networking","guestCount":10,"confirmedCount":8,"dietaryFlags":["vegano","vegetariano"],"dressCode":"elegant","language":"es"}'::jsonb,
  '{
    "sections": {
      "menu": {
        "contextSummary": "Cóctel ejecutivo para 10 profesionales del sector tech. 8 confirmados. Una invitada vegana (Isabel) y una vegetariana (Patricia). Ambiente de pie, porciones pequeñas y elegantes para facilitar el networking.",
        "menuSections": [
          {"id":"m1","title":"Cócteles de Bienvenida","items":["Espumoso catalán brut nature con hibisco","Gin tonic premium con botánicos mediterráneos","Agua con gas artesanal y tónica (opciones sin alcohol)"]},
          {"id":"m2","title":"Canapés y Pinchos","items":["Blinis con crème fraîche y salmón salvaje","Bruschetta de tomate cherry y burrata — versión vegana disponible","Montadito de jamón ibérico con picos","Endivias con tartar de aguacate y granada (100% vegano)"]},
          {"id":"m3","title":"Estación de Quesos Artesanales","items":["Tabla de quesos catalanes: Garrotxa, Mató, Serrat","Membrillo de Puig-reig y miel de azahar","Selección de embutidos ibéricos con alternativa vegetal"]},
          {"id":"m4","title":"Mini Dulces de Cierre","items":["Petit fours de chocolate negro 70% (veganos)","Tartaletas de limón con crema pastelera","Dátiles Medjool rellenos de almendra tostada (veganos)"]}
        ],
        "recipeCards": []
      },
      "shopping": {
        "shoppingGroups": [
          {"id":"g1","title":"Bebidas","items":[
            {"id":"s1-1","name":"Cava brut nature catalán","quantity":"3 botellas","warning":""},
            {"id":"s1-2","name":"Gin premium (Hendrick''s)","quantity":"1 botella","warning":""},
            {"id":"s1-3","name":"Tónica artesanal surtida","quantity":"24 latas","warning":""},
            {"id":"s1-4","name":"Agua con gas premium","quantity":"12 botellas","warning":""}
          ]},
          {"id":"g2","title":"Canapés","items":[
            {"id":"s2-1","name":"Blinis frescos","quantity":"24 unidades","warning":"Contiene gluten y lactosa"},
            {"id":"s2-2","name":"Salmón ahumado salvaje","quantity":"200g","warning":"Alérgeno: pescado"},
            {"id":"s2-3","name":"Aguacates maduros","quantity":"3 unidades","warning":""},
            {"id":"s2-4","name":"Jamón ibérico loncheado","quantity":"150g","warning":""}
          ]},
          {"id":"g3","title":"Tabla de quesos","items":[
            {"id":"s3-1","name":"Queso Garrotxa (cabra)","quantity":"200g","warning":""},
            {"id":"s3-2","name":"Manchego curado","quantity":"200g","warning":"Lactosa"},
            {"id":"s3-3","name":"Membrillo artesanal","quantity":"1 tarro","warning":""}
          ]},
          {"id":"g4","title":"Dulces","items":[
            {"id":"s4-1","name":"Chocolate negro 70%","quantity":"200g","warning":"Puede contener trazas de frutos secos"},
            {"id":"s4-2","name":"Dátiles Medjool","quantity":"200g","warning":""},
            {"id":"s4-3","name":"Almendras tostadas sin sal","quantity":"100g","warning":"Alérgeno: frutos secos"}
          ]}
        ],
        "shoppingChecklist": [
          "Cava brut nature catalán (3 botellas)",
          "Gin premium Hendricks (1 botella)",
          "Tónica artesanal surtida (24 latas)",
          "Agua con gas premium (12 botellas)",
          "Blinis frescos (24 unidades)",
          "Salmón ahumado salvaje (200g)",
          "Aguacates maduros (3 unidades)",
          "Jamón ibérico loncheado (150g)",
          "Queso Garrotxa (200g)",
          "Manchego curado (200g)",
          "Membrillo artesanal (1 tarro)",
          "Chocolate negro 70% (200g)",
          "Dátiles Medjool (200g)",
          "Almendras tostadas sin sal (100g)"
        ],
        "estimatedCost": 185
      },
      "ambience": {
        "acceptanceRate": "80%",
        "actionableItems": [
          "Crear playlist instrumental tech-lounge en Spotify (mínimo 90 min, BPM bajo)",
          "Imprimir tarjetas de nombre con empresa y rol para facilitar el networking",
          "Organizar canapés en dos estaciones separadas para distribuir el flujo",
          "Etiquetar claramente opciones veganas con tarjeta visible (Isabel + otros)"
        ],
        "ambience": [
          "Iluminación cálida y tenue — lámparas de pie o velas LED, nada de fluorescente",
          "Música instrumental a 60-65 dB — audible pero sin interrumpir conversaciones",
          "Agrupar mobiliario en islas de 3-4 personas para dinamizar presentaciones espontáneas",
          "Centros de mesa minimalistas: ramas de eucalipto seco y velas negras cilíndricas"
        ],
        "conversation": [
          "Icebreaker de apertura: ''¿Cuál es el mayor reto de tu equipo este trimestre?''",
          "Tema facilitador: tendencias de IA generativa en productividad B2B",
          "Evitar: política y financiación propia (el grupo mezcla perfiles sensibles)",
          "Pregunta reveladora para el cierre: ''¿Qué herramienta descubriste este mes que ya no podrías abandonar?''"
        ]
      },
      "timings": {
        "timeline": [
          {"id":"t1","title":"D-7 · Confirmar caterer o compra de ingredientes","detail":"Si usas caterer, confirmar menú adaptado a Isabel (vegana) y Patricia (vegetariana). Si compras tú, reservar turno en Mercat de Santa Caterina el martes."},
          {"id":"t2","title":"D-3 · Enviar recordatorio a invitados","detail":"WhatsApp o email con dirección exacta del Espai Movistar Centre, indicaciones de parking y metro (L1/L3 Urquinaona, 5 min a pie)."},
          {"id":"t3","title":"D-1 · Montaje y preparación del espacio","detail":"Reservar 2 horas para configurar estaciones de canapés, tabla de quesos y sistema de música. Colocar etiquetas de alérgenos en todos los platos."},
          {"id":"t4","title":"19:00 · Apertura — copa de bienvenida","detail":"Recibir con copa en mano. Tener ambas opciones listas desde el inicio: espumoso y sin alcohol. Los primeros 15 min son clave para el tono del evento."},
          {"id":"t5","title":"19:20 · Inicio del networking informal","detail":"Los primeros 30 min son el momento más valioso. Actúa como conector activo entre los grupos Clientes Tech y Equipo Interno."},
          {"id":"t6","title":"20:00 · Apertura estación de quesos y canapés calientes","detail":"Activar la dinámica central. Mantener música e introducir 1-2 presentaciones formales breves si el grupo lo pide."},
          {"id":"t7","title":"21:00 · Cierre y despedida","detail":"Cerrar a tiempo muestra respeto por el tiempo de los ejecutivos. Tener preparado QR de LinkedIn o tarjeta de contacto para el follow-up."}
        ]
      },
      "communication": {
        "messages": [
          {"id":"ms1","title":"Invitación formal","text":"Hola [nombre], te invito a un cóctel de networking para profesionales del sector tech el 15 de mayo a las 19h en el Espai Movistar Centre (Fontanella 2, Barcelona). Será una velada íntima pensada para conectar y compartir ideas. ¿Puedes confirmar tu asistencia? 🥂"},
          {"id":"ms2","title":"Recordatorio D-3","text":"¡Nos vemos el miércoles! El cóctel empieza puntualmente a las 19h en Fontanella 2. Metro: L1/L3 Urquinaona (5 min). Parking: Plaça Catalunya. ¡Hasta pronto!"},
          {"id":"ms3","title":"Follow-up post-evento","text":"Muchas gracias por venir anoche, fue genial compartir ese espacio contigo. Si quieres seguir la conversación o explorar alguna colaboración, estaré encantado/a de tomar un café. ¡Hasta la próxima!"}
        ]
      },
      "risks": {
        "risks": [
          {"id":"r1","label":"Isabel Martín — vegana sin opciones etiquetadas","detail":"Preparar mínimo 3 opciones 100% veganas con etiqueta visible. Verificar que los blinis no lleven huevo (o sustituirlos por tostaditas de arroz para Isabel).","level":"yes"},
          {"id":"r2","label":"Thomas Weber y M.A. Ruiz — viaje en avión desde Madrid","detail":"Si hay retraso en el vuelo o el AVE, preparar un plan de bienvenida tardía que no interrumpa la dinámica. Compartir número de contacto con ambos.","level":"maybe"},
          {"id":"r3","label":"Aforo si todos los pendientes confirman","detail":"Marc Ferrer está pendiente. Si confirma, verificar que el aforo del espacio lo permite. El venue permite hasta 20 personas.","level":"maybe"},
          {"id":"r4","label":"Patricia Herrero — vegetariana cubierta","detail":"El menú actual incluye opciones vegetarianas claras. Sólo asegurarse de etiquetar. Riesgo bajo.","level":"no"}
        ]
      }
    },
    "alerts": {
      "critical": ["Isabel Martín: dieta vegana — etiquetar opciones claramente y separar de productos de origen animal"],
      "warning": ["Verificar llegada de Thomas Weber y M.A. Ruiz desde Madrid", "Confirmar aforo si Marc Ferrer acepta"]
    }
  }'::jsonb,
  '{"model":"gemini-2.0-flash","scope":"all","tokens_used":4821,"latency_ms":3240}'::jsonb
) ON CONFLICT ON CONSTRAINT event_host_plans_event_host_unique DO NOTHING;

-- Plan snapshot Evento 2: Cumpleaños de Marta
INSERT INTO public.event_host_plans (
  host_user_id, event_id, version, generated_at, source, plan_context, plan_snapshot, model_meta
) VALUES (
  'de300000-0000-4000-a000-000000000001',
  'e7e41000-0000-0000-0000-000000000002',
  2,
  '2026-05-20 16:30:00+00',
  'gemini-2.0-flash',
  '{"eventType":"party","guestCount":12,"confirmedCount":9,"dietaryFlags":["vegano","vegetariano","sin gluten","sin lactosa"],"dressCode":"casual","language":"es"}'::jsonb,
  '{
    "sections": {
      "menu": {
        "contextSummary": "Cumpleaños íntimo con 12 amigos. 9 confirmados, 2 en quizá, 1 pendiente. Dietas diversas: 1 vegana (Isabel), 1 vegetariana (Laura), 1 sin gluten (Ana), 1 sin lactosa (Núria). Formato cena en casa: platos para compartir y una tarta sorpresa.",
        "menuSections": [
          {"id":"m1","title":"Aperitivos de Bienvenida","items":["Patatas bravas clásicas (veganas)","Croquetas de jamón — aviso gluten para Ana","Hummus casero con crudités (vegano, sin gluten)","Guacamole con nachos (sin gluten)"]},
          {"id":"m2","title":"Platos Principales para Compartir","items":["Paella de marisco para la mesa (sin gluten natural)","Fideuà vegetal para Isabel y Laura","Ensalada mediterránea con rúcula, tomates cherry y anchoas","Pan de coca con tomate — sin gluten para Ana: versión de maíz"]},
          {"id":"m3","title":"Tabla de Quesos y Jamón","items":["Queso manchego curado — Núria: versión sin lactosa disponible","Jamón ibérico bellota","Uvas, higos secos y miel de tomillo"]},
          {"id":"m4","title":"Tarta de Cumpleaños Sorpresa","items":["Tarta de chocolate y frambuesa (gluten-free disponible)","Mini cupcakes de vainilla con frosting de mantequilla","Opción vegana: brownie de aguacate y cacao sin lácteos"]}
        ],
        "recipeCards": []
      },
      "shopping": {
        "shoppingGroups": [
          {"id":"g1","title":"Aperitivos","items":[
            {"id":"s1-1","name":"Patatas para bravas","quantity":"1 kg","warning":""},
            {"id":"s1-2","name":"Masa para croquetas (o croquetas congeladas)","quantity":"20 unidades","warning":"Gluten, lácteos — no apto Ana"},
            {"id":"s1-3","name":"Garbanzos cocidos (hummus)","quantity":"400g","warning":""},
            {"id":"s1-4","name":"Nachos sin gluten","quantity":"200g","warning":""}
          ]},
          {"id":"g2","title":"Platos principales","items":[
            {"id":"s2-1","name":"Arroz bomba para paella","quantity":"600g","warning":""},
            {"id":"s2-2","name":"Marisco variado (gambas, mejillones, calamar)","quantity":"1 kg","warning":"Alérgeno: marisco/moluscos"},
            {"id":"s2-3","name":"Fideos finos para fideuà vegetal","quantity":"400g","warning":"Gluten — preparar versión arroz para Ana si necesario"},
            {"id":"s2-4","name":"Pan de coca + alternativa sin gluten","quantity":"2 unidades","warning":""}
          ]},
          {"id":"g3","title":"Bebidas","items":[
            {"id":"s3-1","name":"Cava para el brindis","quantity":"3 botellas","warning":""},
            {"id":"s3-2","name":"Vino tinto joven","quantity":"2 botellas","warning":""},
            {"id":"s3-3","name":"Agua y refrescos","quantity":"12 unidades","warning":""},
            {"id":"s3-4","name":"Cerveza artesanal","quantity":"12 latas","warning":"Gluten"}
          ]},
          {"id":"g4","title":"Tarta y postre","items":[
            {"id":"s4-1","name":"Tarta de cumpleaños encargada (+ versión sin gluten)","quantity":"1 unidad","warning":"Pedir con 3 días de antelación"},
            {"id":"s4-2","name":"Brownie vegano de cacao","quantity":"8 porciones","warning":"Comprobar ausencia de lácteos para Isabel"},
            {"id":"s4-3","name":"35 velas de cumpleaños","quantity":"1 pack","warning":""}
          ]}
        ],
        "shoppingChecklist": [
          "Patatas para bravas (1 kg)",
          "Croquetas congeladas (20 unidades)",
          "Garbanzos cocidos hummus (400g)",
          "Nachos sin gluten (200g)",
          "Arroz bomba (600g)",
          "Marisco variado (1 kg)",
          "Fideos finos fideuà vegetal (400g)",
          "Pan de coca + alternativa sin gluten",
          "Cava para brindis (3 botellas)",
          "Vino tinto joven (2 botellas)",
          "Agua y refrescos (12 unidades)",
          "Cerveza artesanal (12 latas)",
          "Tarta cumpleaños (encargo + sin gluten)",
          "Brownie vegano cacao (8 porciones)",
          "35 velas de cumpleaños"
        ],
        "estimatedCost": 220
      },
      "ambience": {
        "acceptanceRate": "75%",
        "actionableItems": [
          "Crear playlist colaborativa en Spotify y compartir el link con todos los invitados",
          "Decorar con fotos de Marta a lo largo de los años — efecto ''pared de recuerdos''",
          "Preparar una tarjeta colectiva donde cada invitado escriba un deseo para Marta",
          "Reservar espacio despejado para improvisar pista de baile a partir de las 22h"
        ],
        "ambience": [
          "Luces de colores cálidos y guirnaldas de LED — crear ambiente íntimo y festivo a la vez",
          "Playlist colaborativa: pedir a cada invitado que añada 2 canciones favoritas de Marta",
          "Globos en tonos terracota y verde oscuro — evitar el rosa clásico para algo más sofisticado",
          "Zona de fotos con fondo simple y props divertidos (gafas, sombreros, cartel ''35 y radiante'')"
        ],
        "conversation": [
          "Icebreaker en la mesa: ''Di una palabra que describa a Marta en tu primera memoria juntos''",
          "Momento emotivo: cada invitado lee en voz alta su deseo de la tarjeta colectiva",
          "Tema que engancha a todos: anécdotas del grupo — el viaje a Lisboa, la noche que...",
          "Evitar: hablar de trabajo los primeros 45 min — que sea una noche de amistad pura"
        ]
      },
      "timings": {
        "timeline": [
          {"id":"t1","title":"D-5 · Encargar la tarta de cumpleaños","detail":"Llamar a la pastelería para reservar tarta de chocolate y frambuesa con versión sin gluten. Especificar que son 35 velas y que la tarta sea para 12 personas."},
          {"id":"t2","title":"D-3 · Compartir playlist colaborativa de Spotify","detail":"Crear la lista, compartir el link en el grupo de WhatsApp y pedir a cada invitado que añada 2 canciones favoritas de Marta antes del viernes."},
          {"id":"t3","title":"D-1 · Hacer la compra y preparar la decoración","detail":"Comprar ingredientes para paella y fideuà. Montar la ''pared de recuerdos'' con fotos de Marta. Preparar la tarjeta colectiva para que los invitados puedan firmar al llegar."},
          {"id":"t4","title":"20:00 · Recibir a los invitados — aperitivos","detail":"Recepción con aperitivos y la playlist ya sonando. Los primeros 45 min son para el reencuentro. No forzar demasiada estructura — que fluya."},
          {"id":"t5","title":"21:00 · Cena y brindis","detail":"Servir la paella y la fideuà juntas para que todos coman a la vez. Brindis antes de sentarse: que cada invitado levante la copa y diga la ''palabra que describe a Marta''."},
          {"id":"t6","title":"22:30 · Tarta sorpresa y tarjeta colectiva","detail":"Apagar las luces, entrar con la tarta con las 35 velas encendidas. Después de soplar, leer la tarjeta colectiva — momento emotivo garantizado."},
          {"id":"t7","title":"23:00 · Pista de baile y cierre libre","detail":"A partir de aquí, modo fiesta. Àlex (DJ amateur) puede tomar el control de la playlist. El evento no tiene hora de cierre definida."}
        ]
      },
      "communication": {
        "messages": [
          {"id":"ms1","title":"Invitación informal por WhatsApp","text":"¡Hola [nombre]! Te escribo para invitarte a la celebración del 35 cumpleaños de Marta 🎂 Será el sábado 7 de junio a las 20h en su casa de Còrsega 248. Habrá paella, tarta sorpresa y mucha buena música. ¿Puedes venir? Necesito confirmación antes del 1 de junio 🙏"},
          {"id":"ms2","title":"Compartir playlist de Spotify","text":"¡Hola a todos! Para la noche del cumpleaños de Marta he creado una playlist colaborativa 🎵 Podéis añadir las canciones que más la representen: [link Spotify]. La pondremos durante toda la noche. ¡Gracias!"},
          {"id":"ms3","title":"Recordatorio última semana","text":"¡Ya falta poco para celebrar a Marta! El sábado 7 de junio a las 20h en su casa. Si tenéis alguna restricción alimentaria que no hayáis mencionado, avisadme antes del jueves. ¡Nos vemos!"}
        ]
      },
      "risks": {
        "risks": [
          {"id":"r1","label":"Ana Rodríguez — intolerante al gluten","detail":"Verificar que la tarta encargada tenga versión sin gluten certificada. Informar a todos los que cocinen que Ana no puede tomar gluten ni trazas. Evitar gluten en los utensilios compartidos.","level":"yes"},
          {"id":"r2","label":"Isabel Martín — vegana en menú de carne","detail":"La fideuà vegetal y el brownie de cacao están confirmados como opciones veganas. Verificar que el aceite de la paella no se use también en la fideuà (contaminación cruzada).","level":"maybe"},
          {"id":"r3","label":"Núria Vilarrasa — sin lactosa aún sin confirmar asistencia","detail":"Núria está en ''quizá''. Si confirma, asegurarse de tener opción de queso sin lactosa en la tabla. El brownie vegano también le sirve de postre.","level":"maybe"},
          {"id":"r4","label":"Marc y David vienen con +1 — espacio de la casa","detail":"Marc y David confirmaron con +1 (pareja). Total real podría ser hasta 14 personas. Verificar que hay espacio suficiente en el comedor y suficiente comida.","level":"maybe"}
        ]
      }
    },
    "alerts": {
      "critical": ["Ana Rodríguez: intolerante al gluten — tarta + platos principales deben tener opción sin gluten certificada"],
      "warning": ["Isabel Martín: vegana — verificar fideuà sin productos animales", "Confirmar +1 de Marc y David para ajustar cantidades de comida"]
    }
  }'::jsonb,
  '{"model":"gemini-2.0-flash","scope":"all","tokens_used":5134,"latency_ms":3780}'::jsonb
) ON CONFLICT ON CONSTRAINT event_host_plans_event_host_unique DO NOTHING;

-- Plan snapshot Evento 3: Gran BBQ Familiar
INSERT INTO public.event_host_plans (
  host_user_id, event_id, version, generated_at, source, plan_context, plan_snapshot, model_meta
) VALUES (
  'de300000-0000-4000-a000-000000000001',
  'e7e41000-0000-0000-0000-000000000003',
  1,
  '2026-06-01 09:00:00+00',
  'gemini-2.0-flash',
  '{"eventType":"bbq","guestCount":12,"confirmedCount":9,"dietaryFlags":["vegano","vegetariano","sin lactosa"],"dressCode":"casual","language":"es"}'::jsonb,
  '{
    "sections": {
      "menu": {
        "contextSummary": "BBQ familiar en mas de campo para 12 invitados confirmados más posibles +1. Ambiente multigeneracional (familia Hernández + amigos del barrio + amigos universitarios). Una vegana (Isabel), una vegetariana (Laura), una sin lactosa (Núria). Roberto viene desde Bilbao y necesita alojamiento. Dos invitados más con +1. Evento de tarde larga (14h-21h).",
        "menuSections": [
          {"id":"m1","title":"Aperitivos y Bienvenida (14-15h)","items":["Pan con tomate y aceite de oliva (vegano)","Crudités con hummus y guacamole (vegano, sin gluten)","Embutidos ibéricos: fuet, llonganissa, salchichón","Queso fresco de la zona con membrillo"]},
          {"id":"m2","title":"BBQ Principal (16-18h)","items":["Butifarras blancas y negras a la brasa","Pinchos de pollo marinado con limón y hierbas","Hamburguesas artesanales de ternera","Opción vegana: hamburguesas de lentejas y boniato — en parrilla aparte","Verduras asadas: pimientos, berenjenas, calabacín, cebolla dulce","Mazorcas de maíz a la brasa con mantequilla de hierbas"]},
          {"id":"m3","title":"Guarniciones y Ensaladas","items":["Ensalada de patata con cebolleta y mostaza (vegana)","Ensalada verde con tomate de temporada, aceitunas Arbequina","Pan de payés a la brasa con aceite de ajo","Patatas al romero al horno (veganas, sin gluten)"]},
          {"id":"m4","title":"Postres y Cierre (19-21h)","items":["Sandía y melón frescos (veganos, sin gluten)","Helados artesanales variados — opción sin lactosa para Núria","Crema catalana casera — aviso lactosa","Cocas de recapte para picar al atardecer"]}
        ],
        "recipeCards": []
      },
      "shopping": {
        "shoppingGroups": [
          {"id":"g1","title":"Carnes y proteínas","items":[
            {"id":"s1-1","name":"Butifarras blancas","quantity":"16 unidades","warning":""},
            {"id":"s1-2","name":"Butifarras negras","quantity":"8 unidades","warning":""},
            {"id":"s1-3","name":"Pechuga de pollo para pinchos","quantity":"1,5 kg","warning":""},
            {"id":"s1-4","name":"Hamburguesas artesanales de ternera","quantity":"12 unidades","warning":""},
            {"id":"s1-5","name":"Hamburguesas veganas de lentejas","quantity":"4 unidades","warning":"Verificar sin trazas lácteos para Isabel"}
          ]},
          {"id":"g2","title":"Verduras y frutas","items":[
            {"id":"s2-1","name":"Pimientos variados (rojo, verde, amarillo)","quantity":"4 kg","warning":""},
            {"id":"s2-2","name":"Berenjenas","quantity":"4 unidades","warning":""},
            {"id":"s2-3","name":"Mazorcas de maíz","quantity":"10 unidades","warning":""},
            {"id":"s2-4","name":"Sandía grande","quantity":"1 unidad (5 kg aprox.)","warning":""},
            {"id":"s2-5","name":"Melón Galia","quantity":"2 unidades","warning":""},
            {"id":"s2-6","name":"Patatas","quantity":"2 kg","warning":""}
          ]},
          {"id":"g3","title":"Bebidas","items":[
            {"id":"s3-1","name":"Cerveza en lata (variada)","quantity":"48 latas","warning":"Gluten"},
            {"id":"s3-2","name":"Cava para brindis","quantity":"2 botellas","warning":""},
            {"id":"s3-3","name":"Agua mineral","quantity":"24 botellas","warning":""},
            {"id":"s3-4","name":"Refrescos variados","quantity":"24 latas","warning":""},
            {"id":"s3-5","name":"Zumos naturales (niños y conductores)","quantity":"6 litros","warning":""}
          ]},
          {"id":"g4","title":"Pan y extras","items":[
            {"id":"s4-1","name":"Pan de payés grande","quantity":"3 barras","warning":"Gluten"},
            {"id":"s4-2","name":"Helados artesanales surtidos","quantity":"16 unidades","warning":"Pedir opción sin lactosa para Núria"},
            {"id":"s4-3","name":"Carbón vegetal para BBQ","quantity":"5 kg","warning":""},
            {"id":"s4-4","name":"Brochetas de madera","quantity":"50 unidades","warning":"Remojar 30 min antes de usar"}
          ]}
        ],
        "shoppingChecklist": [
          "Butifarras blancas (16 unidades)",
          "Butifarras negras (8 unidades)",
          "Pechuga de pollo para pinchos (1,5 kg)",
          "Hamburguesas artesanales de ternera (12 unidades)",
          "Hamburguesas veganas de lentejas (4 unidades)",
          "Pimientos variados (4 kg)",
          "Berenjenas (4 unidades)",
          "Mazorcas de maíz (10 unidades)",
          "Sandía grande (5 kg aprox.)",
          "Melón Galia (2 unidades)",
          "Patatas (2 kg)",
          "Cerveza en lata variada (48 latas)",
          "Cava para brindis (2 botellas)",
          "Agua mineral (24 botellas)",
          "Refrescos variados (24 latas)",
          "Zumos naturales (6 litros)",
          "Pan de payés grande (3 barras)",
          "Helados artesanales surtidos (16 unidades)",
          "Carbón vegetal para BBQ (5 kg)",
          "Brochetas de madera (50 unidades)"
        ],
        "estimatedCost": 310
      },
      "ambience": {
        "acceptanceRate": "75%",
        "actionableItems": [
          "Montar zona de sombra adicional si el día es muy soleado — buscar toldo o parasoles grandes",
          "Preparar actividad para los niños del grupo: zona de juegos o hinchable si hay espacio",
          "Asignar a alguien del grupo (Montse o Pau) para gestionar la BBQ en turnos de 1 hora",
          "Crear playlist folk-pop catalán compartida: pedir a todos que añadan su canción favorita del verano"
        ],
        "ambience": [
          "Mesa larga en el exterior con mantel a cuadros vichy — ambiente rústico y familiar",
          "Música a volumen moderado: folk catalán, pop veraniego, Rock catalán clásico (Sopa de Cabra, Els Pets)",
          "Juego de petanca o frisbee como actividad entre turnos de barbacoa",
          "Al atardecer: velas y farolillos sobre la mesa para una transición suave a la noche"
        ],
        "conversation": [
          "Icebreaker multigeneracional: ''Cuéntanos tu primer recuerdo de una BBQ familiar''",
          "Actividad: ''El gran torneo de petanca Hernández'' — equipos mezclados entre generaciones",
          "Tema que une a todos: planes de verano y destinos de vacaciones",
          "Momento emotivo: brindis de Carmen (la tía mayor) — darle el micrófono antes del postre"
        ]
      },
      "timings": {
        "timeline": [
          {"id":"t1","title":"D-10 · Confirmar alojamiento para Roberto","detail":"Roberto viene desde Bilbao. Tiene marcado que necesita alojamiento. Explorar si hay habitaciones libres en el Mas o buscar alojamiento rural cercano en Terrassa (Can Riera zona)."},
          {"id":"t2","title":"D-7 · Compra principal en mercado o mayorista","detail":"Lista completa de carnes, verduras y bebidas. Para este volumen, valorar ir a un cash and carry o al Mercabarna. Presupuesto estimado: 310€."},
          {"id":"t3","title":"D-3 · Confirmar transporte del grupo Barcelona → Terrassa","detail":"Àlex y Elena mencionaron venir juntos. Coordinar coche compartido para el grupo de Barcelona. Alternativa: tren a Terrassa + taxi/Cabify al Mas (10 min)."},
          {"id":"t4","title":"D-1 · Preparar marinados y mise en place","detail":"Marinar los pinchos de pollo el día antes (limón, ajo, romero, aceite). Preparar la ensalada de patata. Montar la zona exterior y verificar que la BBQ funcione correctamente."},
          {"id":"t5","title":"13:30 · Llegada y montaje final","detail":"Llegar 30 min antes para encender el carbón (necesita 30 min para estar a punto). Organizar la mesa y zona de bebidas. Poner la música."},
          {"id":"t6","title":"14:00 · Apertura — aperitivos y bienvenida","detail":"Primera ronda de pan con tomate, embutidos y hummus mientras el carbón se prepara. Momento de reencuentro — no forzar estructura."},
          {"id":"t7","title":"16:00 · BBQ principal — primer turno","detail":"Empezar con las butifarras y los pinchos de pollo. Parrilla aparte para las hamburguesas veganas de Isabel. Turnos de 1h para que el cocinero no se queme (literalmente)."},
          {"id":"t8","title":"19:00 · Postres, brindis de Carmen y cierre suave","detail":"Sacar la sandía, melón y helados. Dar el micrófono a Carmen para el brindis familiar. Farolillos encendidos. El evento se cierra orgánicamente — no hay hora fija."}
        ]
      },
      "communication": {
        "messages": [
          {"id":"ms1","title":"Convocatoria por WhatsApp del grupo familiar","text":"¡Ya está aquí la BBQ anual de los Hernández! 🔥 Este año será el 12 de julio a las 14h en el Mas Can Riera (Terrassa). Habrá butifarras, pinchos, ensaladas y toda la familia. ¿Quién viene? Confirmar antes del 1 de julio y decir si traéis +1 😊"},
          {"id":"ms2","title":"Coordinación de transporte","text":"Para los que venís de Barcelona: hay sitio en el coche de [nombre conductor]. Salida a las 13h desde [punto de encuentro]. Si preferís tren: Renfe a Terrassa + taxi. Quien necesite alojamiento para quedarse a dormir, que lo diga esta semana 🙋"},
          {"id":"ms3","title":"Recordatorio con menú y restricciones","text":"¡Falta poco para la BBQ! Recordad que habrá opciones veganas, vegetarianas y sin lactosa — no hace falta que traigáis nada especial. Si queréis traer algo de postre o bebida extra, os lo agradecemos. ¡Nos vemos el domingo!"}
        ]
      },
      "risks": {
        "risks": [
          {"id":"r1","label":"Roberto Sánchez — necesita alojamiento (Bilbao)","detail":"Roberto tiene marcado que necesita alojamiento. Hay que resolver esto antes de D-10. Opciones: habitación en el Mas si las hay, o rural cercano. Presupuesto estimado 40-60€/noche.","level":"yes"},
          {"id":"r2","label":"Isabel Martín — vegana en BBQ de carnes","detail":"Hamburguesas veganas en parrilla separada y limpia. Verificar que los utensilios (espátulas, pinzas) no se usan indistintamente. Mencionar explícitamente a quien gestione la BBQ.","level":"maybe"},
          {"id":"r3","label":"Calor extremo en julio en Terrassa","detail":"Julio en Terrassa puede superar los 35°C. Verificar que hay zona de sombra suficiente. Tener nevera con hielo extra. Empezar los aperitivos en interior si hace mucho calor.","level":"maybe"},
          {"id":"r4","label":"Laura Puig — vegetariana cubierta","detail":"Las verduras asadas y las ensaladas cubren bien la dieta vegetariana. Sin riesgo si se comunica al cocinero que reserve verduras sin contacto con carnes.","level":"no"}
        ]
      }
    },
    "alerts": {
      "critical": ["Roberto Sánchez necesita alojamiento — gestionar antes del 2 de julio"],
      "warning": ["Isabel Martín: vegana — parrilla separada para sus hamburguesas", "Revisar previsión de temperatura en Terrassa: plan B si supera 36°C"]
    }
  }'::jsonb,
  '{"model":"gemini-2.0-flash","scope":"all","tokens_used":5620,"latency_ms":4102}'::jsonb
) ON CONFLICT ON CONSTRAINT event_host_plans_event_host_unique DO NOTHING;

-- =============================================================================
-- FIN DEL SCRIPT
-- Verificar con:
--   SELECT id, email FROM auth.users WHERE id = 'de300000-0000-4000-a000-000000000001';
--   SELECT id, title, status FROM public.events WHERE host_user_id = 'de300000-0000-4000-a000-000000000001';
--   SELECT COUNT(*) FROM public.guests WHERE host_user_id = 'de300000-0000-4000-a000-000000000001';
--   SELECT COUNT(*) FROM public.invitations WHERE host_user_id = 'de300000-0000-4000-a000-000000000001';
--   SELECT event_id, version, source FROM public.event_host_plans WHERE host_user_id = 'de300000-0000-4000-a000-000000000001';
-- =============================================================================
