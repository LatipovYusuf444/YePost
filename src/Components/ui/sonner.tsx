import { Toaster as Sonner, type ToasterProps } from "sonner"

// next-themes o'rniga loyihaning o'z ThemeProvider'i ishlatiladi (asosiy va "Shisha" rejimlari).
// Toast kartasining foni/matni mavzu tokenlariga (--popover...) moslashadi, muvaffaqiyat/xato ranglari
// esa semantik (yashil/qizil) bo'lib qoladi.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !shadow-[0_18px_50px_rgba(15,23,42,.18)] !font-semibold",
          title: "!font-black",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
