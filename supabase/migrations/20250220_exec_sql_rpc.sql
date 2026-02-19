-- Function to safely execute read-only queries dynamically 
-- CAUTION: Usage should only be exposed via authorized backend requests
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Only allow SELECT queries to prevent data modification
    IF upper(sql_query) NOT LIKE 'SELECT%' THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed.';
    END IF;

    -- Execute the query and return the result as JSON
    EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]'') FROM (%s) t', sql_query)
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
