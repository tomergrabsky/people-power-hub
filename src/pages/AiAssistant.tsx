import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Send, Bot, User, Sparkles, Key, ExternalLink } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs } from "firebase/firestore";


type MessageOutput =
    | { type: "text"; text: string }
    | { type: "number"; title: string; value: string | number }
    | { type: "bar"; title: string; data: Record<string, unknown>[]; xKey: string; yKey: string }
    | { type: "pie"; title: string; data: Record<string, unknown>[]; nameKey: string; valueKey: string };

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string; // raw content
    parsedContent?: MessageOutput[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SYSTEM_PROMPT = `You are a helpful HR assistant for 'People Power Hub'. You can answer questions about the company's HR data.
If the user asks for a chart or graph, you MUST output the chart data inside a json code block \`\`\`json ... \`\`\`.
Supported chart types are 'bar' and 'pie'.

Example Bar Chart Output:
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
\`\`\`

Example Pie Chart Output:
\`\`\`json
{
  "type": "pie",
  "title": "התפלגות לפי סטטוס",
  "data": [
    { "name": "פעיל", "value": 150 },
    { "name": "עזב", "value": 45 }
  ],
  "nameKey": "name",
  "valueKey": "value"
}
\`\`\`

Example Number Output:
\`\`\`json
{
  "type": "number",
  "title": "סה\\"כ עובדים פעילים",
  "value": 150
}
\`\`\`

Always use realistic mock data for your answers. Answer in Hebrew. Keep your text responses concise and clear.`;

export default function AiAssistant() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem("groq_api_key") || import.meta.env.VITE_GROQ_API_KEY || "");
    const [isKeySaved, setIsKeySaved] = useState(!!apiKey || !!import.meta.env.VITE_GROQ_API_KEY);
    const [keyInput, setKeyInput] = useState("");

    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "שלום! אני עוזר ה-AI שלך שמבוסס על Groq (Llama 3.3). אני יכול לענות על שאלות לגבי הנתונים שלך, ולהציג את התשובה בטקסט, במספרים או בגרפים דינמיים! מה תרצה לדעת?",
            parsedContent: [{ type: "text", text: "שלום! אני עוזר ה-AI שלך שמבוסס על Groq (Llama 3.3). אני יכול לענות על שאלות לגבי הנתונים שלך, ולהציג את התשובה בטקסט, במספרים או בגרפים דינמיים! מה תרצה לדעת?" }]
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [dbData, setDbData] = useState<string>("");

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [employeesRes, jobRolesRes, projectsRes, branchesRes, employingCompaniesRes, seniorityLevelsRes, performanceLevelsRes, leavingReasonsRes] = await Promise.all([
                    getDocs(collection(db, 'employees')),
                    getDocs(collection(db, 'job_roles')),
                    getDocs(collection(db, 'projects')),
                    getDocs(collection(db, 'branches')),
                    getDocs(collection(db, 'employing_companies')),
                    getDocs(collection(db, 'seniority_levels')),
                    getDocs(collection(db, 'performance_levels')),
                    getDocs(collection(db, 'leaving_reasons')),
                ]);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapDocs = (snap: import('firebase/firestore').QuerySnapshot) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() as any }));

                const jobRoles = mapDocs(jobRolesRes);
                const projects = mapDocs(projectsRes);
                const branches = mapDocs(branchesRes);
                const employingCompanies = mapDocs(employingCompaniesRes);
                const seniorityLevels = mapDocs(seniorityLevelsRes);
                const performanceLevels = mapDocs(performanceLevelsRes);
                const leavingReasons = mapDocs(leavingReasonsRes);

                const getLabel = (arr: Record<string, unknown>[], id: string) => arr.find(item => item.id === id)?.name as string || "לא מוגדר";

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const employees = mapDocs(employeesRes)
                    .filter((emp: any) => !emp.is_left)
                    .map((emp: any) => ({
                        name: emp.full_name,
                        role: getLabel(jobRoles, emp.job_role_id),
                        project: getLabel(projects, emp.project_id),
                        branch: getLabel(branches, emp.branch_id),
                        company: getLabel(employingCompanies, emp.employing_company_id),
                        seniority: getLabel(seniorityLevels, emp.seniority_level_id),
                        performance: getLabel(performanceLevels, emp.performance_level_id),
                        leavingReason: getLabel(leavingReasons, emp.leaving_reason_id),
                        city: emp.city || "לא מוגדר",
                        attritionRisk: emp.attrition_risk || 0,
                        criticality: emp.unit_criticality || 0,
                        cost: emp.cost || 0,
                        startDate: emp.start_date,
                        experienceYears: emp.professional_experience_years || 0
                    }));

                setDbData(JSON.stringify(employees));
            } catch (err) {
                console.error("Error fetching data for AI context:", err);
            }
        };

        if (isKeySaved) {
            fetchAllData();
        }
    }, [isKeySaved]);

    const saveApiKey = () => {
        if (!keyInput.trim()) return;
        localStorage.setItem("groq_api_key", keyInput.trim());
        setApiKey(keyInput.trim());
        setIsKeySaved(true);
    };

    const clearApiKey = () => {
        localStorage.removeItem("groq_api_key");
        setApiKey("");
        setIsKeySaved(false);
        setKeyInput("");
    };

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

    const fetchGroq = async (query: string): Promise<string> => {
        const systemPromptWithData = `${SYSTEM_PROMPT}\n\nHere is the current HR database in JSON format:\n\`\`\`json\n${dbData}\n\`\`\`\n\nAnswer the user based ONLY on this data.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPromptWithData },
                    ...messages.filter(m => m.id !== "welcome").map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    { role: "user", content: query }
                ],
                temperature: 0.1,
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Groq API error");
        }

        const data = await response.json();
        return data.choices[0].message.content;
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        const query = input;
        setInput("");
        setIsLoading(true);

        try {
            const responseText = await fetchGroq(query);
            const parsed = parseAIContent(responseText);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: responseText,
                parsedContent: parsed
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "assistant",
                content: "אירעה שגיאה בחיבור ל-Groq API. " + errorMessage
            }]);
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

    if (!isKeySaved) {
        return (
            <MainLayout>
                <div className="h-[calc(100vh-theme(spacing.16))] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-lg border-primary/20">
                        <CardHeader className="text-center space-y-2">
                            <div className="mx-auto bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-2">
                                <Key className="w-7 h-7 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">חיבור ל-Groq API</CardTitle>
                            <CardDescription className="text-base">
                                כדי להשתמש בעוזר ה-AI בצורה חינמית ומהירה, עליך להזין מפתח API של Groq (מודל Llama 3.3).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    1. היכנס ל- <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">console.groq.com <ExternalLink className="w-3 h-3" /></a><br />
                                    2. התחבר ויצר API Key חדש ("Create API Key")<br />
                                    3. העתק והדבק אותו כאן (הוא יישמר רק בדפדפן שלך):
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    type="password"
                                    placeholder="gsk_..."
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    className="h-12 text-left"
                                    dir="ltr"
                                />
                                <Button
                                    className="w-full h-12"
                                    onClick={saveApiKey}
                                    disabled={!keyInput.trim()}
                                >
                                    התחל להשתמש בעוזר
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col p-4 max-w-4xl mx-auto w-full relative">
                <div className="flex items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-sidebar-primary/20 p-2 rounded-lg">
                            <Sparkles className="w-6 h-6 text-sidebar-primary" />
                        </div>
                        <h1 className="text-2xl font-bold">עוזר AI (Groq Llama 3.3)</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearApiKey} className="text-xs">
                        <Key className="w-3 h-3 mr-1" /> החלף מפתח
                    </Button>
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
                                <span className="text-sm text-muted-foreground">העוזר חושב (Llama 3.3)...</span>
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
                            placeholder="שאל אותי על הנתונים שלך (למשל: תציג גרף פאי של התפלגות סטטוס עובדים)..."
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
