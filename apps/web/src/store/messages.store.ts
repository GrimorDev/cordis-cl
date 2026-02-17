import { create } from 'zustand'
import type { Message } from '@cordis/shared'

interface MessagesState {
  messages: Record<string, Message[]> // channelId -> messages
  typing: Record<string, Record<string, number>> // channelId -> userId -> timestamp

  setMessages: (channelId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (message: Message) => void
  deleteMessage: (channelId: string, messageId: string) => void
  prependMessages: (channelId: string, messages: Message[]) => void // for loading older messages

  setTyping: (channelId: string, userId: string, timestamp: number) => void
  clearTyping: (channelId: string, userId: string) => void
  getTypingUsers: (channelId: string) => string[]
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: {},
  typing: {},

  setMessages: (channelId, messages) =>
    set(state => ({ messages: { ...state.messages, [channelId]: messages } })),

  addMessage: message =>
    set(state => {
      const existing = state.messages[message.channelId] ?? []
      // Avoid duplicates
      if (existing.some(m => m.id === message.id)) return state
      return {
        messages: {
          ...state.messages,
          [message.channelId]: [...existing, message],
        },
      }
    }),

  updateMessage: message =>
    set(state => ({
      messages: {
        ...state.messages,
        [message.channelId]: (state.messages[message.channelId] ?? []).map(m =>
          m.id === message.id ? message : m
        ),
      },
    })),

  deleteMessage: (channelId, messageId) =>
    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).filter(m => m.id !== messageId),
      },
    })),

  prependMessages: (channelId, messages) =>
    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: [...messages, ...(state.messages[channelId] ?? [])],
      },
    })),

  setTyping: (channelId, userId, timestamp) =>
    set(state => ({
      typing: {
        ...state.typing,
        [channelId]: {
          ...(state.typing[channelId] ?? {}),
          [userId]: timestamp,
        },
      },
    })),

  clearTyping: (channelId, userId) =>
    set(state => {
      const channelTyping = { ...(state.typing[channelId] ?? {}) }
      delete channelTyping[userId]
      return { typing: { ...state.typing, [channelId]: channelTyping } }
    }),

  getTypingUsers: channelId => {
    const channelTyping = get().typing[channelId] ?? {}
    const now = Date.now()
    return Object.entries(channelTyping)
      .filter(([, timestamp]) => now - timestamp < 10000)
      .map(([userId]) => userId)
  },
}))
