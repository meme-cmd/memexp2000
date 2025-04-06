import { DesktopIcons } from "./_components/desktop-icons";
import { MobileDock } from "./_components/mobile-dock";
import { Containooor } from "./_components/container";
import { DialogContent } from "./_components/dialog-content";
import { SocialInfo } from "./_components/social-info";

export default function Home() {
  return (
    <Containooor>
      <main className="mobile-content-container relative h-screen w-screen overflow-hidden">
        <SocialInfo />
        <DesktopIcons />
        <MobileDock />
        <DialogContent />
      </main>
    </Containooor>
  );
}
