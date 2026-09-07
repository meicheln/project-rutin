/**
 * Penerjemah Anthropic <-> Gemini di Edge Function.
 * Nggak butuh browser: ini fungsi murni, diuji langsung.
 * Yang dijaga: bentuk yang dikirim ke Gemini, dan bentuk yang balik ke aplikasi —
 * karena aplikasi + 22 alatnya tetap ngomong format Anthropic.
 */
import { keGemini, dariGemini, daftarModel } from '../supabase/functions/asisten/gemini.ts';

export const nama = 'Gemini — penerjemah format di Edge Function';

export async function jalan(t) {
  // ---------- permintaan: Anthropic -> Gemini ----------
  const permintaan = {
    model: 'gemini-2.5-flash',
    max_tokens: 2048,
    system: 'Kamu asisten di aplikasi Rutin.',
    tools: [{
      name: 'catat_transaksi',
      description: 'Catat uang masuk atau keluar.',
      input_schema: {
        type: 'object',
        additionalProperties: false,          // Gemini nolak kunci ini
        $schema: 'http://json-schema.org/draft-07/schema#',
        properties: {
          tipe: { type: 'string', enum: ['masuk', 'keluar'] },
          jumlah: { type: 'number', description: 'Rupiah' },
          tag: { type: 'array', items: { type: 'string', pattern: '^x' } },
        },
        required: ['tipe', 'jumlah'],
      },
    }],
    messages: [
      { role: 'user', content: 'tadi jajan 25rb' },
      { role: 'assistant', content: [
        { type: 'text', text: 'Oke, gua catat.' },
        { type: 'tool_use', id: 'toolu_abc', name: 'catat_transaksi', input: { tipe: 'keluar', jumlah: 25000 } },
      ]},
      { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'toolu_abc', content: 'Tercatat pengeluaran Rp25.000.' },
      ]},
    ],
  };

  const g = keGemini(permintaan);

  t.eq(g.systemInstruction.parts[0].text, 'Kamu asisten di aplikasi Rutin.', 'prompt sistem pindah ke systemInstruction');
  t.eq(g.generationConfig.maxOutputTokens, 2048, 'max_tokens jadi maxOutputTokens');
  t.eq(g.contents.map(c => c.role), ['user', 'model', 'user'], 'peran assistant diterjemahin jadi model');
  t.eq(g.contents[0].parts, [{ text: 'tadi jajan 25rb' }], 'pesan teks biasa jadi satu part teks');
  t.eq(g.contents[1].parts[1].functionCall, { name: 'catat_transaksi', args: { tipe: 'keluar', jumlah: 25000 } },
    'tool_use jadi functionCall');

  // ini yang paling gampang salah: Gemini minta NAMA fungsi, Anthropic cuma ngasih id
  t.eq(g.contents[2].parts[0].functionResponse.name, 'catat_transaksi',
    'tool_result nemu nama fungsinya dari id yang dicatat di giliran sebelumnya');
  t.ok(/Rp25.000/.test(g.contents[2].parts[0].functionResponse.response.hasil), 'isi hasil alat ikut kekirim');

  // skema harus dibersihin, bukan diloloskan dan berharap
  const par = g.tools[0].functionDeclarations[0].parameters;
  t.ok(!('additionalProperties' in par), 'additionalProperties dibuang — Gemini nolak kunci itu');
  t.ok(!('$schema' in par), '$schema dibuang');
  t.eq(par.required, ['tipe', 'jumlah'], 'required tetap dipertahanin');
  t.eq(par.properties.tipe.enum, ['masuk', 'keluar'], 'enum tetap dipertahanin');
  t.ok(!('pattern' in par.properties.tag.items), 'kunci tak dikenal di dalam items ikut dibersihin');
  t.eq(par.properties.tag.items.type, 'string', 'isi items yang sah tetap utuh');

  // pesan tanpa isi jangan bikin giliran kosong — Gemini nolak parts kosong
  const kosong = keGemini({ messages: [{ role: 'user', content: [] }, { role: 'user', content: 'halo' }] });
  t.eq(kosong.contents.length, 1, 'pesan tanpa isi dibuang, bukan dikirim sebagai giliran kosong');

  // ---------- jawaban: Gemini -> Anthropic ----------
  const jwb = dariGemini({
    candidates: [{
      finishReason: 'STOP',
      content: { parts: [
        { text: 'Siap, dicatat.' },
        { functionCall: { name: 'catat_transaksi', args: { tipe: 'keluar', jumlah: 25000 } } },
      ]},
    }],
    usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 40 },
  }, 'gemini-2.5-flash');

  t.eq(jwb.stop_reason, 'tool_use', 'ada functionCall -> stop_reason tool_use, biar putaran alat lanjut');
  t.eq(jwb.content[0], { type: 'text', text: 'Siap, dicatat.' }, 'teks jadi blok text');
  t.eq(jwb.content[1].name, 'catat_transaksi', 'functionCall jadi blok tool_use');
  t.eq(jwb.content[1].input, { tipe: 'keluar', jumlah: 25000 }, 'args jadi input');
  t.ok(!!jwb.content[1].id, 'id panggilan dibikinin — Gemini nggak ngasih, aplikasi butuh buat mencocokkan hasil');
  t.eq(jwb.usage, { input_tokens: 1200, output_tokens: 40 }, 'pemakaian token ikut diterjemahin');
  t.eq(jwb.role, 'assistant', 'peran balik jadi assistant buat aplikasi');

  const biasa = dariGemini({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Halo.' }] } }] }, 'x');
  t.eq(biasa.stop_reason, 'end_turn', 'tanpa panggilan alat -> end_turn, putaran berhenti');

  const putus = dariGemini({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Ha' }] } }] }, 'x');
  t.eq(putus.stop_reason, 'max_tokens', 'jawaban kepotong dilaporin apa adanya');

  const nihil = dariGemini({}, 'x');
  t.eq(nihil.content, [], 'jawaban kosong nggak bikin galat');

  // dua panggilan alat sekaligus harus dapat id yang beda
  const ganda = dariGemini({ candidates: [{ content: { parts: [
    { functionCall: { name: 'a', args: {} } },
    { functionCall: { name: 'b', args: {} } },
  ]}}]}, 'x');
  t.ok(ganda.content[0].id !== ganda.content[1].id, 'panggilan alat berbarengan dapat id yang beda');

  // ---------- daftar model ----------
  const dm = daftarModel({ models: [
    { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
  ]});
  t.eq(dm.data.map(m => m.id), ['gemini-2.5-flash', 'gemini-2.5-pro'],
    'model embedding disaring, flash ditaruh duluan biar kepilih otomatis');
}
