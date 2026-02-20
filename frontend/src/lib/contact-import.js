function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLookup(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

const CSV_HEADER_ALIASES = {
  firstName: [
    "first_name",
    "firstname",
    "first name",
    "given name",
    "nombre",
    "nom",
    "prenom",
    "prenom(s)"
  ],
  lastName: ["last_name", "lastname", "last name", "apellido", "apellidos", "cognom", "cognoms", "nom de famille"],
  fullName: ["name", "full_name", "full name", "nombre completo", "nom complet"],
  email: ["email", "e-mail", "correo", "mail", "courriel"],
  phone: ["phone", "telefono", "teléfono", "tel", "mobile", "movil", "mòbil", "telephone"],
  relationship: ["relationship", "relacion", "relación", "relacio", "relació"],
  city: ["city", "ciudad", "ciutat", "ville"],
  country: ["country", "pais", "país", "pays"],
  address: ["address", "direccion", "dirección", "adreca", "adreça", "adresse"],
  company: ["company", "empresa", "societe", "société"]
};

const HEADER_ALIAS_INDEX = Object.fromEntries(
  Object.entries(CSV_HEADER_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeLookup(alias), field])
  )
);

function splitName(fullName) {
  const normalized = normalizeText(fullName);
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || "", lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseContactTokens(tokens) {
  const [nameToken = "", emailToken = "", phoneToken = "", cityToken = "", countryToken = ""] = tokens;
  const nameParts = splitName(nameToken);
  const emailLooksValid = /@/.test(emailToken);
  const phoneLooksValid = /\d/.test(phoneToken);
  return {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: emailLooksValid ? normalizeText(emailToken) : "",
    phone: phoneLooksValid ? normalizeText(phoneToken) : "",
    city: normalizeText(cityToken),
    country: normalizeText(countryToken),
    relationship: "",
    address: "",
    company: ""
  };
}

function parseContactsFromCsv(text) {
  const source = String(text || "");
  const lines = source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = splitCsvLine(lines[0], delimiter);
  const mappedHeaders = headerCells.map((header) => HEADER_ALIAS_INDEX[normalizeLookup(header)] || null);
  const hasRecognizedHeaders = mappedHeaders.some(Boolean);
  const dataLines = hasRecognizedHeaders ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const cells = splitCsvLine(line, delimiter);
      if (!hasRecognizedHeaders) {
        return parseContactTokens(cells);
      }

      const fromRow = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        relationship: "",
        city: "",
        country: "",
        address: "",
        company: ""
      };

      let fullName = "";
      mappedHeaders.forEach((field, index) => {
        if (!field) {
          return;
        }
        const value = normalizeText(cells[index] || "");
        if (!value) {
          return;
        }
        if (field === "fullName") {
          fullName = value;
          return;
        }
        fromRow[field] = value;
      });

      if (fullName && !fromRow.firstName) {
        const nameParts = splitName(fullName);
        fromRow.firstName = nameParts.firstName;
        fromRow.lastName = fromRow.lastName || nameParts.lastName;
      }
      return fromRow;
    })
    .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone);
}

function parseContactsFromText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tokens = line.includes("|")
        ? line.split("|").map((token) => token.trim())
        : line.split(",").map((token) => token.trim());
      return parseContactTokens(tokens);
    })
    .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone);
}

function parseContactsFromVcf(text) {
  const source = String(text || "");
  const cards = source.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];
  return cards
    .map((card) => {
      const lines = card
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.trim());

      let firstName = "";
      let lastName = "";
      let email = "";
      let phone = "";
      let address = "";
      let city = "";
      let country = "";
      let company = "";

      for (const line of lines) {
        if (line.startsWith("FN:")) {
          const nameParts = splitName(line.slice(3));
          firstName = firstName || nameParts.firstName;
          lastName = lastName || nameParts.lastName;
        } else if (line.startsWith("N:")) {
          const values = line
            .slice(2)
            .split(";")
            .map((item) => normalizeText(item));
          lastName = lastName || values[0] || "";
          firstName = firstName || values[1] || "";
        } else if (line.startsWith("EMAIL")) {
          email = email || normalizeText(line.split(":").slice(1).join(":"));
        } else if (line.startsWith("TEL")) {
          phone = phone || normalizeText(line.split(":").slice(1).join(":"));
        } else if (line.startsWith("ADR")) {
          const adrParts = line
            .split(":")
            .slice(1)
            .join(":")
            .split(";")
            .map((item) => normalizeText(item));
          address = address || adrParts[2] || "";
          city = city || adrParts[3] || "";
          country = country || adrParts[6] || "";
        } else if (line.startsWith("ORG:")) {
          company = company || normalizeText(line.slice(4));
        }
      }

      return {
        firstName: normalizeText(firstName),
        lastName: normalizeText(lastName),
        email: normalizeText(email),
        phone: normalizeText(phone),
        relationship: "",
        city: normalizeText(city),
        country: normalizeText(country),
        address: normalizeText(address),
        company: normalizeText(company)
      };
    })
    .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone);
}

export { parseContactsFromCsv, parseContactsFromText, parseContactsFromVcf };
