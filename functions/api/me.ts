import { getIdentity, json } from '../_lib/auth';

export const onRequestGet: PagesFunction = async ({ request }) => {
  const id = getIdentity(request);
  if (!id) return json({ error: 'Unauthorized' }, 401);
  return json({ email: id.email, dev: id.dev });
};
