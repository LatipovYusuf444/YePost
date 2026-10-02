import { MotionConfig } from "motion/react";
import AppRouter from "./routes/AppRouter";
import { ThemeProvider } from "@/Components/theme/ThemeProvider";
import { Toaster } from "@/Components/ui/sonner";
import ErrorBoundary from "@/Components/common/ErrorBoundary";

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
        <Toaster />
      </MotionConfig>
    </ThemeProvider>
  );
}
