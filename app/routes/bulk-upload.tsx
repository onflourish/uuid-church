import { ActionFunctionArgs } from "@remix-run/node";
import { supabaseAdmin } from "~/lib/supabase.server";
import { parse } from 'csv-parse/sync';
import { fetch } from '@remix-run/web-fetch';

// Helper function to determine if org is likely a church
function isLikelyChurch(row: any) {
  // Churches often have specific NTEE codes starting with X
  const isNTEEChurch = row.NTEE_CD?.startsWith('X');
  
  // Churches usually have specific activity codes
  const churchActivities = ['022', '023', '024', '029'];
  const hasChurchActivity = churchActivities.includes(row.ACTIVITY);
  
  // Churches often have specific subsection codes (usually 170)
  const isChurchSubsection = row.SUBSECTION === '170';

  return isNTEEChurch || hasChurchActivity || isChurchSubsection;
}

export async function action({ request }: ActionFunctionArgs) {
  let csvText: string;
  
  const body = await request.json();
    const file = body.file as File;
    const fileUrl = body.fileUrl as string;

    console.log('fileUrl:', fileUrl);
    
    if (file) {
      csvText = await file.text();
    } else if (fileUrl) {
      const response = await fetch(fileUrl);
      console.log(response)
      if (!response.ok) {
        throw new Response(`Failed to fetch file: ${response.statusText}`, { status: 400 });
      }
      csvText = await response.text();
    } else {
      throw new Response('No file or URL provided', { status: 400 });
    }

  // Debug log to see what we're receiving
  console.log('First 500 characters of CSV:', csvText.substring(0, 500));
  console.log('Content length:', csvText.length);

  // Add even more relaxed parsing options
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,  // Allow varying column counts
    trim: true,
    skip_records_with_error: true,
    from_line: 1  // Start from first line
  });

  const churches = records
    .filter(isLikelyChurch)
    .map((row: any) => ({
      ein: row.EIN,
      name: row.NAME,
      street: row.STREET,
      city: row.CITY,
      state: row.STATE,
      zip: row.ZIP,
      ntee: row.NTEE_CD,
      affiliation: row.AFFILIATION,
      classification: row.CLASSIFICATION,
      foundation: row.FOUNDATION,
      activity: row.ACTIVITY,
      subsection: row.SUBSECTION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  // Process in batches of 100
  const batchSize = 100; // Reduced from 1000 to 100
  const delay = 5000;
  
  try {
    for (let i = 0; i < churches.length; i += batchSize) {
      const batch = churches.slice(i, i + batchSize);
      
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(churches.length/batchSize)}`);
      console.log(`Batch size: ${batch.length} records`);
      
      // Add retry logic
      let retries = 35;
      while (retries > 0) {
        try {
          const { data, error } = await supabaseAdmin
            .from('church')
            .upsert(batch, {
              onConflict: 'ein',
              ignoreDuplicates: true
            });

          if (error) {
            throw error;
          }

          console.log(`Successfully processed batch ${i/batchSize + 1}`);
          break; // Success, exit retry loop
          
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error('Batch error after all retries:', error);
            throw error;
          }
          console.log(`Retry attempt remaining: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }

      // Wait between batches (except for the last batch)
      if (i + batchSize < churches.length) {
        console.log('Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    console.error('Full error object:', error);
    throw new Response('Error uploading to database: ' + JSON.stringify(error, null, 2), { status: 500 });
  }

  return { success: true, churchesProcessed: churches.length };
}