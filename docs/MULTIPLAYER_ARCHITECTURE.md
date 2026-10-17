# Multiplayer architecture & security boundary

## Implemented in V5.7
An **opt-in cooperative presence preview**: authenticated Supabase browser users can choose a room code and exchange low-frequency position snapshots via Supabase Realtime WebSocket. No email, password, JWT, item inventory, player save JSON or private info is placed inside the broadcast payload. JWT is passed to the channel join, not to other players. A client cannot join using the game UI without a cloud session.

These are intentionally non-authoritative **ghost players**. Each client independently runs its own mobs, loot, boss, crafting and local/cloud player save. Consequently, two ghosts are NOT fighting the same boss or sharing XP. The channel is public by current configuration; anybody with room knowledge and a Supabase public API key may be able to observe/spoof positions. Do not use for private locations or competitive play.

## Next implementation gates (not completed)
1. Dedicated Supabase test project and per-room membership authorization; private Realtime channels with RLS policy and rate limits.
2. Server-owned game session: input-command protocol, server movement/physics and fixed-step mob AI, authoritative HP/damage/drop and reward transactions.
3. Versioned state snapshots, sequence numbers, jitter/interpolation, clock skew and disconnect/resume.
4. Server signature on earned petal and rarity; independent inventory audit and item ownership, no client-authoritative mutation.
5. Load/stress tests (≥8 authenticated users/room), RLS negative tests, privacy audit, cross-device Safari/HarmonyOS long-play.
6. Only then offer genuine co-op bosses, shared events and exchange/economy, with anti-abuse measures.

Official protocol reference: https://supabase.com/docs/guides/realtime/protocol
