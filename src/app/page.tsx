import { XPDesktop } from "./_components/xp-desktop";
import { MobileDock } from "./_components/mobile-dock";
import { XPDialogContent } from "./_components/xp-dialog-content";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <XPDesktop />
      <MobileDock />
      <XPDialogContent />
    </main>
  );
}
