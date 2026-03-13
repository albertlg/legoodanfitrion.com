// src/lib/guest-helpers.js
import { supabase } from "./supabaseClient";
import { buildAppUrl } from "./app-url";
import { CATALOGS, toCatalogCode, toCatalogLabel, toCatalogLabels } from "./guest-catalogs";
import { normalizeLookupValue, uniqueValues, toList, splitListInput, listToInput, normalizeIsoDate, isBlankValue, interpolateText } from "./formatters";
import { GUEST_AVATAR_STORAGE_BUCKET, GUEST_AVATAR_MAX_BYTES } from "./constants";

export function normalizeEmailKey(value) {
    const email = String(value || "").trim().toLowerCase();
    return email.includes("@") ? email : "";
}

export function normalizePhoneKey(value) {
    const phone = String(value || "").replace(/[^\d+]/g, "").trim();
    if (!phone) return "";
    const normalized = phone.startsWith("+") ? `+${phone.slice(1).replace(/\D/g, "")}` : phone.replace(/\D/g, "");
    return normalized.length >= 7 ? normalized : "";
}

export function getMergedFieldValue(existingValue, incomingValue) {
    if (!isBlankValue(existingValue) || isBlankValue(incomingValue)) return undefined;
    return String(incomingValue).trim();
}

export function formatMergeReviewValue(value) {
    if (value == null) return "—";
    const normalized = String(value).trim();
    return normalized || "—";
}

export function buildGuestFingerprint({ firstName, lastName, email, phone }) {
    const emailKey = normalizeEmailKey(email);
    const phoneKey = normalizePhoneKey(phone);
    if (emailKey || phoneKey) return `${emailKey}|${phoneKey}`;
    const firstKey = normalizeLookupValue(firstName);
    const lastKey = normalizeLookupValue(lastName);
    if (firstKey || lastKey) return `name:${firstKey}|${lastKey}`;
    return "";
}

export function buildGuestNameKey(firstName, lastName) {
    const firstKey = normalizeLookupValue(firstName);
    const lastKey = normalizeLookupValue(lastName);
    if (!firstKey && !lastKey) return "";
    return `${firstKey}|${lastKey}`;
}

export function buildGuestFullNameKey(firstName, lastName) {
    const fullName = String([firstName, lastName].filter(Boolean).join(" ") || "").trim().replace(/\s+/g, " ");
    return normalizeLookupValue(fullName);
}

export function buildGuestMatchingKeys({ firstName, lastName, email, phone }) {
    const keys = [];
    const emailKey = normalizeEmailKey(email);
    const phoneKey = normalizePhoneKey(phone);
    const nameKey = buildGuestNameKey(firstName, lastName);
    const fullNameKey = buildGuestFullNameKey(firstName, lastName);
    if (emailKey) keys.push(`email:${emailKey}`);
    if (phoneKey) keys.push(`phone:${phoneKey}`);
    if (nameKey) keys.push(`name:${nameKey}`);
    if (fullNameKey) keys.push(`fullname:${fullNameKey}`);
    if (emailKey || phoneKey) keys.push(`contact:${emailKey}|${phoneKey}`);
    return uniqueValues(keys);
}

export function getImportDuplicateReasonCodes({ firstName, lastName, email, phone, existingGuest, ownerGuestId }) {
    if (!existingGuest) return [];
    const reasons = [];
    const existingEmailKey = normalizeEmailKey(existingGuest.email);
    const existingPhoneKey = normalizePhoneKey(existingGuest.phone);
    const incomingEmailKey = normalizeEmailKey(email);
    const incomingPhoneKey = normalizePhoneKey(phone);
    const existingNameKey = buildGuestNameKey(existingGuest.first_name, existingGuest.last_name);
    const incomingNameKey = buildGuestNameKey(firstName, lastName);
    const existingFullNameKey = buildGuestFullNameKey(existingGuest.first_name, existingGuest.last_name);
    const incomingFullNameKey = buildGuestFullNameKey(firstName, lastName);

    if (ownerGuestId && existingGuest.id === ownerGuestId) reasons.push("owner");
    if (incomingEmailKey && existingEmailKey && incomingEmailKey === existingEmailKey) reasons.push("email");
    if (incomingPhoneKey && existingPhoneKey && incomingPhoneKey === existingPhoneKey) reasons.push("phone");
    if (incomingFullNameKey && existingFullNameKey && incomingFullNameKey === existingFullNameKey) reasons.push("full_name");
    else if (incomingNameKey && existingNameKey && incomingNameKey === existingNameKey) reasons.push("name");

    return uniqueValues(reasons);
}

export function getImportDuplicateMergeConfidence(reasonCodes) {
    const reasons = Array.isArray(reasonCodes) ? reasonCodes : [];
    if (reasons.some((item) => item === "owner" || item === "email" || item === "phone")) return "high";
    if (reasons.includes("full_name")) return "medium";
    return "low";
}

export function getImportDuplicateMergeConfidenceStatusClass(confidence) {
    if (confidence === "high") return "status-yes";
    if (confidence === "medium") return "status-maybe";
    return "status-event-draft";
}

export function buildGuestDuplicateMatchScore(sourceGuest, targetGuest) {
    if (!sourceGuest?.id || !targetGuest?.id || sourceGuest.id === targetGuest.id) return -1;
    let score = 0;
    const sourceEmail = normalizeEmailKey(sourceGuest.email || "");
    const targetEmail = normalizeEmailKey(targetGuest.email || "");
    const sourcePhone = normalizePhoneKey(sourceGuest.phone || "");
    const targetPhone = normalizePhoneKey(targetGuest.phone || "");
    const sourceNameKey = buildGuestNameKey(sourceGuest.first_name, sourceGuest.last_name);
    const targetNameKey = buildGuestNameKey(targetGuest.first_name, targetGuest.last_name);

    if (sourceEmail && targetEmail && sourceEmail === targetEmail) score += 8;
    if (sourcePhone && targetPhone && sourcePhone === targetPhone) score += 8;
    if (sourceNameKey && targetNameKey && sourceNameKey === targetNameKey) score += 4;
    if (sourceGuest.city && targetGuest.city && normalizeLookupValue(sourceGuest.city) === normalizeLookupValue(targetGuest.city)) score += 2;
    if (sourceGuest.country && targetGuest.country && normalizeLookupValue(sourceGuest.country) === normalizeLookupValue(targetGuest.country)) score += 2;

    return score;
}

export function mergeUniqueListValues(primaryValues, secondaryValues) {
    return uniqueValues([...(Array.isArray(primaryValues) ? primaryValues : []), ...(Array.isArray(secondaryValues) ? secondaryValues : [])]);
}

export function normalizeImportSource(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "google" || normalized === "device" || normalized === "paste") return normalized;
    return "file";
}

export function tagImportedContacts(items, source) {
    const normalizedSource = normalizeImportSource(source);
    return (Array.isArray(items) ? items : []).map((item) => ({ ...(item || {}), importSource: normalizedSource }));
}

export function deriveGuestNameFromContact(contact) {
    const normalizedFirstName = String(contact?.firstName || "").trim();
    if (normalizedFirstName) return normalizedFirstName;
    const emailKey = normalizeEmailKey(contact?.email || "");
    if (emailKey) return emailKey.split("@")[0];
    const phoneKey = normalizePhoneKey(contact?.phone || "");
    if (phoneKey) return phoneKey.slice(-6);
    return "";
}

export function toContactGroupsList(contact) {
    if (Array.isArray(contact?.groups)) return uniqueValues(contact.groups);
    const raw = String(contact?.groups || "").trim();
    if (!raw) return [];
    return uniqueValues(raw.split(/[|,]/g).map((item) => String(item || "").trim()).filter(Boolean));
}

export function calculateImportContactCaptureScore(contact) {
    let score = 0;
    if (String(contact?.firstName || "").trim() || String(contact?.lastName || "").trim()) score += 15;
    if (normalizeEmailKey(contact?.email || "")) score += 24;
    if (normalizePhoneKey(contact?.phone || "")) score += 24;
    if (String(contact?.city || "").trim()) score += 7;
    if (String(contact?.country || "").trim()) score += 6;
    if (String(contact?.address || "").trim()) score += 8;
    if (normalizeIsoDate(contact?.birthday)) score += 6;
    if (String(contact?.company || "").trim()) score += 4;
    if (toContactGroupsList(contact).length > 0) score += 6;
    return Math.max(0, Math.min(100, score));
}

export function getImportPotentialLevel(score) {
    const safeScore = Number(score) || 0;
    if (safeScore >= 70) return "high";
    if (safeScore >= 45) return "medium";
    return "low";
}

export function deriveRelationshipCodeFromContact(contact) {
    const direct = toCatalogCode("relationship", contact?.relationship || "");
    if (direct) return direct;
    const groups = toContactGroupsList(contact);
    for (const groupItem of groups) {
        const groupCode = toCatalogCode("relationship", groupItem);
        if (groupCode) return groupCode;
    }
    return "";
}

export function splitFullName(rawName) {
    const normalized = String(rawName || "").trim().replace(/\s+/g, " ");
    if (!normalized) return { firstName: "", lastName: "" };
    const parts = normalized.split(" ");
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function normalizeDeviceContact(rawContact) {
    const fullName = Array.isArray(rawContact?.name) ? rawContact.name[0] || "" : rawContact?.name || "";
    const { firstName, lastName } = splitFullName(fullName);
    const addressRaw = Array.isArray(rawContact?.address) ? rawContact.address[0] || null : rawContact?.address || null;
    const addressObject = typeof addressRaw === "object" && addressRaw !== null ? addressRaw : null;
    const addressFromObject = addressObject ? [addressObject.addressLine, addressObject.streetAddress].flat().filter(Boolean).join(", ") : "";
    const fallbackAddress = typeof addressRaw === "string" ? addressRaw : "";
    return {
        firstName, lastName,
        email: Array.isArray(rawContact?.email) ? rawContact.email[0] || "" : rawContact?.email || "",
        phone: Array.isArray(rawContact?.tel) ? rawContact.tel[0] || "" : rawContact?.tel || "",
        relationship: "",
        city: String(addressObject?.city || addressObject?.locality || "").trim(),
        country: String(addressObject?.country || addressObject?.countryName || "").trim(),
        address: String(addressFromObject || fallbackAddress || "").trim(),
        company: "",
        postalCode: String(addressObject?.postalCode || "").trim(),
        stateRegion: String(addressObject?.region || addressObject?.state || "").trim(),
        photoUrl: Array.isArray(rawContact?.icon) ? String(rawContact.icon[0] || "").trim() : String(rawContact?.icon || "").trim(),
        groups: []
    };
}

export function readImageFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(""); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("image_read_failed"));
        reader.readAsDataURL(file);
    });
}

export function isDataImageUrl(value) {
    return /^data:image\/[-+.\w]+;base64,/i.test(String(value || "").trim());
}

export function extensionFromMimeType(mimeType) {
    const normalized = String(mimeType || "").toLowerCase();
    if (normalized.includes("png")) return "png";
    if (normalized.includes("webp")) return "webp";
    if (normalized.includes("gif")) return "gif";
    if (normalized.includes("svg")) return "svg";
    return "jpg";
}

export async function uploadGuestAvatarToStorage({ dataUrl, userId, guestId }) {
    if (!supabase || !userId || !guestId || !isDataImageUrl(dataUrl)) return { url: "", error: null };
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        if (!blob || blob.size === 0) return { url: "", error: new Error("empty_image_blob") };
        if (blob.size > GUEST_AVATAR_MAX_BYTES) return { url: "", error: new Error("avatar_too_large") };
        const extension = extensionFromMimeType(blob.type || "");
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
        const objectPath = `${userId}/${guestId}/${fileName}`;
        const uploadResult = await supabase.storage.from(GUEST_AVATAR_STORAGE_BUCKET).upload(objectPath, blob, { upsert: true, cacheControl: "3600", contentType: blob.type || undefined });
        if (uploadResult.error) return { url: "", error: uploadResult.error };
        const publicResult = supabase.storage.from(GUEST_AVATAR_STORAGE_BUCKET).getPublicUrl(objectPath);
        const publicUrl = String(publicResult?.data?.publicUrl || "").trim();
        if (!publicUrl) return { url: "", error: new Error("avatar_public_url_missing") };
        return { url: publicUrl, error: null };
    } catch (error) {
        return { url: "", error: error instanceof Error ? error : new Error(String(error || "avatar_upload_failed")) };
    }
}

export function getGuestAvatarUrl(guestItem, fallbackLabel = "") {
    if (!guestItem && !fallbackLabel) return "";
    const preferredImageUrl = getGuestPhotoValue(guestItem);
    if (preferredImageUrl) return preferredImageUrl;
    return "";
}

export function getGuestPhotoValue(guestItem) {
    return [guestItem?.avatar_url, guestItem?.photo_url, guestItem?.image_url, guestItem?.picture]
        .map((item) => String(item || "").trim())
        .find(Boolean) || "";
}

export function translateCatalogInputList(field, rawList, language) {
    return listToInput(toCatalogLabels(field, splitListInput(rawList), language));
}

export function toPetAllergyLabel(value, language) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const petLabel = toCatalogLabel("pet", raw, language);
    if (petLabel !== raw) return petLabel;
    return toCatalogLabel("allergy", raw, language);
}

export function toPetAllergyLabels(values, language) {
    return uniqueValues((Array.isArray(values) ? values : [values]).map((value) => toPetAllergyLabel(value, language)));
}

export function buildCatalogLookupSet(field) {
    const options = Array.isArray(CATALOGS?.[field]) ? CATALOGS[field] : [];
    const lookup = new Set();
    for (const option of options) {
        lookup.add(normalizeLookupValue(option?.code || ""));
        for (const label of Object.values(option?.labels || {})) lookup.add(normalizeLookupValue(label));
        for (const alias of option?.aliases || []) lookup.add(normalizeLookupValue(alias));
    }
    return lookup;
}

export const INTOLERANCE_LOOKUP_SET = buildCatalogLookupSet("intolerance");
export const MEDICAL_CONDITION_LOOKUP_SET = buildCatalogLookupSet("medical_condition");
export const DIETARY_MEDICAL_LOOKUP_SET = buildCatalogLookupSet("dietary_medical_restriction");

export function splitLegacyHealthSignalsFromIntolerances(intolerances = []) {
    const medicalConditions = [];
    const dietaryMedicalRestrictions = [];
    const filteredIntolerances = [];
    for (const rawValue of toList(intolerances)) {
        const normalized = normalizeLookupValue(rawValue);
        const isKnownIntolerance = INTOLERANCE_LOOKUP_SET.has(normalized);
        const isKnownMedicalCondition = MEDICAL_CONDITION_LOOKUP_SET.has(normalized);
        const isKnownDietaryMedical = DIETARY_MEDICAL_LOOKUP_SET.has(normalized);
        if (isKnownMedicalCondition && !isKnownIntolerance) { medicalConditions.push(toCatalogCode("medical_condition", rawValue)); continue; }
        if (isKnownDietaryMedical && !isKnownIntolerance) { dietaryMedicalRestrictions.push(toCatalogCode("dietary_medical_restriction", rawValue)); continue; }
        filteredIntolerances.push(toCatalogCode("intolerance", rawValue));
    }
    return { intolerances: uniqueValues(filteredIntolerances), medicalConditions: uniqueValues(medicalConditions), dietaryMedicalRestrictions: uniqueValues(dietaryMedicalRestrictions) };
}

export function normalizeSensitiveRecord(rawSensitiveItem) {
    const source = rawSensitiveItem || {};
    const allergies = uniqueValues(toList(source.allergies).map((item) => toCatalogCode("allergy", item)));
    const petAllergies = uniqueValues(toList(source.pet_allergies).map((item) => toCatalogCode("pet", item)));
    const intolerances = uniqueValues(toList(source.intolerances).map((item) => toCatalogCode("intolerance", item)));
    const medicalConditions = uniqueValues(toList(source.medical_conditions).map((item) => toCatalogCode("medical_condition", item)));
    const dietaryMedicalRestrictions = uniqueValues(toList(source.dietary_medical_restrictions).map((item) => toCatalogCode("dietary_medical_restriction", item)));

    if (medicalConditions.length > 0 || dietaryMedicalRestrictions.length > 0) {
        return { ...source, allergies, intolerances, pet_allergies: petAllergies, medical_conditions: medicalConditions, dietary_medical_restrictions: dietaryMedicalRestrictions };
    }
    const legacySplit = splitLegacyHealthSignalsFromIntolerances(source.intolerances || []);
    return { ...source, allergies, intolerances: legacySplit.intolerances, pet_allergies: petAllergies, medical_conditions: legacySplit.medicalConditions, dietary_medical_restrictions: legacySplit.dietaryMedicalRestrictions };
}

export function hasGuestHealthAlerts(sensitiveItem) {
    return (toList(sensitiveItem?.allergies).length > 0 || toList(sensitiveItem?.intolerances).length > 0 || toList(sensitiveItem?.pet_allergies).length > 0 || toList(sensitiveItem?.medical_conditions).length > 0 || toList(sensitiveItem?.dietary_medical_restrictions).length > 0);
}

export function buildHostInvitePayload(guestItem, t) {
    const guestLabel = `${guestItem?.first_name || ""} ${guestItem?.last_name || ""}`.trim() || t("field_guest");
    const signupUrl = buildAppUrl(`/login?invite_guest=${encodeURIComponent(String(guestItem?.id || ""))}&invite_source=host`);
    const inviteText = interpolateText(t("host_invite_message_template"), { guest: guestLabel, url: signupUrl });
    const inviteSubject = interpolateText(t("host_invite_email_subject"), { guest: guestLabel });
    const guestEmail = String(guestItem?.email || "").trim();
    return { guestLabel, signupUrl, inviteText, inviteSubject, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(inviteText)}`, emailUrl: `mailto:${guestEmail}?subject=${encodeURIComponent(inviteSubject)}&body=${encodeURIComponent(inviteText)}` };
}

export function inferGlobalSharePreset(draft) {
    const status = String(draft?.status || "inactive").toLowerCase();
    if (status !== "active") return "private";
    const allowIdentity = Boolean(draft?.allow_identity);
    const allowFood = Boolean(draft?.allow_food);
    const allowLifestyle = Boolean(draft?.allow_lifestyle);
    const allowConversation = Boolean(draft?.allow_conversation);
    const allowHealth = Boolean(draft?.allow_health);
    if (allowIdentity && allowFood && !allowLifestyle && !allowConversation && !allowHealth) return "basic";
    return "custom";
}

export function applyGlobalSharePreset(draft, preset) {
    const base = { status: String(draft?.status || "inactive").toLowerCase(), allow_identity: Boolean(draft?.allow_identity), allow_food: Boolean(draft?.allow_food), allow_lifestyle: Boolean(draft?.allow_lifestyle), allow_conversation: Boolean(draft?.allow_conversation), allow_health: Boolean(draft?.allow_health) };
    if (preset === "private") return { ...base, status: "revoked", allow_identity: false, allow_food: false, allow_lifestyle: false, allow_conversation: false, allow_health: false };
    if (preset === "basic") return { ...base, status: "active", allow_identity: true, allow_food: true, allow_lifestyle: false, allow_conversation: false, allow_health: false };
    return { ...base, status: "active" };
}

export function formatGlobalShareEventType(t, eventType) {
    const normalizedType = String(eventType || "").trim().toLowerCase();
    if (normalizedType === "share_granted") return t("global_profile_history_share_granted");
    if (normalizedType === "share_revoked") return t("global_profile_history_share_revoked");
    if (normalizedType === "health_consent_granted") return t("global_profile_history_health_granted");
    if (normalizedType === "health_consent_revoked") return t("global_profile_history_health_revoked");
    if (normalizedType === "data_validated") return t("global_profile_history_data_validated");
    return t("global_profile_history_unknown");
}

export function getGlobalShareVisibleScopes(draft, t) {
    if (String(draft?.status || "").toLowerCase() !== "active") return [];
    const scopes = [];
    if (draft?.allow_identity) scopes.push(t("global_profile_scope_identity"));
    if (draft?.allow_food) scopes.push(t("global_profile_scope_food"));
    if (draft?.allow_lifestyle) scopes.push(t("global_profile_scope_lifestyle"));
    if (draft?.allow_conversation) scopes.push(t("global_profile_scope_conversation"));
    if (draft?.allow_health) scopes.push(t("global_profile_scope_health"));
    return scopes;
}
