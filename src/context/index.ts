import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, parse, lastDayOfMonth } from 'https://esm.sh/date-fns@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      throw new Error('Token de compartilhamento não fornecido.');
    }

    // Crie um cliente Supabase com a role de serviço para ignorar a RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Encontre o link compartilhado pelo token
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('shared_links')
      .select('*')
      .eq('token', token)
      .single();

    if (linkError || !linkData) {
      throw new Error('Link de compartilhamento inválido ou expirado.');
    }

    // 2. Busque os dados do relatório com base nas informações do link
    if (linkData.item_type === 'report') {
      const monthDate = parse(linkData.item_id, 'yyyy-MM', new Date());
      const startDate = `${linkData.item_id}-01`;
      const endDate = format(lastDayOfMonth(monthDate), 'yyyy-MM-dd');

      const { data: transactions, error: transError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', linkData.user_id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (transError) throw transError;

      return new Response(JSON.stringify({ transactions, month: linkData.item_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Tipo de compartilhamento não suportado.');

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});