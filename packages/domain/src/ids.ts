import { Schema } from "effect"

const crockford = "ABCDEFGHJKMNPQRSTVWXYZ23456789"

export const JoinCode = Schema.String
export type JoinCode = string

export const LobbyId = Schema.String
export type LobbyId = string

export const ListenerId = Schema.String
export type ListenerId = string

export const Username = Schema.String
export type Username = string

export const makeJoinCode = (bytes: Uint8Array): JoinCode => {
  let out = ""
  for (let i = 0; i < 6; i++) {
    const byte = bytes[i] ?? 0
    out += crockford.charAt(byte % crockford.length)
  }
  return out
}
