import React from "react";
import posthog from "posthog-js";
import { formatTimeDelta } from "#/utils/format-time-delta";
import { ConversationRepoLink } from "./conversation-repo-link";
import {
  ProjectStatus,
  ConversationStateIndicator,
} from "./conversation-state-indicator";
import { EllipsisButton } from "./ellipsis-button";
import { ConversationCardContextMenu } from "./conversation-card-context-menu";
import { cn } from "#/utils/utils";

interface ConversationCardProps {
  onClick?: () => void;
  onDelete?: () => void;
  onChangeTitle?: (title: string) => void;
  isActive?: boolean;
  title: string;
  selectedRepository: string | null;
  lastUpdatedAt: string; // ISO 8601
  status?: ProjectStatus;
  variant?: "compact" | "default";
  conversationId?: string; // Optional conversation ID for VS Code URL
}

export function ConversationCard({
  onClick,
  onDelete,
  onChangeTitle,
  isActive,
  title,
  selectedRepository,
  lastUpdatedAt,
  status = "STOPPED",
  variant = "default",
  conversationId,
}: ConversationCardProps) {
  const [contextMenuVisible, setContextMenuVisible] = React.useState(false);
  const [titleMode, setTitleMode] = React.useState<"view" | "edit">("view");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // We don't use the VS Code URL hook directly here to avoid test failures
  // Instead, we'll add the download button conditionally

  const handleBlur = () => {
    if (inputRef.current?.value) {
      const trimmed = inputRef.current.value.trim();
      onChangeTitle?.(trimmed);
      inputRef.current!.value = trimmed;
    } else {
      // reset the value if it's empty
      inputRef.current!.value = title;
    }

    setTitleMode("view");
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const handleInputClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (titleMode === "edit") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete?.();
    setContextMenuVisible(false);
  };

  const handleEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setTitleMode("edit");
    setContextMenuVisible(false);
  };

  const handleDownloadViaVSCode = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    posthog.capture("download_via_vscode_button_clicked");

    // Fetch the VS Code URL from the API
    if (conversationId) {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/vscode-url`,
        );
        const data = await response.json();

        if (data.vscode_url) {
          window.open(data.vscode_url, "_blank");
        } else {
          console.error("VS Code URL not available", data.error);
        }
      } catch (error) {
        console.error("Failed to fetch VS Code URL", error);
      }
    }

    setContextMenuVisible(false);
  };

  React.useEffect(() => {
    if (titleMode === "edit") {
      inputRef.current?.focus();
    }
  }, [titleMode]);

  const hasContextMenu = !!(
    onDelete ||
    onChangeTitle ||
    conversationId // If we have a conversation ID, we can show the download button
  );

  return (
    <div
      data-testid="conversation-card"
      onClick={onClick}
      className={cn(
        "h-[100px] w-full px-[18px] py-4 border-b border-neutral-600 cursor-pointer",
        variant === "compact" &&
          "h-auto w-fit rounded-xl border border-[#525252]",
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden mr-2">
          {isActive && (
            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
          )}
          {titleMode === "edit" && (
            <input
              ref={inputRef}
              data-testid="conversation-card-title"
              onClick={handleInputClick}
              onBlur={handleBlur}
              onKeyUp={handleKeyUp}
              type="text"
              defaultValue={title}
              className="text-sm leading-6 font-semibold bg-transparent w-full"
            />
          )}
          {titleMode === "view" && (
            <p
              data-testid="conversation-card-title"
              className="text-sm leading-6 font-semibold bg-transparent truncate overflow-hidden"
              title={title}
            >
              {title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          <ConversationStateIndicator status={status} />
          {hasContextMenu && (
            <EllipsisButton
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setContextMenuVisible((prev) => !prev);
              }}
            />
          )}
          {contextMenuVisible && (
            <ConversationCardContextMenu
              onClose={() => setContextMenuVisible(false)}
              onDelete={onDelete && handleDelete}
              onEdit={onChangeTitle && handleEdit}
              onDownloadViaVSCode={
                conversationId ? handleDownloadViaVSCode : undefined
              }
              position={variant === "compact" ? "top" : "bottom"}
            />
          )}
        </div>
      </div>

      <div
        className={cn(
          variant === "compact" && "flex items-center justify-between mt-1",
        )}
      >
        {selectedRepository && (
          <ConversationRepoLink selectedRepository={selectedRepository} />
        )}
        <p className="text-xs text-neutral-400">
          <time>{formatTimeDelta(new Date(lastUpdatedAt))} ago</time>
        </p>
      </div>
    </div>
  );
}
