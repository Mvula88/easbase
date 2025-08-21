import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

type Toast = ToastProps & {
  id: string
}

const toastContext = React.createContext<{
  toasts: Toast[]
  toast: (props: ToastProps) => void
  dismiss: (id: string) => void
}>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
})

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    const id = String(toastCount++)
    const newToast = { ...props, id }
    
    setToasts((prev) => [...prev, newToast])

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    toasts,
    toast,
    dismiss,
  }
}