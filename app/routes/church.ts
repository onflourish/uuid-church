import { LoaderFunctionArgs } from "@remix-run/node";
import { supabase, supabaseAdmin } from "~/lib/supabase.server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function loader({ request }: LoaderFunctionArgs) {
    const searchParams = new URLSearchParams(request.url.split("?")[1]);
    const name = searchParams.get("name")?.toUpperCase();
    const street = searchParams.get("street")?.toUpperCase();
    const city = searchParams.get("city")?.toUpperCase();
    const state = searchParams.get("state")?.toUpperCase();
    const zip = searchParams.get("zip")?.toUpperCase();
    const website = searchParams.get("website")?.toUpperCase();

    const authorization = request.headers.get("Authorization")

    if (!authorization) {
        return new Response('Unauthorized', { status: 401 });
    }

    const token = authorization.split('Bearer ')[1];

    const { data: apiKey } = await supabaseAdmin.from('api_key').select('id,name,requests_per_minute').eq('id', token).single();

    if (!apiKey) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Check if the API key is rate limited within the past minute
    const requestsCount = (await supabaseAdmin.from('request').select('id').eq('api_key_id', apiKey.id).gte('created_at', new Date(Date.now() - 60000))).count

    if (requestsCount && requestsCount >= apiKey.requests_per_minute) {
        return new Response('Rate limit exceeded', { status: 429 });
    }

    // If no search params, return empty results
    if (!name && !street && !city && !state && !zip && !website) {
        return new Response('No search parameters provided', { status: 400 });
    }

    if (!city || !state || !name) {
        return new Response('Missing required parameters', { status: 400 });
    }

    // Generate embeddings for each search parameter
    const embeddings = {
        full_embedding: await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: [name, street, city, state, zip, website].filter(Boolean).join(" ")
        }),
        name_embedding: name ? await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: name
        }) : null,
        street_embedding: street ? await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: street
        }) : null,
        city_embedding: city ? await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: city
        }) : null,
        website_embedding: website ? await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: website
        }) : null,
    };

    // Perform weighted vector similarity search
    const { data: churches, error } = await supabaseAdmin.rpc('search_churches', {
        query_full_embedding: embeddings.full_embedding.data[0].embedding,
        query_name_embedding: embeddings.name_embedding?.data[0].embedding || null,
        query_street_embedding: embeddings.street_embedding?.data[0].embedding || null,
        query_city_embedding: embeddings.city_embedding?.data[0].embedding || null,
        query_website_embedding: embeddings.website_embedding?.data[0].embedding || null,
        name_weight: name ? 1 : 0,
        street_weight: street ? 0.5 : 0,
        city_weight: city ? 0.5 : 0,
        website_weight: website ? 1 : 0,
        full_weight: 0.75,
        similarity_threshold: 0.5,
        search_state: state,
        search_city: city,
        match_count: 5
    });

    if (error) {
        throw new Error(`Error searching churches: ${error.message}`);
    }

    console.log([
        { role: 'system', content: 'You are a church searching assistant. You take the users request and then match to the most similar church based on the church options given to you. You only return a JSON object with the key "id" indicating the ID of the church that is most similar to the search term. The results that are given to you are from a vector similarity search so they are potentially close, but you are the last filter to make sure the search is as correct as possible. If you are absolutely unsure return an "id" value of null.' },
        { role: 'user', content: `I am looking for a church named ${name} located at ${street}, ${city}, ${state} ${zip} with the website ${website}. Here are the potential options:
        ${churches?.map((church: any) => `ID: ${church.id}, Name: ${church.name}, Street: ${church.street}, City: ${church.city}, State: ${church.state}, Zip: ${church.zip}, Website: ${church.website}`).join('\n')}
        ` },
    ])

    const { choices } = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a church searching assistant. You take the users request and then match to the most similar church based on the church options given to you. You only return a JSON object with the key "id" indicating the ID of the church that is most similar to the search term. The results that are given to you are from a vector similarity search so they are potentially close, but you are the last filter to make sure the search is as correct as possible. If you are absolutely unsure return an "id" value of null.' },
            { role: 'user', content: `I am looking for a church named ${name} located at ${street}, ${city}, ${state} ${zip} with the website ${website}. Here are the potential options:
            ${churches?.map((church: any) => `ID: ${church.id}, Name: ${church.name}, Street: ${church.street}, City: ${church.city}, State: ${church.state}, Zip: ${church.zip}, Website: ${church.website}`).join('\n')}
            ` },
        ],
        response_format: {
            type: 'json_object'
        },
        temperature: 0.5
    })

    console.log(choices);

    if (!choices || choices.length === 0 || !choices[0].message || !choices[0].message.content) {
        throw new Error('Invalid response from model.');
    }

    const chosenChurchId = JSON.parse(choices[0].message.content).id;

    const chosenChurch = churches?.find((church: any) => church.id === chosenChurchId);

    const cleanedResponse = chosenChurch ? {
        uuid: chosenChurch.id,
        name: chosenChurch.name,
        street: chosenChurch.street,
        city: chosenChurch.city,
        state: chosenChurch.state,
        zip: chosenChurch.zip,
        website: chosenChurch.website
    } : {
        uuid: null,
    }

    await supabaseAdmin.from('request').insert({
        api_key_id: apiKey.id,
        request_data: {
            name,
            street,
            city,
            state,
            zip,
            website
        },
        response_data: {
            ...cleanedResponse
        }
    });

    return new Response(JSON.stringify(cleanedResponse), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}