"use client"
import { useEffect, useState } from "react"

const DEVICE_KEY = "sbl:device-id"
const NAME_KEY = "sbl:display-name"
const FOLLOWS_KEY = "sbl:followed-teams"

function uuid(): string {
  // Tiny stand-in for crypto.randomUUID — works in older browsers too.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Stable per-browser ID. Created on first call. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(NAME_KEY)
}

export function setDisplayName(name: string) {
  localStorage.setItem(NAME_KEY, name)
  // Notify same-tab listeners (storage events only fire in OTHER tabs).
  window.dispatchEvent(new CustomEvent("sbl:display-name-changed"))
}

export function useDevice() {
  const [deviceId, setDeviceId] = useState<string>("")
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    setDeviceId(getDeviceId())
    setName(getDisplayName())

    function onChange() { setName(getDisplayName()) }
    window.addEventListener("sbl:display-name-changed", onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener("sbl:display-name-changed", onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  return { deviceId, displayName: name }
}

// ---------- Followed teams (localStorage list of team IDs) ----------

export function getFollowedTeams(): string[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(FOLLOWS_KEY) || "[]") } catch { return [] }
}

export function isFollowing(teamId: string): boolean {
  return getFollowedTeams().includes(teamId)
}

export function toggleFollow(teamId: string): boolean {
  const list = getFollowedTeams()
  const idx = list.indexOf(teamId)
  let nowFollowing: boolean
  if (idx >= 0) { list.splice(idx, 1); nowFollowing = false }
  else { list.push(teamId); nowFollowing = true }
  localStorage.setItem(FOLLOWS_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent("sbl:follows-changed"))
  return nowFollowing
}

export function useFollows() {
  const [follows, setFollows] = useState<string[]>([])
  useEffect(() => {
    setFollows(getFollowedTeams())
    function onChange() { setFollows(getFollowedTeams()) }
    window.addEventListener("sbl:follows-changed", onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener("sbl:follows-changed", onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])
  return follows
}
