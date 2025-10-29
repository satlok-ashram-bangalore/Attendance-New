"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { Notification } from "@/components/ui/notification"

export interface NotificationItem {
  id: string
  type: "success" | "error" | "info" | "warning" | "notification" | "premium" | "love" | "achievement"
  message: string
  duration?: number
}

export interface NotificationContextType {
  showNotification: (
    type: "success" | "error" | "info" | "warning" | "notification" | "premium" | "love" | "achievement",
    message: string,
    duration?: number,
  ) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  notification: (message: string, duration?: number) => void
  premium: (message: string, duration?: number) => void
  love: (message: string, duration?: number) => void
  achievement: (message: string, duration?: number) => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const showNotification = useCallback(
    (
      type: "success" | "error" | "info" | "warning" | "notification" | "premium" | "love" | "achievement",
      message: string,
      duration?: number,
    ) => {
      const id = generateId()
      const newNotification: NotificationItem = { id, type, message, duration }

      setNotifications((prev) => [...prev, newNotification])
    },
    [],
  )

  const success = useCallback(
    (message: string, duration?: number) => {
      showNotification("success", message, duration)
    },
    [showNotification],
  )

  const error = useCallback(
    (message: string, duration?: number) => {
      showNotification("error", message, duration)
    },
    [showNotification],
  )

  const info = useCallback(
    (message: string, duration?: number) => {
      showNotification("info", message, duration)
    },
    [showNotification],
  )

  const warning = useCallback(
    (message: string, duration?: number) => {
      showNotification("warning", message, duration)
    },
    [showNotification],
  )

  const notificationMethod = useCallback(
    (message: string, duration?: number) => {
      showNotification("notification", message, duration)
    },
    [showNotification],
  )

  const premium = useCallback(
    (message: string, duration?: number) => {
      showNotification("premium", message, duration)
    },
    [showNotification],
  )

  const love = useCallback(
    (message: string, duration?: number) => {
      showNotification("love", message, duration)
    },
    [showNotification],
  )

  const achievement = useCallback(
    (message: string, duration?: number) => {
      showNotification("achievement", message, duration)
    },
    [showNotification],
  )

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        success,
        error,
        info,
        warning,
        notification: notificationMethod,
        premium,
        love,
        achievement,
        clearNotification,
        clearAllNotifications,
      }}
    >
      {children}
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          index={index}
          onClose={clearNotification}
        />
      ))}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}
