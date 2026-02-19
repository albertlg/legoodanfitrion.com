import { useEffect, useMemo, useState } from "react";
import { hasSupabaseEnv, supabase } from "./lib/supabaseClient";

function toNullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toIsoDateTime(localDateTime) {
  if (!localDateTime) {
    return null;
  }
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getTokenFromLocation() {
  const search = new URLSearchParams(window.location.search);
  const queryToken = search.get("token");
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
  }

  if (window.location.pathname.startsWith("/rsvp/")) {
    const token = window.location.pathname.replace("/rsvp/", "").trim();
    return token || "";
  }

  return "";
}

function formatDate(dateText) {
  if (!dateText) {
    return "Sin fecha";
  }
  return new Date(dateText).toLocaleString();
}

function getThemeInitialValue() {
  const stored = window.localStorage.getItem("legood-theme");
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="btn btn-ghost" type="button" onClick={onToggle}>
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}

function PublicRsvpView({ token, theme, onToggleTheme }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("yes");
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setPageError("");
      const { data, error } = await supabase.rpc("get_invitation_public", {
        p_token: token
      });

      if (error) {
        setPageError(error.message);
        setInvitation(null);
        setIsLoading(false);
        return;
      }

      const first = data?.[0];
      if (!first) {
        setPageError("Invitación no encontrada o caducada.");
        setInvitation(null);
        setIsLoading(false);
        return;
      }

      setInvitation(first);
      if (first.guest_name) {
        setGuestName(first.guest_name);
      }
      if (first.rsvp_status && first.rsvp_status !== "pending") {
        setStatus(first.rsvp_status);
      }
      setIsLoading(false);
    };

    load();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitMessage("");
    setPageError("");
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc("submit_rsvp_by_token", {
      p_token: token,
      p_status: status,
      p_response_note: toNullable(note),
      p_guest_display_name: toNullable(guestName)
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitMessage(`No se pudo enviar tu RSVP: ${error.message}`);
      return;
    }

    setSubmitMessage("Tu respuesta ha quedado registrada. Gracias.");
    if (data?.[0]) {
      setInvitation((prev) => ({
        ...prev,
        rsvp_status: data[0].status
      }));
    }
  };

  return (
    <main className="page">
      <section className="card app-card">
        <header className="app-header">
          <div>
            <p className="eyebrow">LeGoodAnfitrion RSVP</p>
            <h1>Confirmar asistencia</h1>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </header>

        {isLoading ? <p>Cargando invitación...</p> : null}
        {pageError ? <p className="msg error">{pageError}</p> : null}

        {invitation ? (
          <form className="panel form-grid" onSubmit={handleSubmit}>
            <p className="hint">Evento</p>
            <p className="item-title">{invitation.event_title}</p>
            <p className="item-meta">Fecha: {formatDate(invitation.event_start_at)}</p>
            <p className="item-meta">
              Estado actual: <strong>{invitation.rsvp_status}</strong>
            </p>

            <label>
              Tu nombre (opcional)
              <input
                type="text"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Tu nombre"
              />
            </label>

            <label>
              ¿Asistirás?
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="yes">Sí</option>
                <option value="no">No</option>
                <option value="maybe">Tal vez</option>
              </select>
            </label>

            <label>
              Nota para el anfitrión (opcional)
              <textarea
                rows="3"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ejemplo: llegaré 30 minutos tarde."
              />
            </label>

            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Confirmar RSVP"}
            </button>
            {submitMessage ? <p className="msg">{submitMessage}</p> : null}
          </form>
        ) : null}

        <div className="button-row">
          <a className="btn btn-ghost" href="/">
            Volver al panel
          </a>
        </div>
      </section>
    </main>
  );
}

function App() {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", []);
  const [token, setToken] = useState(getTokenFromLocation);
  const [theme, setTheme] = useState(getThemeInitialValue);

  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventLocationName, setEventLocationName] = useState("");
  const [eventLocationAddress, setEventLocationAddress] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestRelationship, setGuestRelationship] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  const [dashboardError, setDashboardError] = useState("");
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [lastInvitationUrl, setLastInvitationUrl] = useState("");

  const recentEvents = events.slice(0, 5);
  const recentGuests = guests.slice(0, 5);
  const recentInvitations = invitations.slice(0, 8);

  const guestNamesById = useMemo(
    () =>
      Object.fromEntries(
        guests.map((guest) => [guest.id, `${guest.first_name || ""} ${guest.last_name || ""}`.trim()])
      ),
    [guests]
  );

  const eventNamesById = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event.title])),
    [events]
  );

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("legood-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onPopState = () => {
      setToken(getTokenFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      return undefined;
    }

    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError(error.message);
      } else {
        setSession(data.session);
      }
      setIsLoadingAuth(false);
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loadDashboardData = async (userId) => {
    if (!supabase) {
      return;
    }
    setDashboardError("");

    const eventsPromise = supabase
      .from("events")
      .select("id, title, status, start_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const guestsPromise = supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const invitationsPromise = supabase
      .from("invitations")
      .select("id, event_id, guest_id, status, public_token, created_at, responded_at")
      .eq("host_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const [
      { data: eventsData, error: eventsError },
      { data: guestsData, error: guestsError },
      { data: invitationsData, error: invitationsError }
    ] = await Promise.all([eventsPromise, guestsPromise, invitationsPromise]);

    if (eventsError || guestsError || invitationsError) {
      setDashboardError(
        eventsError?.message || guestsError?.message || invitationsError?.message || "No se pudieron cargar los datos."
      );
      return;
    }

    setEvents(eventsData || []);
    setGuests(guestsData || []);
    setInvitations(invitationsData || []);
  };

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setEvents([]);
      setGuests([]);
      setInvitations([]);
      return;
    }

    loadDashboardData(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
      return;
    }
    if (selectedEventId && !events.find((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0]?.id || "");
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedGuestId && guests.length > 0) {
      setSelectedGuestId(guests[0].id);
      return;
    }
    if (selectedGuestId && !guests.find((guest) => guest.id === selectedGuestId)) {
      setSelectedGuestId(guests[0]?.id || "");
    }
  }, [guests, selectedGuestId]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    setIsSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });
    setIsSigningIn(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setLoginPassword("");
  };

  const handleSignUp = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    setIsSigningUp(true);

    const email = loginEmail.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password: loginPassword,
      options: {
        data: {
          full_name: email.split("@")[0]
        }
      }
    });

    setIsSigningUp(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAccountMessage(
      "Cuenta creada. Si tienes confirmación de email activa en Supabase, revisa tu correo antes de iniciar sesión."
    );
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    await supabase.auth.signOut();
    setEventMessage("");
    setGuestMessage("");
    setInvitationMessage("");
    setLastInvitationUrl("");
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setEventMessage("");

    const cleanTitle = eventTitle.trim();
    if (!cleanTitle) {
      setEventMessage("El título del evento es obligatorio.");
      return;
    }

    setIsCreatingEvent(true);
    const payload = {
      host_user_id: session.user.id,
      title: cleanTitle,
      event_type: toNullable(eventType),
      start_at: toIsoDateTime(eventStartAt),
      timezone,
      location_name: toNullable(eventLocationName),
      location_address: toNullable(eventLocationAddress),
      status: "draft"
    };

    const { error } = await supabase.from("events").insert(payload);
    setIsCreatingEvent(false);

    if (error) {
      setEventMessage(`Error al crear evento: ${error.message}`);
      return;
    }

    setEventTitle("");
    setEventType("");
    setEventStartAt("");
    setEventLocationName("");
    setEventLocationAddress("");
    setEventMessage("Evento creado correctamente.");
    await loadDashboardData(session.user.id);
  };

  const handleCreateGuest = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setGuestMessage("");

    const cleanFirstName = guestFirstName.trim();
    const hasContact = guestEmail.trim() !== "" || guestPhone.trim() !== "";

    if (!cleanFirstName) {
      setGuestMessage("El nombre del invitado es obligatorio.");
      return;
    }
    if (!hasContact) {
      setGuestMessage("Debes informar al menos email o teléfono.");
      return;
    }

    setIsCreatingGuest(true);
    const payload = {
      host_user_id: session.user.id,
      first_name: cleanFirstName,
      last_name: toNullable(guestLastName),
      email: toNullable(guestEmail),
      phone: toNullable(guestPhone),
      relationship: toNullable(guestRelationship),
      city: toNullable(guestCity),
      country: toNullable(guestCountry)
    };

    const { error } = await supabase.from("guests").insert(payload);
    setIsCreatingGuest(false);

    if (error) {
      setGuestMessage(`Error al crear invitado: ${error.message}`);
      return;
    }

    setGuestFirstName("");
    setGuestLastName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestRelationship("");
    setGuestCity("");
    setGuestCountry("");
    setGuestMessage("Invitado creado correctamente.");
    await loadDashboardData(session.user.id);
  };

  const handleCreateInvitation = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }

    setInvitationMessage("");
    setLastInvitationUrl("");

    if (!selectedEventId || !selectedGuestId) {
      setInvitationMessage("Debes seleccionar un evento y un invitado.");
      return;
    }

    setIsCreatingInvitation(true);
    const selectedGuestName = guestNamesById[selectedGuestId] || null;

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        host_user_id: session.user.id,
        event_id: selectedEventId,
        guest_id: selectedGuestId,
        invite_channel: "link",
        guest_display_name: selectedGuestName
      })
      .select("id, event_id, guest_id, status, public_token, created_at")
      .single();

    setIsCreatingInvitation(false);

    if (error) {
      if (error.message?.includes("invitations_unique_event_guest")) {
        setInvitationMessage("Ese invitado ya tiene una invitación para este evento.");
      } else {
        setInvitationMessage(`Error al crear invitación: ${error.message}`);
      }
      return;
    }

    const url = `${window.location.origin}/?token=${data.public_token}`;
    setInvitationMessage("Invitación creada correctamente.");
    setLastInvitationUrl(url);
    await loadDashboardData(session.user.id);
  };

  const handleCopyInvitationLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setInvitationMessage("Enlace copiado al portapapeles.");
    } catch {
      setInvitationMessage("No pude copiar automáticamente. Copia el enlace manualmente.");
    }
  };

  if (!hasSupabaseEnv) {
    return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">Configuración pendiente</p>
          <h1>Falta conectar Supabase</h1>
          <p>
            Crea el archivo <code>frontend/.env</code> y añade <code>VITE_SUPABASE_URL</code> y{" "}
            <code>VITE_SUPABASE_ANON_KEY</code>. Luego reinicia con <code>docker compose up --build</code>.
          </p>
        </section>
      </main>
    );
  }

  if (token) {
    return <PublicRsvpView token={token} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <main className="page">
      <section className="card app-card">
        <header className="app-header">
          <div>
            <p className="eyebrow">LeGoodAnfitrion MVP</p>
            <h1>Login + Crear evento + Crear invitado + Invitar + RSVP</h1>
          </div>
          <div className="header-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {session?.user?.email ? (
              <div className="session-box">
                <p className="session-label">Sesión activa</p>
                <p className="session-value">{session.user.email}</p>
                <button className="btn btn-ghost" type="button" onClick={handleSignOut}>
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {isLoadingAuth ? <p>Cargando sesión...</p> : null}
        {authError ? <p className="msg error">{authError}</p> : null}
        {accountMessage ? <p className="msg success">{accountMessage}</p> : null}

        {!session?.user?.id ? (
          <form className="panel form-grid" onSubmit={handleSignIn}>
            <h2>Acceso</h2>
            <label>
              Email
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="tu@email.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                required
                minLength={6}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="******"
              />
            </label>
            <div className="button-row">
              <button className="btn" type="submit" disabled={isSigningIn || isSigningUp}>
                {isSigningIn ? "Iniciando..." : "Iniciar sesión"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={handleSignUp}
                disabled={isSigningIn || isSigningUp}
              >
                {isSigningUp ? "Creando..." : "Crear cuenta"}
              </button>
            </div>
          </form>
        ) : (
          <div className="dashboard-grid">
            <form className="panel form-grid" onSubmit={handleCreateEvent}>
              <h2>Crear evento</h2>
              <label>
                Título *
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="BBQ en casa"
                />
              </label>
              <label>
                Tipo de experiencia
                <input
                  type="text"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  placeholder="BBQ, Celebration, Movie Night..."
                />
              </label>
              <label>
                Fecha y hora
                <input
                  type="datetime-local"
                  value={eventStartAt}
                  onChange={(event) => setEventStartAt(event.target.value)}
                />
              </label>
              <label>
                Lugar
                <input
                  type="text"
                  value={eventLocationName}
                  onChange={(event) => setEventLocationName(event.target.value)}
                  placeholder="Casa de Alberto"
                />
              </label>
              <label>
                Dirección
                <input
                  type="text"
                  value={eventLocationAddress}
                  onChange={(event) => setEventLocationAddress(event.target.value)}
                  placeholder="Calle Ejemplo 123"
                />
              </label>
              <p className="hint">Zona horaria detectada: {timezone}</p>
              <button className="btn" type="submit" disabled={isCreatingEvent}>
                {isCreatingEvent ? "Creando evento..." : "Guardar evento"}
              </button>
              {eventMessage ? <p className="msg">{eventMessage}</p> : null}
            </form>

            <form className="panel form-grid" onSubmit={handleCreateGuest}>
              <h2>Crear invitado</h2>
              <label>
                Nombre *
                <input
                  type="text"
                  required
                  value={guestFirstName}
                  onChange={(event) => setGuestFirstName(event.target.value)}
                  placeholder="María"
                />
              </label>
              <label>
                Apellidos
                <input
                  type="text"
                  value={guestLastName}
                  onChange={(event) => setGuestLastName(event.target.value)}
                  placeholder="Pérez"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder="maria@email.com"
                />
              </label>
              <label>
                Teléfono
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  placeholder="+34..."
                />
              </label>
              <label>
                Relación
                <input
                  type="text"
                  value={guestRelationship}
                  onChange={(event) => setGuestRelationship(event.target.value)}
                  placeholder="Friend, Family, Coworker..."
                />
              </label>
              <label>
                Ciudad
                <input
                  type="text"
                  value={guestCity}
                  onChange={(event) => setGuestCity(event.target.value)}
                  placeholder="Barcelona"
                />
              </label>
              <label>
                País
                <input
                  type="text"
                  value={guestCountry}
                  onChange={(event) => setGuestCountry(event.target.value)}
                  placeholder="España"
                />
              </label>
              <button className="btn" type="submit" disabled={isCreatingGuest}>
                {isCreatingGuest ? "Creando invitado..." : "Guardar invitado"}
              </button>
              {guestMessage ? <p className="msg">{guestMessage}</p> : null}
            </form>

            <form className="panel form-grid" onSubmit={handleCreateInvitation}>
              <h2>Crear invitación (enlace RSVP)</h2>
              <label>
                Evento
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  disabled={events.length === 0}
                >
                  {events.length === 0 ? <option value="">Primero crea un evento</option> : null}
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Invitado
                <select
                  value={selectedGuestId}
                  onChange={(event) => setSelectedGuestId(event.target.value)}
                  disabled={guests.length === 0}
                >
                  {guests.length === 0 ? <option value="">Primero crea un invitado</option> : null}
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.first_name} {guest.last_name || ""}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="btn"
                type="submit"
                disabled={isCreatingInvitation || events.length === 0 || guests.length === 0}
              >
                {isCreatingInvitation ? "Creando invitación..." : "Generar enlace RSVP"}
              </button>
              {invitationMessage ? <p className="msg">{invitationMessage}</p> : null}

              {lastInvitationUrl ? (
                <div className="link-box">
                  <p className="hint">Enlace generado</p>
                  <input value={lastInvitationUrl} readOnly />
                  <div className="button-row">
                    <button className="btn btn-ghost" type="button" onClick={() => handleCopyInvitationLink(lastInvitationUrl)}>
                      Copiar enlace
                    </button>
                    <a className="btn btn-ghost" href={lastInvitationUrl} target="_blank" rel="noreferrer">
                      Abrir RSVP
                    </a>
                  </div>
                </div>
              ) : null}
            </form>

            <section className="panel">
              <h2>Últimos eventos</h2>
              {dashboardError ? <p className="msg error">{dashboardError}</p> : null}
              {recentEvents.length === 0 ? (
                <p>No hay eventos todavía.</p>
              ) : (
                <ul className="list">
                  {recentEvents.map((event) => (
                    <li key={event.id}>
                      <p className="item-title">{event.title}</p>
                      <p className="item-meta">
                        Estado: {event.status} · Fecha: {formatDate(event.start_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>Últimos invitados</h2>
              {recentGuests.length === 0 ? (
                <p>No hay invitados todavía.</p>
              ) : (
                <ul className="list">
                  {recentGuests.map((guest) => (
                    <li key={guest.id}>
                      <p className="item-title">
                        {guest.first_name} {guest.last_name || ""}
                      </p>
                      <p className="item-meta">{guest.email || guest.phone || "sin contacto"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel panel-wide">
              <h2>Últimas invitaciones</h2>
              {recentInvitations.length === 0 ? (
                <p>No hay invitaciones todavía.</p>
              ) : (
                <ul className="list">
                  {recentInvitations.map((invitation) => {
                    const eventName = eventNamesById[invitation.event_id] || invitation.event_id;
                    const guestName = guestNamesById[invitation.guest_id] || invitation.guest_id;
                    const url = `${window.location.origin}/?token=${invitation.public_token}`;
                    return (
                      <li key={invitation.id}>
                        <p className="item-title">
                          {eventName} · {guestName}
                        </p>
                        <p className="item-meta">
                          RSVP: {invitation.status} · Creada: {formatDate(invitation.created_at)}
                        </p>
                        <div className="button-row">
                          <button className="btn btn-ghost" type="button" onClick={() => handleCopyInvitationLink(url)}>
                            Copiar enlace
                          </button>
                          <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">
                            Abrir RSVP
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
