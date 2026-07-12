import { MotionConfig } from "motion/react";
import AppRouter from "./routes/AppRouter";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppRouter />
    </MotionConfig>
  );
}
