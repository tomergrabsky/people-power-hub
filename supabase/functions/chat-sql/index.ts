import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const DATABASE_SCHEMA = `
Here is the database schema for the People Power Hub:

Table: employees
- id (uuid, primary key)
- first_name (text)
- last_name (text)
- identity_number (text)
- position_id (uuid)
- status (text) - ('פעיל', 'עזב', 'בהליך קליטה', 'חל"ת', 'פוטר')
- employment_type (text) - ('שכיר', 'קבלן', 'פרילנסר')
- base_salary (numeric)
- start_date (date)
- end_date (date)
- created_at (timestamp)

Table: positions
- id (uuid, primary key)
- title (text)
- department_id (uuid)
- level (text) - ('Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director')
- status (text)
- created_at (timestamp)

Table: departments
- id (uuid, primary key)
- name (text)
- manager_id (uuid)
- created_at (timestamp)

Table: candidate_lifecycle
- id (uuid, primary key)
- candidate_id (uuid)
- position_id (uuid)
- stage_id (uuid)
- status (text) - ('בתהליך', 'התקבל', 'נדחה', 'פרש')
- created_at (timestamp)

When generating SQL, use PostgreSQL syntax. Always return only the plain SQL query starting with SELECT, with no markdown formatting.
`;

const SYSTEM_PROMPT = `You are a helpful Data Analyst for 'People Power Hub' acting as a Text-to-SQL translator. 
Your goal is to answer the user's questions about the company data by executing SQL queries.

You will follow these steps:
1. Understand the user's intent.
2. Based on the provided database schema, generate a valid PostgreSQL query to answer the question.
3. Keep the query optimized and secure (read-only SELECT).

${DATABASE_SCHEMA}
`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, apiKey } = await req.json()

    // 1. Send the user query to Groq to generate SQL
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Write a PostgreSQL query for this question: "${query}". Return ONLY the raw SQL code.` }
        ],
        temperature: 0.1,
      })
    })

    if (!groqResponse.ok) {
      throw new Error("Failed to generate SQL from AI")
    }

    const groqData = await groqResponse.json()
    let generatedSQL = groqData.choices[0].message.content.trim()

    // Sanitize the AI response to make sure it's raw SQL (remove markdown blocks if any)
    if (generatedSQL.startsWith("```sql")) {
      generatedSQL = generatedSQL.replace(/```sql/g, "").replace(/```/g, "").trim();
    }

    // Initialize Supabase Client to execute the query
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need service role to bypass RLS for analytical queries
    )

    // 2. Execute the generated SQL via RPC using actual DB
    const { data, error } = await supabaseClient.rpc('exec_sql', { sql_query: generatedSQL })

    if (error) {
      console.error("SQL Error", error);
      throw new Error("Failed to execute DB Query");
    }

    const result = {
      message: "Here is your data:",
      generatedSQL: generatedSQL,
      data: data
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
