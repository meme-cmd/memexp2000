"use client";

import { useEffect } from "react";
import { Box } from "./box";
import { MobileDialog } from "./mobile-dialog";
import { ConnectWalletButton } from "./connect-wallet-button";
import { useDialogStore } from "@/store/dialog-store";
import type { DialogState, DialogId } from "@/store/dialog-store";
import { useChatStore } from "@/store/chat-store";
import { useNavigationStore } from "@/store/navigation-store";
import { ChatInterface } from "./chat-interface";
import { CreateAgentForm } from "./create-agent-form";
import { CreateBackroomForm } from "./create-backroom-form";
import { api } from "@/trpc/react";
import type { Agent } from "@/types/agent";
import type { Backroom } from "@/types/backroom";
import { useUser } from "@/hooks/use-user";
import { agentToast } from "./agent-toast";
import { BackroomChat } from "./backroom-chat";
import { UserProfileForm } from "./user-profile-form";
import { useState } from "react";

// Create a simple window size hook for mobile detection
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

export function DialogContent() {
  const { publicKey } = useUser();
  const { openDialogs, closeDialog, handleButtonClick } = useDialogStore();
  const { setCurrentConversation, clearCurrentConversation } = useChatStore();
  const { currentView } = useNavigationStore();

  // Use window size hook to determine if we're on mobile
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768; // md breakpoint is typically 768px

  const agentsQuery = api.r2.listAgents.useQuery(
    { limit: 1000, creator: publicKey ?? undefined },
    {
      enabled: openDialogs.some((d) => d.currentView.id === "AGENTS"),
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 30,
    },
  );

  const backroomsQuery = api.r2.listBackrooms.useQuery(
    { creator: publicKey ?? undefined },
    { enabled: openDialogs.some((d) => d.currentView.id === "BACKROOMS") },
  );

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

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClose = (dialogId: DialogId) => {
    closeDialog(dialogId);
    clearCurrentConversation();
  };

  const handleBack = (dialogId: DialogId) => {
    useDialogStore.getState().goBack(dialogId);
  };

  const handleCreateAgentSuccess = () => {
    void agentsQuery.refetch();
  };

  const handleAgentClick = (agent: Agent, dialogId: DialogId) => {
    try {
      if (!publicKey) {
        agentToast.walletRequired("Connect wallet to interact with agents");
        handleButtonClick("connect-wallet");
        return;
      }

      setCurrentConversation(publicKey, agent.id);
      const view = {
        id: "CHAT" as DialogId,
        title: agent.name,
        data: agent,
      };
      const store = useDialogStore.getState();
      store.updateDialogView(dialogId, view);
    } catch (error) {
      // Don't log error to console
      if (
        error instanceof Error &&
        (error.message.includes("rejected") ||
          error.message.includes("User rejected"))
      ) {
        agentToast.info("Transaction was cancelled by user");
      } else {
        agentToast.error("Failed to open chat");
      }
    }
  };

  const handleBackroomClick = (backroom: Backroom, dialogId: DialogId) => {
    try {
      const view = {
        id: "BACKROOM_DETAIL" as DialogId,
        title: backroom.name,
        data: { id: backroom.id },
      };
      const store = useDialogStore.getState();
      store.updateDialogView(dialogId, view);
    } catch (error) {
      // Don't log error to console
      if (
        error instanceof Error &&
        (error.message.includes("rejected") ||
          error.message.includes("User rejected"))
      ) {
        agentToast.info("Transaction was cancelled by user");
      } else {
        agentToast.error("Failed to open backroom");
      }
    }
  };

  const handleCreateClick = (
    dialogId: DialogId,
    type: "agent" | "backroom",
  ) => {
    try {
      if (!publicKey) {
        agentToast.walletRequired(`Connect wallet to create ${type}s`);
        return;
      }

      const view = {
        id: type === "agent" ? "CREATE_AGENT" : ("CREATE_BACKROOM" as DialogId),
        title: type === "agent" ? "Create Agent" : "Create Backroom",
        data: null,
      };
      const store = useDialogStore.getState();
      store.updateDialogView(dialogId, view);
    } catch (error) {
      // Don't log error to console
      if (
        error instanceof Error &&
        (error.message.includes("rejected") ||
          error.message.includes("User rejected"))
      ) {
        agentToast.info("Transaction was cancelled by user");
      } else {
        agentToast.error(`Failed to open ${type} creation dialog`);
      }
    }
  };

  const renderDialogContent = (dialog: DialogState) => {
    const currentView = dialog.currentView;

    if (currentView.id === "CHAT") {
      const agent = currentView.data as Agent | null;
      if (!agent) return null;
      return <ChatInterface userId={publicKey!} agentId={agent.id} />;
    }

    if (currentView.id === "BACKROOM_DETAIL") {
      const data = currentView.data as { id: string } | null;
      if (!data) return null;
      return <BackroomChat backroomId={data.id} />;
    }

    if (currentView.id === "CREATE_AGENT") {
      return <CreateAgentForm onSuccess={handleCreateAgentSuccess} />;
    }

    if (currentView.id === "CREATE_BACKROOM") {
      return <CreateBackroomForm />;
    }

    if (currentView.id === "USER") {
      return <UserProfileForm />;
    }

    if (currentView.id === "BACKROOMS") {
      return (
        <div className="space-y-4 text-black">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleCreateClick(dialog.id, "backroom")}
              className="rounded border border-black bg-[#00009e] px-4 py-2 text-xs text-white transition-colors hover:bg-blue-600"
            >
              Create Backroom
            </button>
            <ConnectWalletButton />
          </div>
          {backroomsQuery.isLoading && (
            <div className="text-center text-sm text-gray-600">
              Loading backrooms...
            </div>
          )}

          {backroomsQuery.error && (
            <div className="text-center text-sm text-red-500">
              Error loading backrooms: {backroomsQuery.error.message}
            </div>
          )}

          {backroomsQuery.data && (
            <div className="mobile-grid grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {backroomsQuery.data.backrooms.map((backroom) => (
                <div
                  key={backroom.id}
                  onClick={() => handleBackroomClick(backroom, dialog.id)}
                  className="cursor-pointer rounded bg-white px-3 py-2 text-sm shadow transition-transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-start font-medium text-black">
                        {backroom.name}
                      </h3>
                      {backroom.visibility === "private" && (
                        <span className="rounded bg-gray-100 px-1 text-xs text-gray-600">
                          Private
                        </span>
                      )}
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        backroom.status === "active"
                          ? "bg-green-500 brightness-200"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="text-start text-xs font-thin text-gray-500">
                    {backroom.topic}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-purple-100 px-1 text-xs text-purple-800">
                      {backroom.messages.length}/{backroom.messageLimit}{" "}
                      messages
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatTimestamp(backroom.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4 text-black">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => handleCreateClick(dialog.id, "agent")}
            className="rounded border border-black bg-[#00009e] px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
          >
            Create Agent
          </button>
          <ConnectWalletButton />
        </div>
        {agentsQuery.isLoading && (
          <div className="text-center text-sm text-gray-600">
            Loading agents...
          </div>
        )}

        {agentsQuery.error && (
          <div className="text-center text-sm text-red-500">
            Error loading agents: {agentsQuery.error.message}
          </div>
        )}

        {agentsQuery.data && (
          <div className="mobile-grid grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {agentsQuery.data.agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => handleAgentClick(agent, dialog.id)}
                className="cursor-pointer rounded bg-white px-3 py-2 text-sm shadow transition-transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-start font-medium text-black">
                      {agent.name}
                    </h3>
                    {agent.visibility === "private" && (
                      <span className="rounded bg-gray-100 px-1 text-xs text-gray-600">
                        Private
                      </span>
                    )}
                    {agent.canLaunchToken && (
                      <span className="rounded bg-purple-100 px-1 text-xs text-purple-600">
                        Token Launcher
                      </span>
                    )}
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      agent.status === "active"
                        ? "bg-green-500 brightness-200"
                        : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="text-start text-xs font-thin text-gray-500">
                  {agent.type}
                </div>
                <div className="my-1 text-start text-xs font-thin text-gray-800">
                  {agent.description}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {agent.traits?.map((trait) => (
                    <span
                      key={trait}
                      className="rounded bg-blue-100 px-1 text-xs text-blue-800"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {formatTimestamp(agent.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {openDialogs.map((dialog) => {
        const title = dialog.currentView.title;
        const showBack = useDialogStore.getState().canGoBack(dialog.id);
        const content = renderDialogContent(dialog);

        // Render mobile or desktop dialog based on screen size
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
              {content}
            </MobileDialog>
          );
        }

        // Desktop view (unchanged)
        return (
          <Box
            key={dialog.id}
            title={title}
            isOpen={true}
            onClose={() => handleClose(dialog.id)}
            onBack={showBack ? () => handleBack(dialog.id) : undefined}
            style={{ zIndex: dialog.zIndex }}
            onClick={() => useDialogStore.getState().bringToFront(dialog.id)}
          >
            {content}
          </Box>
        );
      })}
    </>
  );
}
