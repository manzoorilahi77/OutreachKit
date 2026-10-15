import { WhatsAppIcon } from "@/components/ui/Icons";
import { IconLink } from "@/components/ui/IconLink";
import { whatsappHref } from "@/lib/leads/whatsapp";

/** A phone number, with a WhatsApp icon beside it when the business has a WhatsApp contact. */
export function PhoneCell({ phone, whatsapp, name }: { phone: string; whatsapp?: string | null; name: string }) {
  const href = whatsappHref(whatsapp);
  if (!phone && !href) return <>—</>;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      {phone ? <span>{phone}</span> : <span className="text-muted">No phone</span>}
      {href && <IconLink href={href} label={`Message ${name} on WhatsApp`} external><WhatsAppIcon /></IconLink>}
    </span>
  );
}
