import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { DISPATCH_TESTIDS } from "@/constants/testIds";

export default function ChatPanel({ dispatchId, currentUserId, height = 400 }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/dispatches/${dispatchId}/messages`);
      setMessages(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (!dispatchId) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [dispatchId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const { data } = await api.post(`/dispatches/${dispatchId}/messages`, { text: t });
      setMessages((m) => [...m, data]);
      setText("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="dz-card flex flex-col bg-white" style={{ height }}>
      <div className="px-4 py-3 border-b-2 border-black bg-black text-white flex items-center gap-2 rounded-t-xl">
        <MessageSquare className="w-4 h-4 text-[#00E181]" strokeWidth={2.5} />
        <span className="dz-overline text-white">Ops Chat</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E181] animate-pulse" /> LIVE
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 dz-scrollbar bg-[#F5F5F5]">
        {messages.length === 0 && (
          <div className="text-center text-sm font-bold text-neutral-500 py-8">No messages yet. Start the conversation.</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.message_id}
              data-testid={DISPATCH_TESTIDS.chatMessage}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2 border-2 border-black ${mine ? "bg-[#00E181]" : "bg-white"}`}
                style={{ boxShadow: "2px 2px 0px rgba(0,0,0,1)" }}
              >
                {!mine && <div className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-1">{m.sender_role}</div>}
                <div className="text-sm font-medium leading-relaxed">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t-2 border-black flex items-center gap-2 bg-white rounded-b-xl">
        <input
          data-testid={DISPATCH_TESTIDS.chatInput}
          className="dz-input"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          data-testid={DISPATCH_TESTIDS.chatSendBtn}
          onClick={send}
          disabled={sending || !text.trim()}
          className="dz-btn-brand !py-2.5"
        >
          <Send className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
