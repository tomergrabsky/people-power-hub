import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";

type MessageOutput =
    | { type: "text"; text: string }
    | { type: "number"; title: string; value: string | number }
    | { type: "bar"; title: string; data: any[]; xKey: string; yKey: string }
    | { type: "pie"; title: string; data: any[]; nameKey: string; valueKey: string };

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string; // raw content
    parsedContent?: MessageOutput[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AiAssistant() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "שלום! אני עוזר ה-AI שלך. אני יכול לענות על שאלות לגבי הנתונים שלך, ולהציג את התשובה בטקסט, במספרים או בגרפים. (משתמש כרגע במודל מקומי חינמי)",
            parsedContent: [{ type: "text", text: "שלום! אני עוזר ה-AI שלך. אני יכול לענות על שאלות לגבי הנתונים שלך, ולהציג את התשובה בטקסט, במספרים או בגרפים. (משתמש כרגע במודל מקומי חינמי או בנתוני הדגמה במידה ואין מודל זמין)." }]
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const parseAIContent = (text: string): MessageOutput[] => {
        const outputs: MessageOutput[] = [];

        // Simple logic to extract JSON blocs if AI returns JSON graphs inside markdown
        const jsonRegex = /```json\n([\s\S]*?)\n```/g;
        let match;
        let lastIndex = 0;

        while ((match = jsonRegex.exec(text)) !== null) {
            // Add preceding text
            if (match.index > lastIndex) {
                const t = text.substring(lastIndex, match.index).trim();
                if (t) outputs.push({ type: "text", text: t });
            }

            // Parse JSON
            try {
                const parsed = JSON.parse(match[1]);
                if (Array.isArray(parsed)) {
                    outputs.push(...parsed);
                } else {
                    outputs.push(parsed);
                }
            } catch (e) {
                outputs.push({ type: "text", text: match[0] });
            }

            lastIndex = jsonRegex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            const t = text.substring(lastIndex).trim();
            if (t) outputs.push({ type: "text", text: t });
        }

        // Fallback if no JSON formatting was found at all
        if (outputs.length === 0 && text.trim()) {
            outputs.push({ type: "text", text: text.trim() });
        }

        return outputs;
    };

    const simulateLocalLLM = async (query: string): Promise<string> => {
        // We can try fetching from local Ollama here, but for safety we mock based on keywords
        return new Promise(resolve => {
            setTimeout(() => {
                if (query.includes('גרף') || query.includes('פאי') || query.includes('התפלגות')) {
                    if (query.includes('פאי')) {
                        resolve(`הנה התפלגות סטטוס העובדים כרגע:
\`\`\`json
{
  "type": "pie",
  "title": "התפלגות עובדים לפי סטטוס",
  "data": [
    { "name": "פעיל", "value": 150 },
    { "name": "בהליך קליטה", "value": 30 },
    { "name": "עזב", "value": 45 }
  ],
  "nameKey": "name",
  "valueKey": "value"
}
\`\`\``);
                    } else {
                        resolve(`הנה גרף התפלגות של דרגות השכר (Seniority Levels) במערכת:
\`\`\`json
{
  "type": "bar",
  "title": "עובדים לפי רמת ותק",
  "data": [
    { "level": "Junior", "count": 45 },
    { "level": "Mid", "count": 80 },
    { "level": "Senior", "count": 35 }
  ],
  "xKey": "level",
  "yKey": "count"
}
\`\`\``);
                    }
                } else if (query.includes('כמה') || query.includes('סה"כ') || query.includes('מספר')) {
                    resolve(`סיכמתי את הנתונים המבוקשים עבורך:
\`\`\`json
{
  "type": "number",
  "title": "סה\\"כ עובדים פעילים",
  "value": 150
}
\`\`\``);
                } else {
                    resolve("כדי לקבל את התוצאות הטובות ביותר מהעוזר החינמי, כדאי לשאול שאלות כמו: 'הצג כמה...', 'תציג גרף...', או 'מה ההתפלגות של... (בפאי)'. המערכת תומכת בתשובות של טקסט חופשי!");
                }
            }, 1500);
        });
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        const query = input;
        setInput("");
        setIsLoading(true);

        try {
            // Here you would optimally connect to Ollama: http://localhost:11434/api/generate
            // Since it requires Ollama running, we simulate it or fallback to the mock.
            const responseText = await simulateLocalLLM(query);
            const parsed = parseAIContent(responseText);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: responseText,
                parsedContent: parsed
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "אירעה שגיאה בחיבור למודל או לנתונים." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderOutput = (output: MessageOutput, i: number) => {
        switch (output.type) {
            case "text":
                return <p key={i} className="whitespace-pre-wrap">{output.text}</p>;

            case "number":
                return (
                    <Card key={i} className="my-2 bg-gradient-to-br from-sidebar-primary/10 to-transparent border-sidebar-primary/20">
                        <CardContent className="p-6 text-center">
                            <h3 className="text-lg font-medium text-muted-foreground mb-2">{output.title}</h3>
                            <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sidebar-primary to-orange-500">
                                {output.value}
                            </p>
                        </CardContent>
                    </Card>
                );

            case "bar":
                return (
                    <Card key={i} className="my-2 border-sidebar-primary/20">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-medium mb-4 text-center">{output.title}</h3>
                            <div className="h-[250px] w-full" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={output.data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.5} />
                                        <XAxis dataKey={output.xKey} tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip cursor={{ fill: '#f0f0f0' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey={output.yKey} fill="hsl(var(--sidebar-primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                );

            case "pie":
                return (
                    <Card key={i} className="my-2 border-sidebar-primary/20">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-medium mb-4 text-center">{output.title}</h3>
                            <div className="h-[250px] w-full" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={output.data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey={output.valueKey}
                                            nameKey={output.nameKey}
                                        >
                                            {output.data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                );

            default:
                return null;
        }
    };

    return (
        <MainLayout>
            <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col p-4 max-w-4xl mx-auto w-full relative">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-sidebar-primary/20 p-2 rounded-lg">
                        <Sparkles className="w-6 h-6 text-sidebar-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">עוזר AI (חינמי)</h1>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user"
                                        ? "bg-slate-200 text-slate-700"
                                        : "bg-sidebar-primary text-primary-foreground"
                                    }`}
                            >
                                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div
                                className={`flex-1 rounded-2xl p-4 max-w-[85%] shadow-sm ${msg.role === "user"
                                        ? "bg-slate-100 dark:bg-slate-800 text-foreground ml-auto"
                                        : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                    }`}
                            >
                                {msg.parsedContent ? (
                                    <div className="space-y-3">
                                        {msg.parsedContent.map((output, idx) => renderOutput(output, idx))}
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-sidebar-primary text-primary-foreground shrink-0">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-sidebar-primary" />
                                <span className="text-sm text-muted-foreground">העוזר חושב...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex gap-2 relative items-center pr-4"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="שאל אותי על הנתונים שלך (למשל: תציג גרף פיזור, רשימת עובדים, או כמה פרויקטים יש)..."
                            className="border-0 focus-visible:ring-0 shadow-none text-base bg-transparent h-12"
                            disabled={isLoading}
                            dir="auto"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
                            className="rounded-full w-12 h-12 shrink-0 bg-sidebar-primary hover:bg-sidebar-primary/90 ml-1"
                        >
                            <Send className="w-5 h-5 rtl:rotate-180" />
                        </Button>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
}
