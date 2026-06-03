"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Plus, Search, Paperclip, Loader2, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type ChatUser = {
  id: string;
  name: string;
  role: "student" | "teacher" | "senior-teacher" | "admin" | "super-admin";
  email?: string;
};

type ChatThread = {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  participant: ChatUser | null;
};

type ChatMessageType = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: ChatUser["role"];
  content: string;
  messageType: "text" | "file";
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  readBy: { userId: string; readAt: string }[];
};

const ROLE_LABEL: Record<ChatUser["role"], string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  "senior-teacher": "Senior Teacher",
  teacher: "Teacher",
  student: "Student",
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Unable to fetch chat data.");
  }
  return json.data as T;
}

export function Chat() {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myName = currentUser?.name ?? user?.name ?? "Me";
  const role = currentUser?.role ?? (user?.role ?? "admin");

  const active = useMemo(() => {
    return threads.find(thread => thread.id === activeId) ?? threads[0] ?? null;
  }, [threads, activeId]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadThreads();
  }, [currentUser]);

  useEffect(() => {
    if (!active) return;
    setActiveId(active.id);
    loadMessages(active.id);
  }, [active?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function loadCurrentUser() {
    try {
      const data = await fetchJson<ChatUser>("/api/chat/me");
      setCurrentUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load chat user.");
    }
  }

  async function loadThreads() {
    if (!currentUser) return;
    setPending(true);
    try {
      const data = await fetchJson<ChatThread[]>("/api/chat/conversations");
      setThreads(data);
      if (!activeId && data.length > 0) {
        setActiveId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load conversations.");
    } finally {
      setPending(false);
    }
  }

  async function loadMessages(conversationId: string) {
    setPending(true);
    try {
      const data = await fetchJson<ChatMessageType[]>(`/api/chat/conversations/${conversationId}/messages?limit=100`);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load messages.");
    } finally {
      setPending(false);
    }
  }

  async function deleteConversation(conversationId: string) {
    if (!conversationId) return;
    if (!window.confirm("Delete this chat from your side? This will remove it from your chat list.")) return;
    setPending(true);
    try {
      await fetchJson<Record<string, unknown>>(`/api/chat/conversations?id=${encodeURIComponent(conversationId)}`, {
        method: "DELETE",
      });
      setActiveId("");
      setMessages([]);
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete conversation.");
    } finally {
      setPending(false);
    }
  }

  async function createConversation(recipientId: string) {
    setPending(true);
    try {
      const data = await fetchJson<{ conversationId: string }>("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      setActiveId(data.conversationId);
      await loadThreads();
      await loadMessages(data.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start conversation.");
    } finally {
      setPending(false);
    }
  }

  async function sendMessage() {
    if (!active || (!draft.trim() && !attachment)) return;
    setPending(true);
    try {
      const body = new FormData();
      body.append("text", draft.trim());
      if (attachment) {
        body.append("attachment", attachment, attachment.name);
      }

      const res = await fetch(`/api/chat/conversations/${active.id}/messages`, {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || "Failed to send message.");
      }

      const sentMessage = json.data as ChatMessageType;
      setMessages(prev => [...prev, sentMessage]);
      setDraft("");
      setAttachment(null);
      loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setPending(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAttachment(file);
  }

  const filteredThreads = searchQuery
    ? threads.filter(thread =>
        [thread.title, thread.subtitle, thread.lastMessage]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    : threads;

  return (
    <div className="space-y-4">
      <PageHeader title="Chat" subtitle="Connect with your classmates, teachers, and admin" action={
        <Button className="rounded-xl gradient-primary text-white border-0" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New chat
        </Button>
      } />

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive-foreground">{error}</div>
      )}

      <div className="card-soft grid md:grid-cols-3 h-[600px] overflow-hidden">
        <div className="border-r border-border/60 overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 rounded-xl h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pending && threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading conversations...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              filteredThreads.map(thread => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveId(thread.id)}
                  className={cn(
                    "w-full text-left p-3 flex items-center gap-3 border-b border-border/40 hover:bg-muted",
                    active?.id === thread.id ? "bg-muted" : "",
                  )}
                >
                  <Avatar name={thread.title} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm truncate">{thread.title}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground truncate">{thread.lastMessage}</div>
                      {thread.unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col min-h-0">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
                <Avatar name={active.title} />
                <div className="min-w-0">
                  <div className="font-bold truncate">{active.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{active.subtitle}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => deleteConversation(active.id)}
                  disabled={pending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                {pending && messages.length === 0 ? (
                  <div className="grid place-items-center py-10 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-10">Say hello to start the conversation.</div>
                ) : (
                  messages.map(message => {
                    const mine = message.senderRole === role;
                    return (
                      <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-3 text-sm",
                          mine ? "gradient-primary text-white rounded-br-sm" : "bg-card border border-border/60 rounded-bl-sm",
                        )}>
                          {!mine && (
                            <div className="text-[10px] font-bold text-muted-foreground mb-1">{message.senderName} • {ROLE_LABEL[message.senderRole]}</div>
                          )}
                          {message.messageType === "file" ? (
                            <div className="space-y-2">
                              <div className="font-semibold">{message.fileName}</div>
                              <a href={message.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                                Download attachment
                              </a>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{message.content}</div>
                          )}
                          <div className={cn("text-[10px] mt-2", mine ? "text-white/70" : "text-muted-foreground")}>{new Date(message.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="p-3 border-t border-border/60 space-y-3" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
                <div className="flex items-center gap-2">
                  <label htmlFor="chat-file" className="inline-flex items-center justify-center rounded-xl border border-border/60 p-2 text-muted-foreground hover:bg-muted cursor-pointer">
                    <Paperclip className="w-4 h-4" />
                  </label>
                  <input id="chat-file" type="file" className="hidden" onChange={handleFileChange} />
                  <Input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Type a message..."
                    className="rounded-xl"
                  />
                  <Button type="submit" className="rounded-xl gradient-primary text-white border-0" disabled={pending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {attachment && (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                    <div>{attachment.name}</div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setAttachment(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Select or start a conversation</div>
          )}
        </div>
      </div>

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} onCreate={createConversation} />
    </div>
  );
}

export default Chat;

function NewChatDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (recipientId: string) => void }) {
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState<ChatUser[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      loadRecipients();
    }, 200);
    return () => clearTimeout(timeout);
  }, [open, query]);

  async function loadRecipients() {
    setIsLoading(true);
    try {
      const data = await fetchJson<ChatUser[]>(`/api/chat/users?q=${encodeURIComponent(query)}`);
      setRecipients(data);
      setError(null);
      if (data.length > 0 && !data.find(user => user.id === selectedId)) {
        setSelectedId(data[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load recipients.");
    } finally {
      setIsLoading(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    onCreate(selectedId);
    setQuery("");
    setSelectedId("");
    onOpenChange(false);
  }

  function onClose(value: boolean) {
    onOpenChange(value);
    if (!value) {
      setQuery("");
      setSelectedId("");
      setRecipients([]);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Search recipients</Label>
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search students, teachers, or admins"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading recipients...</div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive-foreground">{error}</div>
            ) : recipients.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No recipients match your search.</div>
            ) : (
              recipients.map(recipient => (
                <button
                  key={recipient.id}
                  type="button"
                  onClick={() => setSelectedId(recipient.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left text-sm",
                    recipient.id === selectedId ? "border-primary bg-primary/10" : "border-border/70 bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={recipient.name} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{recipient.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{ROLE_LABEL[recipient.role]}{recipient.email ? ` • ${recipient.email}` : ""}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary text-white border-0" disabled={!selectedId}>
              Start chat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
