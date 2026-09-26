import { MotionConfig } from "motion/react";
import AppRouter from "./routes/AppRouter";
import { ThemeProvider } from "@/Components/theme/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AppRouter />
      </MotionConfig>
    </ThemeProvider>
  );
}
