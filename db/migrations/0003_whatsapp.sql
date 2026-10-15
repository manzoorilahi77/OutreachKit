-- A WhatsApp contact for leads and finder businesses: the number's digits with country code, or a wa.me/message link, or ''.
-- The lead finder fills it when the Google Maps listing shows a WhatsApp link; the lead form can set it by hand.
ALTER TABLE finder_businesses
  ADD COLUMN whatsapp VARCHAR(300) NOT NULL DEFAULT '' AFTER website_url;
ALTER TABLE leads
  ADD COLUMN whatsapp VARCHAR(300) NOT NULL DEFAULT '' AFTER phone;
