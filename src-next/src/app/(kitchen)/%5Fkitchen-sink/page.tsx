import { notFound } from "next/navigation";
import { MainBoard } from "@/components/kitchen-sink/main-board";
import "@/components/kitchen-sink/kitchen-sink.css";

// /_kitchen-sink: the Main board ("Foundations: brand, type, components") rebuilt from @iitpulse/ui.
// Development only: production builds answer 404. The folder is %5Fkitchen-sink because a plain "_" folder is
// private in the App Router. The Motion board is at /_kitchen-sink/motion.
export default function KitchenSinkMainPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MainBoard />;
}
