/** Local notifications for "she messaged you" (Android APK or browser). */
import { askNativeNotificationPermission, nativeNotifications, nativeNotify } from './native'

export function notificationSupported(): boolean {
  if (nativeNotifications()) return true
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (nativeNotifications()) return 'granted'
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotifications(): Promise<boolean> {
  if (nativeNotifications()) {
    askNativeNotificationPermission()
    return true
  }
  if (!notificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export function showNotification(title: string, body: string, tag = 'yuki-message'): void {
  if (nativeNotifications()) {
    nativeNotify(title, body)
    return
  }
  if (!notificationSupported() || Notification.permission !== 'granted') return
  const options: NotificationOptions = {
    body,
    tag,
    icon: '/icon.png',
    badge: '/icon.png',
    silent: false,
    data: { url: '/' },
  }
  navigator.serviceWorker?.ready
    .then((reg) => reg.showNotification(title, options))
    .catch(() => {
      try {
        new Notification(title, options)
      } catch {
        /* ignore */
      }
    })
}

export function scheduleWhileVisible(
  minutes: number,
  onDue: () => void
): { cancel: () => void; reschedule: () => void } {
  let timer: number | undefined
  const plan = () => {
    if (timer) window.clearTimeout(timer)
    const jitter = 0.65 + Math.random() * 0.8
    timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') onDue()
      plan()
    }, Math.max(60_000, minutes * 60_000 * jitter))
  }
  plan()
  return {
    cancel: () => timer && window.clearTimeout(timer),
    reschedule: plan,
  }
}
