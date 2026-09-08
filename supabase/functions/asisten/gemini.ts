/**
 * Penerjemah Anthropic <-> Gemini.
 *
 * Aplikasi tetap ngomong format Anthropic — 22 alatnya, putaran tool-use-nya,
 * dan semua tesnya nggak berubah sama sekali. Yang nerjemahin cuma file ini,
 * di server. Jadi kalau nanti mau balik ke Anthropic atau pindah lagi,
 * yang disentuh satu tempat.
 */

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

/* Gemini cuma nerima sebagian kecil JSON Schema. Kunci di luar daftar ini
   bikin 400, jadi dibuang — bukan diloloskan dan berharap. */
const SKEMA_BOLEH = ['type', 'description', 'enum', 'items', 'properties', 'required', 'nullable'];

function bersihinSkema(s: any): any {
  if (!s || typeof s !== 'object') return s;
  const out: any = {};
  for (const k of SKEMA_BOLEH) {
    if (!(k in s)) continue;
    if (k === 'properties') {
      out.properties = {};
      for (const p in s.properties) out.properties[p] = bersihinSkema(s.properties[p]);
    } else if (k === 'items') {
      out.items = bersihinSkema(s.items);
    } else {
      out[k] = s[k];
    }
  }
  return out;
}

/** { model, max_tokens, system, tools, messages } -> badan generateContent */
export function keGemini(body: any) {
  const contents: any[] = [];
  const namaAlat = new Map<string, string>();   // id tool_use -> nama, buat functionResponse

  for (const m of body.messages ?? []) {
    const isi = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content ?? '') }];
    const parts: any[] = [];
    for (const b of isi) {
      if (b.type === 'text' && b.text) {
        parts.push({ text: b.text });
      } else if (b.type === 'tool_use') {
        namaAlat.set(b.id, b.name);
        parts.push({ functionCall: { name: b.name, args: b.input ?? {} } });
      } else if (b.type === 'tool_result') {
        // Gemini minta NAMA fungsinya, Anthropic cuma ngasih id — makanya
        // namanya diingat waktu ngelewatin giliran asisten sebelumnya.
        parts.push({
          functionResponse: {
            name: namaAlat.get(b.tool_use_id) ?? 'alat',
            response: { hasil: String(b.content ?? '') },
          },
        });
      }
    }
    if (!parts.length) continue;
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }

  // Gemini 2.5 mikir dulu, dan mikirnya motong jatah keluaran yang sama. 2048
  // sering habis kepakai mikir sampai nggak kebagian buat jawabannya.
  const out: any = { contents, generationConfig: { maxOutputTokens: Math.max(body.max_tokens ?? 2048, 8192) } };
  if (body.system) out.systemInstruction = { parts: [{ text: String(body.system) }] };
  if (body.tools?.length) {
    out.tools = [{
      functionDeclarations: body.tools.map((t: any) => ({
        name: t.name,
        description: t.description,
        parameters: bersihinSkema(t.input_schema),
      })),
    }];
  }
  return out;
}

/** jawaban generateContent -> bentuk respons Anthropic yang dimengerti aplikasi */
export function dariGemini(g: any, model: string) {
  const cand = (g.candidates ?? [])[0] ?? {};
  const parts = cand.content?.parts ?? [];
  const content: any[] = [];
  let n = 0;

  for (const p of parts) {
    if (typeof p.text === 'string' && p.text) {
      content.push({ type: 'text', text: p.text });
    } else if (p.functionCall) {
      // Gemini nggak ngasih id panggilan; aplikasi butuh id buat mencocokkan hasil
      content.push({
        type: 'tool_use',
        id: `call_${++n}_${Date.now().toString(36)}`,
        name: p.functionCall.name,
        input: p.functionCall.args ?? {},
      });
    }
  }

  const pakaiAlat = content.some((c) => c.type === 'tool_use');
  const u = g.usageMetadata ?? {};
  return {
    id: 'msg_' + (g.responseId ?? Date.now().toString(36)),
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: pakaiAlat ? 'tool_use' : cand.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    usage: { input_tokens: u.promptTokenCount ?? 0, output_tokens: u.candidatesTokenCount ?? 0 },
  };
}

/** daftar model Gemini -> bentuk GET /v1/models punya Anthropic */
export function daftarModel(g: any) {
  const model = (g.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => String(m.name ?? '').replace(/^models\//, ''))
    .filter(Boolean)
    // flash duluan: paling murah dan paling longgar kuotanya, dan aplikasi
    // milih otomatis yang cocok sama /sonnet|flash/
    .sort((a: string, b: string) => (b.includes('flash') ? 1 : 0) - (a.includes('flash') ? 1 : 0));
  return { data: model.map((id: string) => ({ id, type: 'model', display_name: id })) };
}

/** satu pintu: jalur ala Anthropic masuk, hasil ala Anthropic keluar */
export async function panggilGemini(jalur: string, metode: string, body: any, kunci: string) {
  const kepala = { 'x-goog-api-key': kunci, 'content-type': 'application/json' };

  if (jalur.startsWith('/v1/models')) {
    const r = await fetch(`${GEMINI}/models`, { headers: kepala });
    const d = await r.json();
    if (!r.ok) return { status: r.status, data: { error: { message: d?.error?.message ?? 'Gagal ambil daftar model.' } } };
    return { status: 200, data: daftarModel(d) };
  }

  const model = String(body?.model ?? 'gemini-2.5-flash');
  const muatan = keGemini(body);
  const r = await fetch(`${GEMINI}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: kepala,
    body: JSON.stringify(muatan),
  });
  const d = await r.json();
  if (!r.ok) {
    // Model dan status ikut disebut. Tanpa ini, galat dari Gemini nyampe aplikasi
    // tanpa konteks dan kelihatan kayak masalah lain.
    const pesan = d?.error?.message ?? `HTTP ${r.status}`;
    console.error('gemini tolak', r.status, model, pesan);
    return { status: r.status, data: { error: {
      message: `Gemini nolak (${r.status}, model ${model}): ${pesan}`,
    } } };
  }

  const hasil = dariGemini(d, model);
  // Model 2.5 itu mikir dulu sebelum jawab, dan mikirnya makan jatah keluaran.
  // Kalau jatahnya keburu habis, parts-nya balik kosong — dan giliran kosong bikin
  // putaran alat berhenti tanpa penjelasan. Lebih baik bilang apa adanya.
  if (!hasil.content.length) {
    const alasan = (d?.candidates?.[0]?.finishReason) ?? 'tanpa alasan';
    console.error('gemini balik kosong', model, alasan, JSON.stringify(d?.usageMetadata ?? {}));
    return { status: 502, data: { error: {
      message: `Gemini balik kosong (${alasan}). Coba naikin batas keluaran atau ganti model.`,
    } } };
  }
  return { status: 200, data: hasil };
}
