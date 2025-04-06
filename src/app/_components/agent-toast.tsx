"use client";

import { ToastNotification } from "./toast";

export const agentToast = new ToastNotification("agent-actions", {
  duration: 4000,
  position: "bottom-left",
  style: {
    backgroundColor: "#f0fdf4",
    color: "#065f46",
    border: "1px solid #059669",
    borderRadius: "var(--radius)",
    padding: "0.75rem",
  },
});
