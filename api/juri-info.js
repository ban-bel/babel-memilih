import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase Environment Variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: jpData, error } = await supabase
      .from('juri_periode')
      .select('pegawai_id, is_can_vote_own_region, blocked_nominee_ids')
      .eq('token_akses', token)
      .single();

    if (error || !jpData) {
      return res.status(404).json({ message: 'Juri not found' });
    }

    const { data: pgData } = await supabase
      .from('pegawai')
      .select('wilayah_id')
      .eq('id', jpData.pegawai_id)
      .single();

    return res.status(200).json({
      pegawai_id: jpData.pegawai_id,
      is_can_vote_own_region: jpData.is_can_vote_own_region,
      blocked_nominee_ids: jpData.blocked_nominee_ids,
      wilayah_id: pgData?.wilayah_id
    });
  } catch (error) {
    console.error('Error fetching Juri info:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
