"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useStore, actions, type ChatMessage } from "@/store/dataStore";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<ChatMessage["fromRole"], string> = {
  "super-admin": "Super Admin",
  "admin": "Admin",
  "senior-teacher": "Senior Teacher",
  "teacher": "Teacher",
  "student": "Student",
};

export function Chat() {
  const { user } = useAuth();
  const role = (user?.role ?? "admin") as ChatMessage["fromRole"];
  const myName = user?.name ?? "Me";

  const threads = useStore(s => s.threads).filter(t => t.participants.includes(role));
  const messages = useStore(s => s.chatMessages);
  const [activeId, setActiveId] = useState<string>(threads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = threads.find(t => t.id === activeId) ?? threads[0];
  const activeMsgs = useMemo(() => messages.filter(m => m.threadId === active?.id), [messages, active?.id]);

  useEffect(() => {
    if (active?.id) actions.markThreadRead(active.id, role);
  }, [active?.id, role]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeMsgs.length]);

  function send() {
    if (!draft.trim() || !active) return;
    actions.sendChatMessage({ threadId: active.id, fromRole: role, fromName: myName, text: draft });
    setDraft("");
  }

  const filteredThreads = q
    ? threads.filter(t => t.title.toLowerCase().includes(q.toLowerCase()) || t.lastMessage.toLowerCase().includes(q.toLowerCase()))
    : threads;

  return (
    <div className="space-y-4">
      <PageHeader title="Chat" subtitle="Connect with students, parents and staff" action={
        <Button className="rounded-xl gradient-primary text-white border-0" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New chat
        </Button>
      } />
      <div className="card-soft grid md:grid-cols-3 h-[600px] overflow-hidden">
        {/* Threads */}
        <div className="border-r border-border/60 overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chats..." className="pl-9 rounded-xl h-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations</div>
            )}
            {filteredThreads.map(t => {
              const unread = t.unread[role] ?? 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full text-left p-3 flex items-center gap-3 border-b border-border/40 hover:bg-muted",
                    active?.id === t.id ? "bg-muted" : "",
                  )}
                >
                  <Avatar name={t.title} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{t.lastTime}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground truncate">{t.lastMessage}</div>
                      {unread > 0 && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation */}
        <div className="md:col-span-2 flex flex-col min-h-0">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
                <Avatar name={active.title} />
                <div className="min-w-0">
                  <div className="font-bold truncate">{active.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{active.subtitle}</div>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {activeMsgs.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-10">Say hi 👋</div>
                )}
                {activeMsgs.map(m => {
                  const mine = m.fromRole === role;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                        mine ? "gradient-primary text-white rounded-br-sm" : "bg-card border border-border/60 rounded-bl-sm",
                      )}>
                        {!mine && (
                          <div className="text-[10px] font-bold text-muted-foreground mb-0.5">{m.fromName} • {ROLE_LABEL[m.fromRole]}</div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        <div className={cn("text-[10px] mt-1", mine ? "text-white/70" : "text-muted-foreground")}>{m.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="p-3 border-t border-border/60 flex gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
                <Input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  className="rounded-xl"
                />
                <Button type="submit" className="rounded-xl gradient-primary text-white border-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Select or start a conversation</div>
          )}
        </div>
      </div>

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} myRole={role} onCreate={id => setActiveId(id)} />
    </div>
  );
}

function NewChatDialog({
  open, onOpenChange, myRole, onCreate,
}: { open: boolean; onOpenChange: (o: boolean) => void; myRole: ChatMessage["fromRole"]; onCreate: (id: string) => void }) {
  const allRoles: ChatMessage["fromRole"][] = ["admin", "senior-teacher", "teacher", "student"];
  const others = allRoles.filter(r => r !== myRole);
  const [other, setOther] = useState(others[0]);
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const t = actions.createChatThread({ participants: [myRole, other], title: title.trim(), subtitle: ROLE_LABEL[other] });
    if (t) onCreate(t.id);
    onOpenChange(false);
    setTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Start new conversation</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Chat with</Label>
            <Select value={other} onValueChange={v => setOther(v as ChatMessage["fromRole"])}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {others.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input className="rounded-xl" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Diya Patel" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-white border-0">Start chat</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}