const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services-script";
const GOOGLE_CONTACTS_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CONTACTS_CLIENT_ID || "").trim();
const GOOGLE_PEOPLE_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
const GOOGLE_CONNECTIONS_FIELDS = [
  "names",
  "emailAddresses",
  "phoneNumbers",
  "addresses",
  "organizations",
  "birthdays",
  "memberships"
].join(",");

let identityLoadPromise;

function isGoogleContactsConfigured() {
  return Boolean(GOOGLE_CONTACTS_CLIENT_ID);
}

function loadGoogleIdentityServices() {
  if (!isGoogleContactsConfigured()) {
    return Promise.reject(new Error("Google Contacts client ID not configured."));
  }

  if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }

  if (identityLoadPromise) {
    return identityLoadPromise;
  }

  identityLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services.")));
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });

  return identityLoadPromise;
}

function requestGooglePeopleAccessToken() {
  return loadGoogleIdentityServices().then(
    () =>
      new Promise((resolve, reject) => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CONTACTS_CLIENT_ID,
          scope: GOOGLE_PEOPLE_SCOPE,
          callback: (response) => {
            if (response?.error) {
              reject(new Error(String(response.error_description || response.error || "Google auth error")));
              return;
            }
            if (!response?.access_token) {
              reject(new Error("Missing Google access token."));
              return;
            }
            resolve(response.access_token);
          }
        });
        tokenClient.requestAccessToken({ prompt: "consent" });
      })
  );
}

function normalizeBirthday(value) {
  const date = value?.date || null;
  const year = Number(date?.year || 0);
  const month = Number(date?.month || 0);
  const day = Number(date?.day || 0);
  if (!year || !month || !day) {
    return "";
  }
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const parsed = new Date(`${y}-${m}-${d}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "" : `${y}-${m}-${d}`;
}

async function fetchGoogleContactGroupsMap(accessToken) {
  const byResourceName = {};
  let pageToken = "";
  let pageCount = 0;

  while (pageCount < 8) {
    const params = new URLSearchParams({
      pageSize: "1000",
      groupFields: "name,memberCount"
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }
    const response = await fetch(`https://people.googleapis.com/v1/contactGroups?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      break;
    }
    const data = await response.json();
    const groups = Array.isArray(data?.contactGroups) ? data.contactGroups : [];
    for (const group of groups) {
      const resourceName = String(group?.resourceName || "").trim();
      const name = String(group?.name || "").trim();
      if (!resourceName || !name) {
        continue;
      }
      byResourceName[resourceName] = name;
    }
    pageToken = String(data?.nextPageToken || "").trim();
    pageCount += 1;
    if (!pageToken) {
      break;
    }
  }

  return byResourceName;
}

function toGoogleContact(person, contactGroupsByResourceName = {}) {
  const primaryName = person?.names?.[0] || {};
  const firstName = String(primaryName.givenName || primaryName.displayName || "").trim();
  const lastName = String(primaryName.familyName || "").trim();
  const email = String(person?.emailAddresses?.[0]?.value || "").trim();
  const phone = String(person?.phoneNumbers?.[0]?.value || "").trim();
  const addressItem = person?.addresses?.[0] || {};
  const city = String(addressItem.city || "").trim();
  const country = String(addressItem.country || "").trim();
  const postalCode = String(addressItem.postalCode || "").trim();
  const stateRegion = String(addressItem.region || "").trim();
  const address = String(addressItem.formattedValue || addressItem.streetAddress || "").trim();
  const company = String(person?.organizations?.[0]?.name || "").trim();
  const birthday = normalizeBirthday(person?.birthdays?.[0]);
  const groups = Array.isArray(person?.memberships)
    ? Array.from(
        new Set(
          person.memberships
            .map((item) => item?.contactGroupMembership?.contactGroupResourceName)
            .map((resourceName) => contactGroupsByResourceName[String(resourceName || "").trim()] || "")
            .map((name) => String(name || "").trim())
            .filter(Boolean)
        )
      )
    : [];

  return {
    firstName,
    lastName,
    email,
    phone,
    relationship: "",
    city,
    country,
    address,
    company,
    postalCode,
    stateRegion,
    birthday,
    groups
  };
}

async function fetchGoogleContactsByAccessToken(accessToken, maxPages = 6) {
  const contactGroupsByResourceName = await fetchGoogleContactGroupsMap(accessToken).catch(() => ({}));
  const contacts = [];
  let pageToken = "";
  let pageCount = 0;

  while (pageCount < maxPages) {
    const params = new URLSearchParams({
      personFields: GOOGLE_CONNECTIONS_FIELDS,
      pageSize: "500",
      sortOrder: "FIRST_NAME_ASCENDING"
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }
    const response = await fetch(`https://people.googleapis.com/v1/people/me/connections?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`Google People API ${response.status}: ${errorBody || response.statusText}`);
    }

    const data = await response.json();
    const people = Array.isArray(data?.connections) ? data.connections : [];
    contacts.push(...people.map((person) => toGoogleContact(person, contactGroupsByResourceName)));
    pageToken = String(data?.nextPageToken || "").trim();
    pageCount += 1;
    if (!pageToken) {
      break;
    }
  }

  return contacts.filter((item) => item.firstName || item.lastName || item.email || item.phone);
}

async function importContactsFromGoogle() {
  const accessToken = await requestGooglePeopleAccessToken();
  return fetchGoogleContactsByAccessToken(accessToken);
}

export { importContactsFromGoogle, isGoogleContactsConfigured };
