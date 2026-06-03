import { Outlet } from "react-router-dom";
import YonPanel from "./YonPanel";
import YuqoriPanel from "./YuqoriPanel";

export default function AsosiyLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF7ED] via-[#FFF4E6] to-[#FFEAD5]">
      <YonPanel />

      <main className="min-h-screen pl-[116px] pr-6 pt-6 transition-all duration-500 ease-in-out peer-hover/sidebar:pl-[304px]">
        <YuqoriPanel />
        <div className="min-h-[calc(100vh-48px)] rounded-[34px] border border-orange-100/70 bg-white/75 p-7 shadow-[0_20px_80px_rgba(251,146,60,0.12)] backdrop-blur-xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
