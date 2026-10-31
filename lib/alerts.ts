// Chatbot email alert. Formspree already emails Callum for the other forms.
// No Resend, SendGrid, or other mail service is added here.

const FORM_ID = /^[A-Za-z0-9]{4,32}$/;

export function formspreeId(env: Record<string, string | undefined> = process.env): string {
  const value = (env.CHATBOT_ALERT_FORMSPREE_ID || "").trim();
  return FORM_ID.test(value) ? value : "";
}

export async function postChatbotAlert(
  input: { formId: string; name: string; email: string; goal: string; page?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number }> {
  if (!FORM_ID.test(input.formId)) return { ok: false, status: 0 };
  try {
    const response = await fetchImpl(`https://formspree.io/f/${input.formId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        goal: input.goal,
        page: input.page || "",
        source: "chatbot",
        _subject: `Chatbot lead: ${input.name}`,
      }),
      signal: AbortSignal.timeout(4000),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
