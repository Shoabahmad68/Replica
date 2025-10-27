// src/context/DataContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import config from "../config";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // ✅ पहले localStorage cache चेक करो
        const cached = localStorage.getItem("uploadedExcelData");
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          console.log("⚡ Loaded from local cache");
          return;
        }

        const backendURL =
          window.location.hostname.includes("localhost") ||
          window.location.hostname.includes("127.0.0.1")
            ? "http://127.0.0.1:8787"
            : config.BACKEND_URL ||
              "https://replica-backend.shoabahmad68.workers.dev";

        console.log("📡 Fetching from backend...");
        const res = await fetch(`${backendURL}/api/imports/latest`);
        const json = await res.json();

        // ✅ Decompress helper
        async function decompressBase64(b64) {
          const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const ds = new DecompressionStream("gzip");
          const ab = await new Response(
            new Blob([binary]).stream().pipeThrough(ds)
          ).arrayBuffer();
          return new TextDecoder().decode(ab);
        }

        // ✅ XML Parser
        function parseXML(xml) {
          if (!xml || !xml.includes("<VOUCHER")) return [];
          const vouchers = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
          const rows = [];
          for (const v of vouchers) {
            const getTag = (t) => {
              const m = v.match(
                new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i")
              );
              return m ? m[1].trim() : "";
            };
            rows.push({
              "Voucher Type": getTag("VOUCHERTYPENAME"),
              Date: getTag("DATE"),
              Party: getTag("PARTYNAME"),
              Item: getTag("STOCKITEMNAME"),
              Qty: getTag("BILLEDQTY"),
              Amount: getTag("AMOUNT"),
              Salesman: getTag("BASICSALESNAME"),
            });
          }
          return rows;
        }

        // ✅ Decode if compressed
        if (
          json?.compressed &&
          (json.salesXml || json.purchaseXml || json.mastersXml)
        ) {
          const salesXml = json.salesXml
            ? await decompressBase64(json.salesXml)
            : "";
          const purchaseXml = json.purchaseXml
            ? await decompressBase64(json.purchaseXml)
            : "";
          const mastersXml = json.mastersXml
            ? await decompressBase64(json.mastersXml)
            : "";

          const parsed = [
            ...parseXML(salesXml),
            ...parseXML(purchaseXml),
            ...parseXML(mastersXml),
          ];

          if (parsed.length) {
            setData(parsed);
            localStorage.setItem("uploadedExcelData", JSON.stringify(parsed));
          }
        } else {
          const possibleData =
            json?.rows || json?.data?.rows || json?.data || [];
          setData(possibleData);
          localStorage.setItem("uploadedExcelData", JSON.stringify(possibleData));
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Data load error:", err);
        const saved = localStorage.getItem("uploadedExcelData");
        if (saved) setData(JSON.parse(saved));
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ data, setData, loading }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
