"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons";
import ClientDate from "@/components/ClientDate";
import { logger } from "@/lib/logger";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
interface TicketMessage {
  from: string;
  text: string;
  timestamp: string;
  byRole?: string;
  at?: string;
}

interface Ticket {
  id: string;
  code: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  module?: string;
  type?: string;
  messages?: TicketMessage[];
}

export default function MyTicketsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const auto = useAutoTranslator("support.myTickets");

  const fetcher = (url: string) => {
    // Auth cookie is sent automatically by browser
    // Backend extracts user from session
    return fetch(url)
      .then((r) => r.json())
      .catch((error) => {
        logger.error("Support tickets fetch error", error);
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    userId ? "/api/support/tickets/my" : null,
    fetcher,
  );

  if (!session) {
    return <TableSkeleton rows={5} />;
  }

  if (!userId) {
    return (
      <p className="text-destructive">
        {auto("Error: No user ID found in session", "errors.noUser")}
      </p>
    );
  }

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) {
      toast.error(auto("Please enter a reply message.", "toast.missingReply"));
      return;
    }

    const toastId = toast.loading(auto("Sending reply...", "toast.sending"));

    try {
      const res = await fetch(
        `/api/support/tickets/${selectedTicket.id}/reply`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Auth cookie sent automatically by browser
          },
          body: JSON.stringify({ text: replyText }),
        },
      );

      if (res.ok) {
        toast.success(auto("Reply sent successfully", "toast.sent"), {
          id: toastId,
        });
        setReplyText("");
        await mutate();
        // Refresh selected ticket
        const ticketRes = await fetch(
          `/api/support/tickets/${selectedTicket.id}`,
        );
        if (ticketRes.ok) {
          setSelectedTicket(await ticketRes.json());
        }
      } else {
        const error = await res.json();
        toast.error(
          `${auto("Failed to send reply", "toast.failed")} ${error.error || auto("Please try again.", "toast.retry")}`,
          { id: toastId },
        );
      }
    } catch (error) {
      logger.error("Error sending reply:", error);
      toast.error(
        auto("An error occurred. Please try again.", "toast.genericError"),
        { id: toastId },
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto("My Support Tickets", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto("View and manage your support requests", "header.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            const footer = document.querySelector("footer");
            const supportBtn = footer?.querySelector("button");
            supportBtn?.click();
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors"
        >
          {auto("New Ticket", "actions.newTicket")}
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl shadow-md border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">
                  {auto("Your Tickets", "tickets.list.title")}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {data?.items?.length === 0 ? (
                  <p className="p-4 text-muted-foreground text-center">
                    {auto("No tickets yet", "tickets.list.empty")}
                  </p>
                ) : (
                  data?.items?.map((ticket: Ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 cursor-pointer hover:bg-muted ${
                        selectedTicket?.id === ticket.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-foreground text-sm">
                          {ticket.code}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === "New"
                              ? "bg-primary/10 text-primary"
                              : ticket.status === "Open"
                                ? "bg-accent/10 text-accent-foreground"
                                : ticket.status === "Waiting"
                                  ? "bg-secondary/10 text-secondary"
                                  : ticket.status === "Resolved"
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-foreground"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <ClientDate
                          date={ticket.createdAt}
                          format="date-only"
                        />
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-card rounded-2xl shadow-md border border-border">
                <div className="p-4 border-b border-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-semibold text-foreground">
                        {selectedTicket.subject}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedTicket.code} • {selectedTicket.module} •{" "}
                        {selectedTicket.type}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        selectedTicket.priority === "Urgent"
                          ? "bg-destructive/10 text-destructive"
                          : selectedTicket.priority === "High"
                            ? "bg-warning/10 text-warning-foreground"
                            : selectedTicket.priority === "Medium"
                              ? "bg-accent/10 text-accent-foreground"
                              : "bg-muted text-foreground"
                      }`}
                    >
                      {auto(
                        "{{priority}} Priority",
                        "tickets.details.priority",
                      ).replace("{{priority}}", selectedTicket.priority)}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  {selectedTicket.messages?.map((msg, index: number) => (
                    <div
                      key={`msg-${index}`}
                      className={`mb-4 ${msg.byRole === "ADMIN" ? "ms-8" : ""}`}
                    >
                      <div
                        className={`p-3 rounded-2xl ${
                          msg.byRole === "ADMIN"
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {msg.byRole === "ADMIN"
                              ? auto("Support Team", "tickets.messages.support")
                              : auto("You", "tickets.messages.you")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <ClientDate
                              date={msg.at || msg.timestamp}
                              format="medium"
                            />
                          </p>
                        </div>
                        <p className="text-sm text-foreground">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                {selectedTicket.status !== "Closed" && (
                  <div className="p-4 border-t border-border">
                    <textarea
                      aria-label={auto(
                        "Type your reply to this support ticket",
                        "tickets.reply.aria",
                      )}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={auto(
                        "Type your reply...",
                        "tickets.reply.placeholder",
                      )}
                      className="w-full px-3 py-2 border border-border rounded-2xl h-24"
                    />
                    <button
                      onClick={sendReply}
                      className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90"
                    >
                      {auto("Send Reply", "tickets.reply.send")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
                <p className="text-muted-foreground">
                  {auto(
                    "Select a ticket to view details",
                    "tickets.details.emptyState",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
