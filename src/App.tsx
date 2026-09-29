import { MotionConfig } from "motion/react";
import AppRouter from "./routes/AppRouter";
import { ThemeProvider } from "@/Components/theme/ThemeProvider";
import { Toaster } from "@/Components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AppRouter />
        <Toaster />
      </MotionConfig>
    </ThemeProvider>
  );
}
