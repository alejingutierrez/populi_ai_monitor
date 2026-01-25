const allowCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

const parseSingle = (value) => {
  if (Array.isArray(value)) return value[0]
  return value
}

export default function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const id = parseSingle(req.query?.id)
  if (!id) {
    res.status(400).json({ error: 'Missing alert id' })
    return
  }

  const action = req.body?.action ?? 'ack'
  res.status(200).json({ status: 'ok', id, action })
}
