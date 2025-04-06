import { DesktopIcons } from "./_components/desktop-icons";
import { MobileDock } from "./_components/mobile-dock";
import { Containooor } from "./_components/container";
import { DialogContent } from "./_components/dialog-content";

export default function Home() {
  return (
    <Containooor>
      <main className="mobile-content-container relative h-screen w-screen overflow-hidden">
        <DesktopIcons />
        <MobileDock />
        <DialogContent />
      </main>
    </Containooor>
  );
}
