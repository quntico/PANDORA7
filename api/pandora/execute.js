import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configuración de Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // --- PRUEBA BINARIA DE IDENTIFICACIÓN ---
  return res.json({
    success: true,
    output: {
      text: "TEST_BACKEND_OK_12345",
      summary: "Diagnóstico activo (Serverless)."
    }
  });
}

  try {
    // 1. MEMORIA: Guardar prompt
    if (projectId && projectId !== 'local-fallback-id') {
       await supabase.from('project_logs_beta').insert({
         project_id: projectId,
         action: prompt,
         source: 'user',
         result: 'PROMPT'
       });
    }

    // 2. RECUPERAR CONTEXTO E HISTORIAL
    let projectContext = "--- PANDORA SYSTEM ---";
    let messageHistory = [];

    if (projectId && projectId !== 'local-fallback-id') {
      const { data: logs } = await supabase
        .from('project_logs_beta')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (logs) {
        messageHistory = logs.reverse().map(l => ({
          role: l.source === 'user' ? 'user' : 'assistant',
          content: l.action
        }));
      }

      const [proj, dec, tasks] = await Promise.all([
        supabase.from('projects_beta').select('*').eq('id', projectId).single(),
        supabase.from('project_decisions_beta').select('title, impact').eq('project_id', projectId).limit(5),
        supabase.from('project_tasks_beta').select('title, status').eq('project_id', projectId).eq('status', 'pending').limit(5)
      ]);

      if (proj.data) {
        projectContext += `\nPROYECTO: ${proj.data.name}. DESCRIPCIÓN: ${proj.data.description}`;
        if (dec.data?.length) projectContext += `\nDECISIONES RECIENTES: ${dec.data.map(d => d.title).join(', ')}`;
        if (tasks.data?.length) projectContext += `\nTAREAS PENDIENTES: ${tasks.data.map(t => t.title).join(', ')}`;
      }
    }

    // 3. EJECUCIÓN (INTELIGENTE)
    let gptResponse;

    if (needsWeb) {
      // Usar Responses API (si está habilitada en la cuenta de Vercel)
      const response = await openai.responses.create({
        model: "gpt-4o", 
        tools: [{ type: "web_search" }],
        input: `SISTEMA: ${projectContext}\nHISTORIAL: ${JSON.stringify(messageHistory)}\nUSUARIO: ${prompt}\nResponde en ESPAÑOL y devuelve JSON {text, summary, table, artifactCandidates}.`
      });

      const rawText = response.output_text || "";
      try {
        gptResponse = JSON.parse(rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1));
      } catch (e) {
        gptResponse = { text: rawText, summary: "Respuesta con búsqueda web.", table: null, artifactCandidates: [] };
      }
    } else {
      const messages = [
        { role: "system", content: `Eres PANDORA BETA. ${projectContext}. Responde en ESPAÑOL. Devuelve JSON {text, summary, table, artifactCandidates}.` },
        ...messageHistory,
        { role: "user", content: prompt }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" }
      });
      gptResponse = JSON.parse(completion.choices[0].message.content);
    }

    // 4. MEMORIA: Guardar respuesta
    if (projectId && projectId !== 'local-fallback-id') {
      await supabase.from('project_logs_beta').insert({
        project_id: projectId,
        action: gptResponse.text,
        source: 'assistant',
        result: gptResponse.summary
      });
    }

    // 5. RESPUESTA FINAL
    return res.status(200).json({
      success: true,
      output: {
        ...gptResponse,
        _metadata: { webSearchUsed: needsWeb, historySize: messageHistory.length, ver: "7.70" }
      }
    });

  } catch (error) {
    console.error('PANDORA_EXECUTE_ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Error en la ejecución del protocolo PANDORA.',
      message: error.message
    });
  }
}
