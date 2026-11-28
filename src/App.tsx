import { MotionConfig } from "motion/react";
import AppRouter from "./routes/AppRouter";
import { ThemeProvider } from "@/Components/theme/ThemeProvider";
import { Toaster } from "@/Components/ui/sonner";
import ErrorBoundary from "@/Components/common/ErrorBoundary";
import HujjatOgohlantirishOynasi from "@/Components/common/HujjatOgohlantirishOynasi";
import UlanishBanneri from "@/Components/common/UlanishBanneri";

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
        <HujjatOgohlantirishOynasi />
        <UlanishBanneri />
        <Toaster />
      </MotionConfig>
    </ThemeProvider>
  );
}
