// Ported from the original's `messages` (docs/source/territory-desk.html), body unchanged apart from types.
import type { KitContext, Message } from "./types";

export function messages(X: KitContext): Message[] {
  const P=X.price, D=X.demo, YOU=X.you, BRAND=X.brand;
  return [
["DM 1 · day 0 · send from your phone, text only: no screenshot, image or attachment",
`Hey {Owner} — that {specific recent job} you posted last week is sharp work.

Quick thing. I searched "${X.q0} ${X.city}" and couldn't find you anywhere except Instagram. So I built a page for {Business Name} to see what it would look like — your service area, a quote form that texts you, and marked placeholders where your photos would go. Took me an evening.

No catch, and no pitch unless you want one. Worth two minutes?`],

["DM 2 · day 3 · only if no reply",
`{Owner} — did my message come through? Here is the page I mentioned: ${D}

If it's not for you, just say so and I'll leave you alone. If it is, the real version can be live on your own domain in about a week.`],

["Call script · day 2 · mid-morning or after 5pm",
`"Hi, is this {Owner}? — I'm ${YOU}, I build websites for ${X.catL} companies here in ${X.city}. I sent you something on Instagram a couple of days ago, did it come through?"

IF NO:
"No worries, it's easy to miss. Short version — I built a sample site for {Business Name} with marked placeholders where your photos would go. It's live right now at ${D}. Can I text you the link so you can look at it tonight?"

IF YES:
"What did you think?"
 → let them talk, do not fill the silence
"The build runs $${P.min}–$${P.max} depending on how many pages, then $${P.careMin}–$${P.careMax} a month for hosting, backups and changes. For a ${X.catL} company in ${X.city} I'd normally quote around $${P.rec}."
"Can I walk you through it for ten minutes this week — Tuesday or Thursday?"

CLOSE:
"I'll send a one-page scope and an invoice for the 50% deposit. We start the day it clears and you get a link in {X} days."`],

["Objection handlers · keep these next to the phone",
`"How much?"
→ "$${P.min} to $${P.max}. For you it'd be about $${P.rec}, because ${X.pricedBecause}. That's less than one ${X.catL} job."

"I'm too busy right now."
→ "That's exactly why I built it first. I need about twenty minutes of your time in total — I'll write everything myself from your Instagram and your Google listing."

"I already have a Facebook page."
→ "Facebook is rented ground, and it doesn't show up when someone googles '${X.q0} ${X.city}'. This does, and you own it."

"Send me some info."
→ "The info is the demo, it's already built — ${D}. Have a look tonight and I'll ring you Thursday."

"My nephew / my wife is doing it."
→ "Good, that's cheaper than me. Happy to hand over what I've already built. If it stalls in a month or two, the offer stands."

"Business is fine, I'm booked out."
→ "Then this is the right month to do it. You're not building for this week, you're building for the slow one."

"I'll think about it."
→ "Fair. I'll keep the demo up until Friday and check in then — if it's a no, tell me and I'll take it down."`],

["Email · day 5 · public business address only",
`SUBJECT: {Business Name} — ${X.city} ${X.catL} site (already built)

Hi {Owner},

I build websites for ${X.catL} companies around ${X.city}. Rather than ask for your time, I built a sample for {Business Name} first — marked placeholders where your photos would go, your service area, and a quote form:

${D}

If you want it, I move it onto a domain you own and finish it out — $${P.min} to $${P.max} depending on how many pages, plus $${P.careMin}–$${P.careMax} a month for hosting and changes. If you don't, no problem at all, it comes down at the end of the month.

Worth ten minutes on the phone this week?

${YOU}
${BRAND} · {Your Phone}
{Your Physical Address}

Reply "stop" and I won't contact you again.`],

["Voicemail · day 9 · fifteen seconds, once only",
`"{Owner}, it's ${YOU} — I build websites for ${X.catL} companies in ${X.city}. I built a sample one for you, it's at ${D}, I'll text it to you now. Have a look when you're off the truck. {Your Phone}. Thanks."`],

["The takedown note · day 14 · highest response rate in the sequence",
`{Owner} — I'm taking the {Business Name} demo down on Friday to free up the space.

Want me to leave it up? One word is fine either way.`],

["Nurture · day 45, then quarterly · never delete a lead who didn't say no",
`Hey {Owner} — {seasonal hook for this trade}. Thought of you.

Still happy to put that site up whenever you want it — nothing's changed on price. ${D} if you want to look again.`]
  ];
}