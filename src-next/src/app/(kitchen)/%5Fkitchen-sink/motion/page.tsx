import { notFound } from "next/navigation";
import { MotionBoard } from "@/components/kitchen-sink/motion-board";
import "@/components/kitchen-sink/kitchen-sink.css";

// /_kitchen-sink/motion: the Motion board ("Motion & micro-interactions", playable) rebuilt from @iitpulse/ui.
// Development only: production builds answer 404.
export default function KitchenSinkMotionPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MotionBoard />;
}
