import { config } from '../config'

export const normaliseUsername = (username: string) => username.trim().toLowerCase()

export const isValidUsername = (username: string) => /^[a-z0-9_-]{3,20}$/.test(username)

export const usernameToEmail = (username: string) => `${username}@${config.emailDomain}`
