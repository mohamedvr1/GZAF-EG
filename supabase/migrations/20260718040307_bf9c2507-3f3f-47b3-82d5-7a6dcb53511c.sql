CREATE POLICY "garment-ai own read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'garment-ai' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "garment-ai own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'garment-ai' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "garment-ai own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'garment-ai' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "garment-ai admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'garment-ai' AND public.has_role(auth.uid(), 'admin'));