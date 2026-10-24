# Lucky Nations / TikTok LIVE

Public 9:16 Browser Source: https://afgtakrun-ludo-live-nations.hf.space/screen

The private panel and public display share the same app. The panel link includes
an administrative fragment; the public screen never authenticates. Use a
1080×1920 Browser/Website source, Fit/Contain and zero crop. Account connection
uses any LIVE TikTok username, without a TikTok password, cookie or paid API.
The connector is unofficial; a successful deployment does not prove a TikTok
account is live or accessible from the host.

## Country dice game

Gift/country mode uses an animated six-sector wheel and a readable dice face;
there are no Ludo pawns in this mode. It rolls automatically every four seconds
while the display/panel is open or LIVE mode is active, including when nobody
has sent a like, comment or gift. The rolled 1–6 is added to that country's dice
points. Every one-coin gift adds exactly one gift point. Rose starts with zero
base points; the three other fixed active positions start with three, shown
explicitly in the score breakdown. Total = dice + gifts + base. Country frames
and score columns upgrade at 10 gifts (silver), 50 (gold), 100 (diamond) and over
100 (dragon), with stronger lighting, particles and cloud effects. Reduced-motion
preferences disable decorative CSS animations.

A round lasts eight rolls per active position (32 with four active countries).
The highest total wins; ties use position order. The winner's supporter/team
photo appears on the wheel, then a new round starts after thirty seconds. Dice
points reset; real gift totals and supporter rankings remain. Auto play and
auto restart can be disabled independently in the panel. Manual dice clicks use
the same server random roll and preserve the actual result between turns.

The initial four countries are Saudi Arabia, Germany, Israel and Afghanistan;
Iran is first in the waiting queue. The panel has a one-click random country
shuffle. It keeps country points/donors and fixed position gifts, clears waiting
comment choices, and waits for an in-flight dice animation to finish.

## Fixed gift positions and waiting countries

Four active gift IDs remain attached to their board positions, not countries.
Five other curated one-coin gifts are assigned to internal waiting positions
for owner testing; the public waiting-country table is hidden. The two sets are disjoint. Editing an active gift preserves
other mappings where possible and fills any conflicting waiting position from
the remaining catalogue. Events reporting a cost greater than one coin are
rejected. Current availability/prices depend on TikTok's catalogue.

Waiting countries rank first by received gifts, then comment requests. A
waiting gift targets the country currently occupying that visible row. Once
its gift points exceed the weakest active country's total score, it enters
that position. An inactive position can be filled immediately. Its donations
and top supporter follow it; the position's gift does not change. A displaced
country moves to the reserve rotation with fresh game points. Global donor
totals are retained independently of country changes.

A visible waiting country with no gift for 60 seconds is replaced from reserves,
including before the first audience interaction. Gift positions stay fixed.
Numbered comments still request waiting entries, and each viewer has one active
choice. Repeated comments renew activity without adding duplicate votes.

Active-country inactivity removal starts only after the first numbered comment
or gift. The default is 180 seconds, adjustable between 60 and 1800 or disabled.
This prevents an audience-free initial broadcast from emptying immediately.
Each country's own comment/gift renews its deadline. Likes do not choose a
country. If all entries are removed and no replacement is available, restore
an entry in the panel.

## Team Ludo mode

Number/Teams mode retains the Ludo board and pawns, custom names/photos and free
turn-based comments 1–4. Only the active team's number rolls. Six enters a pawn,
unsafe cells allow captures, and finishing requires an exact roll. Waiting
request numbers are distinct from active 1–4. Automatic inactivity deletion does
not apply to teams. The owner can remove or restore an active team and delete
a waiting entry. Switching back to team mode restores the waiting reserve list.

Country frames show a large portrait of the latest gift sender on every new gift.
The top cumulative supporter remains available in the ranked supporter dialog.
Before real activity, locally bundled illustrated avatars carry DEMO labels and
zero activity counts; real profiles replace them automatically.

## Likes, gift spotlight and Follow +

Two raised translucent glass rails show likers on the left and gifters on the
right by default, inset 72 canvas pixels for safer video cropping. The panel
can also place both on the left or right, without moving the game. Portraits
and per-person totals have stronger contrast. No audio-unlock button is shown
on the public screen. Per-user
like totals use lowercase compact numbers, e.g. 1.2k. Each gift sender gets a
60-second large spotlight; simultaneous senders queue in order, and repeated
gifts update the sender's existing turn. With no pending gifts, the top liker
is enlarged. Global gift totals include waiting and replaced countries.

Follow + opens the sender's official TikTok profile when TikTok supplied their
public username. The viewer follows from TikTok; the app does not send follow
requests. Viewers cannot click controls inside a Browser Source video; profile
links work when the actual app page is open. Missing usernames disable the link.

## Panel, demo, hosting and tests

The panel includes automatic-play settings, fixed gift mappings, country/team
name/photo editing, removal/restore, manual dice, a new-round button, connection
diagnostics and a reversible simulated demo. Demo restores the prior game on
stop and does not overwrite real state. Browser audio needs one interaction:
click the page once through Interact if required and enable Browser audio in the mixer. The public screen has no sound-enable button.

Node 24: `npm ci`, `npm start`, `node test.mjs`. Optional environment variables:
PORT and LUDO_ADMIN_TOKEN; public hosting also requires PUBLIC_URL. State is
stored in the container's local .runtime.json; rebuilding may reset it. Never
commit this runtime file or management tokens.

GitHub Actions deploys live-ludo/ to Hugging Face CPU-basic only; unknown or paid
hardware is rejected. Automated checks cover authentication, synchronized state,
real dice values, one-coin validation, waiting gifts/promotion/rotation, spotlight
queue deadlines, restart, manual removal and unchanged team play. Chromium QA
checks the full phone canvas, wheel, tiers, waiting gifts, profile links and an
independently movable rail. Actual live gift receipt needs a broadcasting account.


## Country comments, clean live layout and championship
The public country view hides the waiting-country table. Its only invitation is
“comment your country and support”, shown as animated luminous text. Supported
English/Persian country names and flags from the configured roster/country map
can enter through comments. A country with no gifts may be replaced immediately;
when every active country has received gifts, the entrant becomes a challenger.
The lowest total score leaves after the current round and celebration, rather
than evicting a supported country in the middle of play. Ties avoid removing
the declared winner. Commenter photos replace DEMO portraits until a real gift
supporter is available. Waiting rankings include retained dice and gift points.

Victory lasts 30 seconds before automatic restart. It features the winning
country's top supporter photo, a major-key musical cue, confetti and animated
cloud/energy rings. At 50 gifts the original gold artwork is used; at 100 it
becomes ice and over 100 it becomes the fire/dragon frame. Lower gift levels use
animated cloud and silver rings. Music honors the volume setting and browser
audio activation. No audio-unlock control is displayed publicly.

Frame artwork is copied without alteration from this same repository's
live-rings/public/frames/{gold,ice,fire}.png. The ring renderer is copied from
live-driving-quiz/public/rings.js, itself based on live-rings/public/rings.js.
The original major-key jingle is copied from
live-driving-quiz/public/celebration.js. No paid media service is used.
