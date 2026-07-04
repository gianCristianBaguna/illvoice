import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import express from 'express';

const router = Router();

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { base64, mimeType, fileName, bucket = 'media', path } = req.body ?? {};

    if (!base64 || !fileName) {
      return res.status(400).json({ error: 'base64 and fileName are required' });
    }

    const cleanMime = typeof mimeType === 'string' ? mimeType : 'application/octet-stream';
    const targetBucket = typeof bucket === 'string' ? bucket : 'media';

    const storagePath = path
      ? `${path}/${fileName}`
      : `reports/${fileName}`;

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(targetBucket)
      .upload(storagePath, base64, {
        contentType: cleanMime,
        upsert: false,
      });

    if (error) {
      console.error('Supabase backend upload error:', error);
      return res.status(400).json({ error: 'Upload failed', details: error.message });
    }

    const { data: publicUrlData } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(storagePath);

    return res.status(200).json({ publicUrl: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error('Upload endpoint error:', err);
    return res.status(500).json({ error: 'Internal upload error' });
  }
});

export default router;
