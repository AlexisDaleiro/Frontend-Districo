export function operationTimeout(path: string, multipart = false) {
  const route = path.split("?")[0];
  return multipart || /^(admin\/bulk\/|admin\/orders\/[^/]+\/returns(?:\/preview)?$)/.test(route) ||
    /^(admin\/(orders|sales)\/export|orders\/me\/invoices\/[^/]+\/pdf)$/.test(route) ||
    /^admin\/(orders|applications|customers|jobs)\/.+\/(invoices|credit-notes|documents|cv)(\/|$)/.test(route)
    ? 90000 : 20000;
}

export const browserOperationTimeout = (path: string, multipart = false) => operationTimeout(path, multipart) + 5000;
