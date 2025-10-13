import localforage from "localforage";

localforage.config({
  name: "rap_app",
  storeName: "rap_store",
  description: "Report Analysis Program frontend storage"
});

const KEY = "excelData_v1";

export async function saveExcelData(rows, meta = {}) {
  const payload = { rows, meta, savedAt: new Date().toISOString() };
  await localforage.setItem(KEY, payload);
  return payload;
}

export async function getExcelData() {
  const res = await localforage.getItem(KEY);
  return res || { rows: [], meta: {} };
}

export async function clearExcelData() {
  await localforage.removeItem(KEY);
  return { rows: [], meta: {} };
}
