# Mausbot commands through the existing Telegram bot

The existing Telegram webhook remains the sole receiver. This optional bridge stores
owner-authorized `/agent` instructions in private Cloudflare KV and lets a paired local
Mausbot worker pull them. It never calls Telegram `getUpdates`, changes the webhook,
copies the bot token to the computer, or starts another video-production schedule.
The existing `/episode`, `/status` and other project commands retain their own routes.

## What is required

- Deploy the updated Worker to the existing endpoint first. Its unauthenticated
  `/mausbot/health` must return JSON with `bridge: true` and `queue_available: true`.
- Keep the Mausbot server running with the `GapMedia` bot. A detected CLI is not proof
  of a working account: the actual setup test found an expired Codex ChatGPT login.
  Renew it in Mausbot → Settings → AI → Providers → Codex before expecting execution.
- Use the existing bot's owner private chat. Pairing and instructions require both
  the authorized chat and matching sender. Forwarded commands are not executed.
- Node 22.13+ or 24 is required by the local receipt journal (`node:sqlite`).
- Keep the local bridge process and computer alive. The chat's cloud execution
  environment is not a guaranteed always-on host. Queued tasks expire after seven days.

## Pair once, with no Telegram-token transfer

From a dedicated local folder (not a public repository):

```sh
export MAUSBOT_BRIDGE_DIR=/workspace/tools/mausbot/telegram-bridge
export MAUSBOT_CLI=/workspace/tools/mausbot/bin/openmausbot
export NODE_USE_ENV_PROXY=1
node scripts/mausbot-telegram-bridge.mjs init https://afghanfollowers-telegram.afghan-video-bot.workers.dev
```

Send the printed `/mausbot_pair CODE` as a new message to your existing private bot.
The one-time pairing authorization lasts ten minutes. Then:

```sh
node scripts/mausbot-telegram-bridge.mjs pair
node scripts/mausbot-telegram-bridge.mjs listen
```

The dedicated session token is written only to the local private state file; it is not
printed. It expires after 30 days. Pairing again replaces the old session. It does not automatically redispatch tasks from
the previous pairing; reconcile those receipts before issuing a new instruction. Stop the
bridge with Ctrl-C; `/agent_disconnect` revokes its queue access immediately.
Do not commit the local state, SQLite journal or pairing code. The default
`.mausbot-telegram/` directory is ignored by Git.

## Telegram commands

- `/agent وضعیت تولید ویدیو را بررسی و خطا را رفع کن`
- `/agent_status` — bridge presence and last observed engine status, not a success claim.
- `/agent_disconnect` — revoke the bridge. It does not undo a task already submitted.

An enqueue acknowledgment means **queued**, not completed. A terminal reply includes
its request ID and actual status. Approval questions remain subject to Mausbot's own
permission broker; a task needing input is reported as such, never silently approved.
A missing GitHub write connection means the agent can diagnose and prepare local patches,
but must not claim a production change. Keep budget, daily-start, signed-media and quality
gates intact; failed or uncertain video requests and deliveries are not blindly retried.

## Recovery and verification

The local SQLite journal writes submission intent before invoking the CLI. Every send
uses a deterministic Mausbot send ID. Repeated queue reads do not submit the same task
again. An interrupted submission is reported as uncertain; a lost result upload is kept
for reconciliation rather than resent. A stale listener lock is not silently stolen:
check that its recorded process is gone and inspect the journal before removing it.
KV is a private mailbox, not a globally transactional exactly-once execution service.
Only one paired listener should run; its filesystem lock and durable journal are required.

Tests use fake queues and fake CLI responses, with no model, Telegram, browser or GPU calls:

```sh
node worker/test-mausbot.mjs
node scripts/test-mausbot-telegram-bridge.mjs
```

They cover owner/sender checks, single-use pairing, revocation, duplicate messages,
waiting-for-input versus terminal results, uncertain Telegram outcomes, duplicate local
queue delivery and a process crash after durable submission intent. Production activation
still requires deployment, owner pairing and a successful real model sign-in.
