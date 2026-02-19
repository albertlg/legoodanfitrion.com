import { z } from "zod";

const phoneRegex = /^[+]?[\d\s().-]{7,25}$/;

const eventSchema = z.object({
  title: z.string().trim().min(3, "event_title_length").max(120, "event_title_length"),
  eventType: z.string().trim().max(80, "event_type_length"),
  locationName: z.string().trim().max(120, "event_location_name_length"),
  locationAddress: z.string().trim().max(220, "event_location_address_length")
});

const guestSchema = z
  .object({
    firstName: z.string().trim().min(2, "guest_first_name_length").max(80, "guest_first_name_length"),
    lastName: z.string().trim().max(120, "guest_last_name_length"),
    email: z
      .string()
      .trim()
      .max(180, "guest_email_invalid")
      .optional(),
    phone: z
      .string()
      .trim()
      .max(25, "guest_phone_invalid")
      .optional(),
    relationship: z.string().trim().max(60, "guest_relationship_length"),
    city: z.string().trim().max(80, "guest_city_length"),
    country: z.string().trim().max(80, "guest_country_length")
  })
  .superRefine((value, ctx) => {
    const hasEmail = Boolean(value.email);
    const hasPhone = Boolean(value.phone);

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contact"],
        message: "guest_contact_required"
      });
      return;
    }

    if (hasEmail && !z.string().email().safeParse(value.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "guest_email_invalid"
      });
    }

    if (hasPhone && !phoneRegex.test(value.phone || "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "guest_phone_invalid"
      });
    }
  });

const invitationSchema = z.object({
  eventId: z.string().trim().min(1, "invitation_select_required"),
  guestId: z.string().trim().min(1, "invitation_select_required")
});

function parseZodErrors(error) {
  const byField = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] || "_form");
    if (!byField[field]) {
      byField[field] = issue.message;
    }
  }
  return byField;
}

function validateEventForm(input) {
  const result = eventSchema.safeParse(input);
  if (result.success) {
    return { success: true, errors: {} };
  }
  return { success: false, errors: parseZodErrors(result.error) };
}

function validateGuestForm(input) {
  const result = guestSchema.safeParse(input);
  if (result.success) {
    return { success: true, errors: {} };
  }
  return { success: false, errors: parseZodErrors(result.error) };
}

function validateInvitationForm(input) {
  const result = invitationSchema.safeParse(input);
  if (result.success) {
    return { success: true, errors: {} };
  }
  return { success: false, errors: parseZodErrors(result.error) };
}

export { validateEventForm, validateGuestForm, validateInvitationForm };

