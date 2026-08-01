import { decrypt } from "@/lib/crypto";

const DISCORD_API = "https://discord.com/api/v10";
const TELEGRAM_API = "https://api.telegram.org";

// Bot tokens are stored encrypted (see src/lib/crypto.ts) — decrypt before use.
function decodeToken(encoded: string): string {
  return decrypt(encoded);
}

// Discord Integration

export interface BotConfigValidation {
  valid: boolean;
  error?: string;
}

// Confirm the bot token is real and the bot is actually a member of serverId —
// called when a creator saves Discord integration settings, so bad credentials
// are rejected up front instead of only surfacing when a member tries to join.
export async function validateDiscordBotConfig(
  botToken: string,
  serverId: string
): Promise<BotConfigValidation> {
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${serverId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: "Bot token is invalid" };
    if (res.status === 403 || res.status === 404) {
      return { valid: false, error: "Bot is not a member of that server" };
    }
    return { valid: false, error: `Discord API error ${res.status}` };
  } catch (error) {
    console.error("[Discord] validateDiscordBotConfig failed:", error);
    return { valid: false, error: "Could not reach Discord API" };
  }
}

export async function assignDiscordRole(
  botToken: string,
  serverId: string,
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    const token = decodeToken(botToken);
    const res = await fetch(
      `${DISCORD_API}/guilds/${serverId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${token}`,
        },
      }
    );
    return res.ok;
  } catch (error) {
    console.error("[Discord] Failed to assign role:", error);
    return false;
  }
}

export async function removeDiscordRole(
  botToken: string,
  serverId: string,
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    const token = decodeToken(botToken);
    const res = await fetch(
      `${DISCORD_API}/guilds/${serverId}/members/${userId}/roles/${roleId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${token}`,
        },
      }
    );
    return res.ok;
  } catch (error) {
    console.error("[Discord] Failed to remove role:", error);
    return false;
  }
}

// Create a real single-use Discord invite. Discord invites are channel-scoped,
// so we use the configured managed channel, or fall back to the first text
// channel the bot can see in the guild.
export async function createDiscordInviteLink(
  botToken: string,
  serverId: string,
  channelId?: string | null,
  maxUses: number = 1,
  expiresIn: number = 86400 // 24 hours
): Promise<string | null> {
  try {
    const token = decodeToken(botToken);

    let targetChannelId = channelId;
    if (!targetChannelId) {
      const channelsRes = await fetch(
        `${DISCORD_API}/guilds/${serverId}/channels`,
        { headers: { Authorization: `Bot ${token}` } }
      );
      if (!channelsRes.ok) return null;
      const channels = (await channelsRes.json()) as Array<{ id: string; type: number }>;
      // type 0 = GUILD_TEXT
      targetChannelId = channels.find((c) => c.type === 0)?.id;
      if (!targetChannelId) return null;
    }

    const res = await fetch(`${DISCORD_API}/channels/${targetChannelId}/invites`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_uses: maxUses,
        max_age: expiresIn,
        unique: true,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { code: string };
    return `https://discord.gg/${data.code}`;
  } catch (error) {
    console.error("[Discord] Failed to create invite:", error);
    return null;
  }
}

export interface GrantDiscordResult {
  ok: boolean;
  joined?: boolean; // true if the user was added to the guild
  needsConnect?: boolean; // true if the user must link Discord via OAuth first
}

// Grant access: add the user to the guild (using their OAuth2 access token, which
// requires the guilds.join scope) and assign the tier role. If we don't have the
// user's access token we can only assign a role to someone already in the guild.
export async function grantDiscordAccess(opts: {
  botToken: string;
  serverId: string;
  roleId: string;
  discordUserId?: string | null;
  userAccessToken?: string | null;
}): Promise<GrantDiscordResult> {
  const { botToken, serverId, roleId, discordUserId, userAccessToken } = opts;

  if (!discordUserId) {
    // No linked Discord identity — the frontend must run the OAuth connect flow.
    return { ok: false, needsConnect: true };
  }

  try {
    const token = decodeToken(botToken);

    if (userAccessToken) {
      // PUT guild member: adds the user to the guild and sets roles in one call.
      // 201 => added (roles applied); 204 => already a member (roles NOT applied).
      const joinRes = await fetch(
        `${DISCORD_API}/guilds/${serverId}/members/${discordUserId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: userAccessToken,
            roles: [roleId],
          }),
        }
      );

      if (joinRes.status === 201) {
        return { ok: true, joined: true };
      }
      if (joinRes.status === 204) {
        // Already a member: assign the role explicitly.
        const assigned = await assignDiscordRole(botToken, serverId, discordUserId, roleId);
        return { ok: assigned, joined: false };
      }
      // Fall through to a plain role assignment attempt on unexpected status.
    }

    // No access token (or join fell through): try assigning the role directly.
    const assigned = await assignDiscordRole(botToken, serverId, discordUserId, roleId);
    return { ok: assigned, needsConnect: !assigned ? !userAccessToken : undefined };
  } catch (error) {
    console.error("[Discord] grantDiscordAccess failed:", error);
    return { ok: false };
  }
}

// Revoke access: remove the tier role from the user.
export async function revokeDiscordAccess(opts: {
  botToken: string;
  serverId: string;
  roleId: string;
  discordUserId?: string | null;
}): Promise<boolean> {
  const { botToken, serverId, roleId, discordUserId } = opts;
  if (!discordUserId) return false;
  return removeDiscordRole(botToken, serverId, discordUserId, roleId);
}

// Telegram Integration

// Confirm the bot token is real and the bot can see groupId — called when a
// creator saves Telegram integration settings, mirroring validateDiscordBotConfig.
export async function validateTelegramBotConfig(
  botToken: string,
  groupId: string
): Promise<BotConfigValidation> {
  try {
    const meRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
    const me = await meRes.json();
    if (!me.ok) return { valid: false, error: "Bot token is invalid" };

    const chatRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: groupId }),
    });
    const chat = await chatRes.json();
    if (!chat.ok) {
      return { valid: false, error: "Bot cannot access that group (check groupId and that the bot was added to it)" };
    }

    return { valid: true };
  } catch (error) {
    console.error("[Telegram] validateTelegramBotConfig failed:", error);
    return { valid: false, error: "Could not reach Telegram API" };
  }
}

export async function createTelegramInviteLink(
  botToken: string,
  groupId: string,
  expireDate?: number
): Promise<string | null> {
  try {
    const token = decodeToken(botToken);
    const res = await fetch(`${TELEGRAM_API}/bot${token}/createChatInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: groupId,
        expire_date: expireDate,
        member_limit: 1, // Single use
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return data.result.invite_link;
    }
    return null;
  } catch (error) {
    console.error("[Telegram] Failed to create invite link:", error);
    return null;
  }
}

export async function removeTelegramMember(
  botToken: string,
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    const token = decodeToken(botToken);

    // Ban the member first
    const banRes = await fetch(`${TELEGRAM_API}/bot${token}/banChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: userId,
      }),
    });

    if (!banRes.ok) throw new Error("Ban failed");

    // Then unban (effective removal without permanent block)
    const unbanRes = await fetch(`${TELEGRAM_API}/bot${token}/unbanChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: userId,
      }),
    });

    return unbanRes.ok;
  } catch (error) {
    console.error("[Telegram] Failed to remove member:", error);
    return false;
  }
}

export async function getTelegramMemberInfo(
  botToken: string,
  groupId: string,
  userId: string
): Promise<any | null> {
  try {
    const token = decodeToken(botToken);
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: userId,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error("[Telegram] Failed to get member info:", error);
    return null;
  }
}

// Webhook handlers

// The member's linked external identities, resolved from the User record by the
// caller (webhook). These are the platform-native ids — NOT the Ailexity user id.
export interface MemberIdentity {
  discordUserId?: string | null;
  discordAccessToken?: string | null;
  telegramUserId?: string | null;
}

export interface GrantOutcome {
  discord?: GrantDiscordResult;
  telegramInviteLink?: string | null;
}

// Called on subscription.created / subscription.renewed. Grants access on every
// configured platform and returns what happened so the caller can, e.g., surface
// a "Connect Discord" prompt or deliver a Telegram invite link to the user.
export async function handleSubscriptionCreated(
  communityId: string,
  identity: MemberIdentity,
  discordConfig?: any,
  telegramConfig?: any,
  // Per-tier role; falls back to the community-wide managedRoleId when absent.
  discordRoleId?: string | null
): Promise<GrantOutcome> {
  const outcome: GrantOutcome = {};

  const effectiveRoleId = discordRoleId || discordConfig?.managedRoleId;
  if (discordConfig && effectiveRoleId) {
    outcome.discord = await grantDiscordAccess({
      botToken: discordConfig.botToken,
      serverId: discordConfig.serverId,
      roleId: effectiveRoleId,
      discordUserId: identity.discordUserId,
      userAccessToken: identity.discordAccessToken,
    });
  }

  if (telegramConfig?.groupId) {
    // Telegram has no OAuth "add to group" — we mint a single-use invite link and
    // the caller delivers it to the user (email / on-screen). 48h expiry.
    const expireDate = Math.floor(Date.now() / 1000) + 48 * 3600;
    outcome.telegramInviteLink = await createTelegramInviteLink(
      telegramConfig.botToken,
      telegramConfig.groupId,
      expireDate
    );
  }

  return outcome;
}

// Called on subscription.cancelled / grace-period expiry. Removes platform access.
export async function handleSubscriptionCancelled(
  communityId: string,
  identity: MemberIdentity,
  discordConfig?: any,
  telegramConfig?: any,
  discordRoleId?: string | null
): Promise<void> {
  const effectiveRoleId = discordRoleId || discordConfig?.managedRoleId;
  if (discordConfig && effectiveRoleId && identity.discordUserId) {
    await revokeDiscordAccess({
      botToken: discordConfig.botToken,
      serverId: discordConfig.serverId,
      roleId: effectiveRoleId,
      discordUserId: identity.discordUserId,
    });
  }

  if (telegramConfig?.groupId && identity.telegramUserId) {
    await removeTelegramMember(
      telegramConfig.botToken,
      telegramConfig.groupId,
      identity.telegramUserId
    );
  }
}
