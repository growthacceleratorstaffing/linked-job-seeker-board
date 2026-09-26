import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, type DynamicToolUIPart, type ToolUIPart, type UIMessage } from "ai";
import { Bot, BriefcaseBusiness, Lightbulb, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Confirmation, ConfirmationAccepted, ConfirmationAction, ConfirmationActions, ConfirmationRejected, ConfirmationRequest, ConfirmationTitle } from "@/components/ai-elements/confirmation";

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onVacancyGenerated?: (vacancy: string) => void;
  initialMessage?: string;
}

const TOOL_LABELS: Record<string, string> = {
  getDashboardOverview: "Reading dashboard",
  searchCandidates: "Searching candidates",
  rankCandidatesForJob: "Ranking candidates",
  listVacancies: "Reading vacancies",
  listMatches: "Reading matches",
  listOnboarding: "Reading onboarding",
  getIntegrationStatus: "Checking integrations",
  createCandidate: "Add candidate",
  updateCandidate: "Update candidate",
  createJobPosting: "Create job posting",
  createMatch: "Create match",
  startOnboarding: "Start onboarding",
};

const assistantEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/myowncopilot-chat`;

type AssistantToolPart = ToolUIPart | DynamicToolUIPart;

function getToolName(part: AssistantToolPart) {
  return part.type === "dynamic-tool" ? part.toolName : part.type.replace(/^tool-/, "");
}

function AssistantTool({ part, approve }: { part: AssistantToolPart; approve: (id: string, approved: boolean) => void }) {
  const name = getToolName(part);
  return (
    <div className="w-full">
      <Tool defaultOpen={false}>
        {part.type === "dynamic-tool"
          ? <ToolHeader title={TOOL_LABELS[name] ?? name} type="dynamic-tool" toolName={part.toolName} state={part.state} />
          : <ToolHeader title={TOOL_LABELS[name] ?? name} type={part.type} state={part.state} />}
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput output={"output" in part ? part.output : undefined} errorText={"errorText" in part ? part.errorText : undefined} />
        </ToolContent>
      </Tool>
      <Confirmation approval={part.approval} state={part.state} className="border-secondary-pink/50 bg-secondary-pink/10">
        <ConfirmationRequest>
          <ConfirmationTitle>Are you sure you want to make these edits?</ConfirmationTitle>
          <ConfirmationActions>
            <ConfirmationAction variant="outline" onClick={() => part.approval && approve(part.approval.id, false)}>No</ConfirmationAction>
            <ConfirmationAction onClick={() => part.approval && approve(part.approval.id, true)}>Yes</ConfirmationAction>
          </ConfirmationActions>
        </ConfirmationRequest>
        <ConfirmationAccepted><ConfirmationTitle>Approved. Applying the change…</ConfirmationTitle></ConfirmationAccepted>
        <ConfirmationRejected><ConfirmationTitle>No changes were made.</ConfirmationTitle></ConfirmationRejected>
      </Confirmation>
    </div>
  );
}

export const AICopilot: React.FC<AICopilotProps> = ({ isOpen, onClose, initialMessage }) => {
  const [input, setInput] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(() => new DefaultChatTransport<UIMessage>({
    api: assistantEndpoint,
    prepareSendMessagesRequest: async ({ messages }) => {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        body: { messages },
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      };
    },
  }), []);
  const { messages, sendMessage, status, error, stop, setMessages, addToolApprovalResponse } = useChat({
    id: "growth-accelerator-assistant",
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => textareaRef.current?.focus(),
    onError: () => setRequestError("The AI Assistant is temporarily unavailable. Your app and data are unaffected."),
  });

  const sendSafely = async (message: { text: string }) => {
    setRequestError(null);
    try {
      await sendMessage(message);
    } catch {
      setRequestError("The AI Assistant is temporarily unavailable. Your app and data are unaffected.");
    }
  };

  useEffect(() => {
    if (isOpen) window.setTimeout(() => textareaRef.current?.focus(), 50);
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && initialMessage?.trim()) setInput(initialMessage);
  }, [initialMessage, isOpen]);
  useEffect(() => {
    const handleQuickQuestion = (event: Event) => {
      const question = (event as CustomEvent<string>).detail;
      if (question?.trim()) {
        setInput("");
        void sendSafely({ text: question.trim() });
      }
    };
    window.addEventListener("quickQuestion", handleQuickQuestion);
    return () => window.removeEventListener("quickQuestion", handleQuickQuestion);
  }, [sendMessage]);

  const submit = (_message: unknown, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || status === "submitted" || status === "streaming") return;
    setInput("");
    void sendSafely({ text: value });
  };
  const approve = async (id: string, approved: boolean) => {
    setRequestError(null);
    try {
      await addToolApprovalResponse({ id, approved, reason: approved ? "Approved by the signed-in staff member." : "Declined by the signed-in staff member." });
    } catch {
      setRequestError("The approved action could not be completed. No additional changes were made.");
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <Card className="flex h-[min(720px,90vh)] w-full max-w-xl flex-col overflow-hidden border-white/15 bg-primary-blue text-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/15 bg-primary-blue px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary-pink text-white"><Bot className="size-5" /></div>
            <div><CardTitle className="text-lg text-white">AI Assistant</CardTitle><p className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="size-2 rounded-full bg-emerald-400" />Online &amp; Ready</p></div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" title="New conversation" onClick={() => { stop(); setMessages([]); setInput(""); setRequestError(null); textareaRef.current?.focus(); }}><RotateCcw className="size-4" /><span className="sr-only">New conversation</span></Button>
            <Button variant="ghost" size="icon" title="Close" onClick={onClose}><X className="size-4" /><span className="sr-only">Close</span></Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <Conversation>
            <ConversationContent>
               {messages.length === 0 && <div className="flex gap-3 rounded-xl bg-white/10 p-4 text-sm leading-relaxed text-white"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-pink font-bold">G</div><p>Hello! I'm your AI recruitment assistant. I can help you create job vacancies, improve job descriptions, develop interview strategies, and provide hiring insights. What would you like to work on today?</p></div>}
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") return <MessageResponse key={index}>{part.text}</MessageResponse>;
                      if (isToolUIPart(part)) return <AssistantTool key={`${part.toolCallId}-${index}`} part={part} approve={approve} />;
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && <Message from="assistant"><MessageContent><Shimmer>Checking your workspace…</Shimmer></MessageContent></Message>}
              {(requestError || error) && <div className="rounded-md border border-red-500/50 bg-red-500/15 p-3 text-sm text-red-100"><strong className="block">Connection Error</strong>{requestError ?? "Failed to get AI response. Please try again."}</div>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="border-t border-white/15 bg-primary-blue p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {[{ label: "Create Job", prompt: "Help me create a job posting", icon: BriefcaseBusiness }, { label: "Interview Tips", prompt: "Give me interview tips", icon: Lightbulb }, { label: "Hiring Tips", prompt: "Give me hiring tips", icon: Lightbulb }].map(({ label, prompt, icon: Icon }) => <Button key={label} type="button" size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void sendSafely({ text: prompt })}><Icon className="mr-1.5 size-3.5" />{label}</Button>)}
            </div>
            <PromptInput onSubmit={submit} className="border-white/20 bg-white text-slate-900">
              <PromptInputBody><div className="flex items-start"><span className="ml-3 mt-3 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-pink text-xs font-bold text-white">G</span><PromptInputTextarea ref={textareaRef} value={input} onChange={(event) => setInput(event.currentTarget.value)} placeholder="Ask me anything about recruitment…" /></div></PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools><span className="text-xs text-slate-500">Changes require approval</span></PromptInputTools>
                <PromptInputSubmit status={status} onStop={stop} disabled={!input.trim() && status !== "streaming"} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
