import { BrainstormChat } from "@/components/BrainstormChat";

export default function AdvisorPromptsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">發想與大綱</h1>
      <p className="text-sm text-slate mb-6">
        跟學生討論文書題目時，可以用這個工具一起腦力激盪，或先自己試想可能的方向。
      </p>
      <BrainstormChat />
    </div>
  );
}
