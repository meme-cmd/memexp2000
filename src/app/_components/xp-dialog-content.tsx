"use client";

import { useEffect } from "react";
import { XPWindow } from "./xp-window";
import { MobileDialog } from "./mobile-dialog";
import { useDialogStore } from "@/store/dialog-store";
import type { DialogState, DialogId } from "@/store/dialog-store";
import { useNavigationStore } from "@/store/navigation-store";
import { useChatStore } from "@/store/chat-store";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";

function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

export function XPDialogContent() {
  const { openDialogs, closeDialog } = useDialogStore();
  const { clearCurrentConversation } = useChatStore();
  const { currentView } = useNavigationStore();
  const { publicKey } = useUser();

  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;

  useEffect(() => {
    const store = useDialogStore.getState();
    if (currentView?.id === "CHAT") {
      store.openDialog("CHAT" as DialogId);
      store.updateDialogView("CHAT" as DialogId, currentView);
    }
    if (currentView?.id === "BACKROOM_DETAIL") {
      store.openDialog("BACKROOM_DETAIL" as DialogId);
      store.updateDialogView("BACKROOM_DETAIL" as DialogId, currentView);
    }
  }, [currentView]);

  const handleClose = (dialogId: DialogId) => {
    closeDialog(dialogId);
    clearCurrentConversation();
  };

  const handleBack = (dialogId: DialogId) => {
    useDialogStore.getState().goBack(dialogId);
  };

  return (
    <>
      {openDialogs.map((dialog) => {
        const title = dialog.currentView.title;
        const showBack = useDialogStore.getState().canGoBack(dialog.id);

        if (isMobile) {
          return (
            <MobileDialog
              key={dialog.id}
              dialogId={dialog.id}
              title={title}
              isOpen={true}
              onClose={() => handleClose(dialog.id)}
              onBack={showBack ? () => handleBack(dialog.id) : undefined}
              className="pb-safe"
            >
              <div className="p-4">
                <h3 className="mb-2 text-lg font-bold">
                  {dialog.currentView.title} Content
                </h3>
                <p>
                  This dialog would typically show {dialog.id} content. Due to the Windows XP theme, the content rendering has been simplified.
                </p>
              </div>
            </MobileDialog>
          );
        }

        return (
          <XPWindow
            key={dialog.id}
            dialogId={dialog.id}
            title={title}
            isOpen={true}
            onClose={() => handleClose(dialog.id)}
            onBack={showBack ? () => handleBack(dialog.id) : undefined}
            style={{ zIndex: dialog.zIndex }}
            onClick={() => useDialogStore.getState().bringToFront(dialog.id)}
          >
            <div className="p-4">
              <h3 className="mb-2 text-lg font-bold">
                {dialog.currentView.title} Content
              </h3>
              <p>
                This dialog would typically show {dialog.id} content. Due to the Windows XP theme, the content rendering has been simplified.
              </p>
            </div>
          </XPWindow>
        );
      })}
    </>
  );
} 