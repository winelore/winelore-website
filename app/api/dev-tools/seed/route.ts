import { NextResponse } from 'next/server';
import { seedCompetitionScenarioAction, SeederFormData } from '@/lib/seeder';

export async function POST(req: Request) {
  try {
    const data: SeederFormData = await req.json();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const log = (msg: string) => {
          controller.enqueue(encoder.encode(msg + '\n'));
        };

        try {
          const res = await seedCompetitionScenarioAction(data, log);
          // When finished, we can send a special marker with the final JSON result
          controller.enqueue(encoder.encode('__DONE__\n' + JSON.stringify(res) + '\n'));
        } catch (e: any) {
          log(`❌ Неочікувана помилка: ${e.message}`);
          controller.enqueue(encoder.encode('__ERROR__\n' + JSON.stringify({ error: e.message }) + '\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
