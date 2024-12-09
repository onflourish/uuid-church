import { createClient } from 'npm:@supabase/supabase-js@2'

const openAiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!openAiKey) throw new Error('Missing OPENAI_API_KEY');
if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function generateEmbedding(text: string) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`);
  }

  const { data } = await response.json();
  return data[0].embedding;
}

async function generateEmbeddings(record: any) {
  const embeddings = {
    full_embedding: await generateEmbedding([
      record.name,
      record.ein,
      record.street,
      record.city,
      record.state,
      record.zip,
      record.website,
    ].filter(Boolean).join(' ')),
    name_embedding: record.name ? await generateEmbedding(record.name) : null,
    street_embedding: record.street ? await generateEmbedding(record.street) : null,
    city_embedding: record.city ? await generateEmbedding(record.city) : null,
    website_embedding: record.website ? await generateEmbedding(record.website) : null,
  };

  return embeddings;
}

Deno.serve(async (req) => {
  const { record } = await req.json();

  try {
    // Generate all embeddings
    const embeddings = await generateEmbeddings(record);

    // Upsert the embeddings
    const { error } = await supabase
      .from('church_embedding')
      .upsert({
        church_id: record.id,
        ...embeddings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});