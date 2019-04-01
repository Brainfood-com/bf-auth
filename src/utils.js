
export function baseUrl(req) {
  const {
    headers: {
      'x-forwarded-proto': xProto,
      'x-forwarded-host': xHost,
      'host': host,
    },
    baseUrl,
  } = req
  return `${xProto}://${xHost || host}${baseUrl}`
}
