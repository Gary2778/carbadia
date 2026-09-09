export function createInquiryMailto({ topic, organization, message }: {
  topic: string;
  organization: string;
  message: string;
}): string {
  const brief = message.trim();
  if (!brief) throw new Error("Add a short project brief.");
  const subjectTopic = topic.trim().replace(/[\r\n]+/g, " ");
  const company = organization.trim();
  const body = [
    "Hello Carbadia,",
    "",
    `I’d like to discuss: ${subjectTopic}`,
    ...(company ? [`Organization: ${company}`] : []),
    "",
    brief,
  ].join("\n");
  return `mailto:hello@carbadia.io?subject=${encodeURIComponent(`Carbadia Studio | ${subjectTopic}`)}&body=${encodeURIComponent(body)}`;
}
